import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import {
  GetFutureFundSummaryQueryParams,
  GetFutureFundSummaryResponse,
  SimulateFutureFundInvestmentBody,
  SimulateFutureFundInvestmentResponse,
} from "@workspace/api-zod";
import { connectMongo } from "../lib/mongo";
import { calculatePreparedContribution } from "../lib/contribution";
import { DecisionModel } from "../models/decision";
import {
  getSaveWiseScope,
  getSaveWiseScopeFilter,
  type SaveWiseScope,
} from "../lib/savewise-scope";

const router: IRouter = Router();
const ANNUAL_RETURN_RATE = 0.05;
const PROJECTION_YEARS = [1, 3, 5, 10] as const;

function roundKwd(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 1000) / 1000;
}

async function getFundSummary(scope: SaveWiseScope) {
  const records = await DecisionModel.find({
    ...getSaveWiseScopeFilter(scope),
    decision: "skip",
    status: "completed",
    simulatedContributionAt: { $type: "date" },
  })
    .sort({ simulatedContributionAt: -1 })
    .exec();

  const contributions = records.map((record) => ({
    decisionId: record._id.toString(),
    itemName: record.itemName,
    amount: record.preparedContribution,
    contributedAt: record.simulatedContributionAt!.toISOString(),
  }));
  const totalContributed = roundKwd(
    contributions.reduce((sum, contribution) => sum + contribution.amount, 0),
  );

  return {
    simulationOnly: true,
    annualReturnRate: ANNUAL_RETURN_RATE,
    totalContributed,
    contributionCount: contributions.length,
    contributions,
    projections: PROJECTION_YEARS.map((years) => {
      const projectedValue = roundKwd(
        totalContributed * (1 + ANNUAL_RETURN_RATE) ** years,
      );
      return {
        years,
        projectedValue,
        projectedGrowth: roundKwd(projectedValue - totalContributed),
      };
    }),
  };
}

router.get("/future-fund", async (req, res): Promise<void> => {
  if (typeof req.query.sessionId !== "string") {
    res.status(400).json({ error: "sessionId is required." });
    return;
  }
  const query = GetFutureFundSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  try {
    await connectMongo();
    const scope = getSaveWiseScope(req, query.data.sessionId);
    const summary = await getFundSummary(scope);
    res.json(GetFutureFundSummaryResponse.parse(summary));
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not load SaveWise Future Fund",
    );
    res.status(503).json({ error: "Future Fund is temporarily unavailable." });
  }
});

router.post("/future-fund/invest", async (req, res): Promise<void> => {
  const body = SimulateFutureFundInvestmentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (!mongoose.isValidObjectId(body.data.decisionId)) {
    res.status(404).json({ error: "Skipped decision not found." });
    return;
  }

  try {
    await connectMongo();
    const scope = getSaveWiseScope(req, body.data.sessionId);
    const filter = {
      _id: body.data.decisionId,
      ...getSaveWiseScopeFilter(scope),
    };
    const existing = await DecisionModel.findOne(filter);
    if (!existing) {
      res.status(404).json({ error: "Skipped decision not found." });
      return;
    }
    if (
      existing.decision !== "skip" ||
      existing.status !== "completed" ||
      existing.preparedContribution <= 0
    ) {
      res.status(409).json({ error: "This decision has no prepared contribution." });
      return;
    }

    if (existing.simulatedContributionAt) {
      const summary = await getFundSummary(scope);
      res.json(SimulateFutureFundInvestmentResponse.parse(summary));
      return;
    }

    const contributionUpdate = body.data.contributionPercent === undefined
      ? {}
      : {
          preparedContribution: calculatePreparedContribution(
            existing.price,
            body.data.contributionPercent,
          ),
        };
    const updated = await DecisionModel.findOneAndUpdate(
      { ...filter, simulatedContributionAt: null },
      { $set: { simulatedContributionAt: new Date(), ...contributionUpdate } },
      { returnDocument: "after" },
    );

    if (!updated) {
      const current = await DecisionModel.findOne(filter);
      if (!current?.simulatedContributionAt) {
        res.status(409).json({ error: "This contribution could not be approved." });
        return;
      }
      const summary = await getFundSummary(scope);
      res.json(SimulateFutureFundInvestmentResponse.parse(summary));
      return;
    }

    const summary = await getFundSummary(scope);
    res.status(201).json(SimulateFutureFundInvestmentResponse.parse(summary));
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not add simulated SaveWise contribution",
    );
    res.status(503).json({ error: "Your simulated contribution could not be saved." });
  }
});

export default router;
