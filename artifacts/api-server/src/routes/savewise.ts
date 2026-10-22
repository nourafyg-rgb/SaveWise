import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import {
  CreateDecisionBody,
  CreateDecisionResponse,
  ListDecisionsQueryParams,
  ListDecisionsResponse,
  ResolveWaitingDecisionBody,
  ResolveWaitingDecisionParams,
  ResolveWaitingDecisionQueryParams,
  ResolveWaitingDecisionResponse,
  SearchCatalogItemsQueryParams,
  SearchCatalogItemsResponse,
} from "@workspace/api-zod";
import { connectMongo } from "../lib/mongo";
import { demoCatalog } from "../lib/demo-catalog";
import { calculatePreparedContribution } from "../lib/contribution";
import { getSaveWiseScope, getSaveWiseScopeFilter } from "../lib/savewise-scope";
import {
  DecisionModel,
  type DecisionAction,
  type DecisionRecord,
  type WaitingPeriod,
} from "../models/decision";

const router: IRouter = Router();

function asResponse(
  record: DecisionRecord & { _id: mongoose.Types.ObjectId },
) {
  return {
    id: record._id.toString(),
    itemId: record.itemId,
    itemName: record.itemName,
    price: record.price,
    decision: record.decision,
    status: record.status,
    waitingPeriod: record.waitingPeriod,
    waitUntil: record.waitUntil,
    savedAmount: record.savedAmount,
    preparedContribution: record.preparedContribution,
    simulatedContributionAt: record.simulatedContributionAt ?? null,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
  };
}

function getWaitDetails(decision: DecisionAction, from = new Date()): {
  waitingPeriod: WaitingPeriod;
  waitUntil: Date | null;
} {
  if (decision === "wait_24h") {
    return {
      waitingPeriod: "24h",
      waitUntil: new Date(from.getTime() + 24 * 60 * 60 * 1000),
    };
  }
  if (decision === "wait_7_days") {
    return {
      waitingPeriod: "7d",
      waitUntil: new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000),
    };
  }
  return { waitingPeriod: null, waitUntil: null };
}

function isWait(decision: DecisionAction): boolean {
  return decision === "wait_24h" || decision === "wait_7_days";
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function matchesDecisionRequest(
  record: DecisionRecord,
  request: {
    itemId: string;
    decision: DecisionAction;
    preparedContribution: number;
  },
): boolean {
  return (
    record.itemId === request.itemId &&
    record.decision === request.decision &&
    record.preparedContribution === request.preparedContribution
  );
}

function skipAmounts(
  decision: DecisionAction,
  price: number,
  contributionPercent = 10,
) {
  if (decision !== "skip") {
    return { savedAmount: 0, preparedContribution: 0 };
  }
  return {
    savedAmount: price,
    preparedContribution: calculatePreparedContribution(price, contributionPercent),
  };
}

router.get("/catalog/items", (req, res) => {
  const query = SearchCatalogItemsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const normalized = query.data.q?.trim().toLocaleLowerCase();
  const results = normalized
    ? demoCatalog.filter(
        (item) =>
          item.name.toLocaleLowerCase().includes(normalized) ||
          item.category.toLocaleLowerCase().includes(normalized) ||
          item.alternativeName?.toLocaleLowerCase().includes(normalized),
      )
    : demoCatalog;

  res.json(SearchCatalogItemsResponse.parse(results));
});

router.get("/decisions", async (req, res): Promise<void> => {
  if (typeof req.query.sessionId !== "string") {
    res.status(400).json({ error: "sessionId is required." });
    return;
  }
  const query = ListDecisionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  try {
    await connectMongo();
    const scope = getSaveWiseScope(req, query.data.sessionId);
    const records = await DecisionModel.find(getSaveWiseScopeFilter(scope))
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(
      ListDecisionsResponse.parse(
        records.map((record) =>
          asResponse(record as DecisionRecord & { _id: mongoose.Types.ObjectId }),
        ),
      ),
    );
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not load SaveWise decisions",
    );
    res.status(503).json({ error: "Decision history is temporarily unavailable." });
  }
});

router.post("/decisions", async (req, res): Promise<void> => {
  const body = CreateDecisionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const item = demoCatalog.find((candidate) => candidate.id === body.data.itemId);
  if (!item) {
    res.status(404).json({ error: "That demo item could not be found." });
    return;
  }

  const now = new Date();
  const waitDetails = getWaitDetails(body.data.decision, now);
  const amounts = skipAmounts(
    body.data.decision,
    item.price,
    body.data.contributionPercent,
  );

  try {
    await connectMongo();
    await DecisionModel.init();

    const scope = getSaveWiseScope(req, body.data.sessionId);
    const requestId = body.data.requestId;
    const request = {
      itemId: item.id,
      decision: body.data.decision,
      preparedContribution: amounts.preparedContribution,
    };
    if (requestId) {
      const existing = await DecisionModel.findOne({
        ...getSaveWiseScopeFilter(scope),
        clientRequestId: requestId,
      });
      if (existing) {
        if (!matchesDecisionRequest(existing, request)) {
          res.status(409).json({
            error: "This request key was already used for a different decision.",
          });
          return;
        }
        res
          .status(200)
          .json(CreateDecisionResponse.parse(asResponse(existing.toObject())));
        return;
      }
    }

    let record;
    try {
      record = await DecisionModel.create({
        ...scope,
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        decision: body.data.decision,
        status: isWait(body.data.decision) ? "waiting" : "completed",
        ...waitDetails,
        ...amounts,
        ...(requestId ? { clientRequestId: requestId } : {}),
        wasWaiting: false,
        completedAt: isWait(body.data.decision) ? null : now,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error) || !requestId) {
        throw error;
      }
      const existing = await DecisionModel.findOne({
        ...getSaveWiseScopeFilter(scope),
        clientRequestId: requestId,
      });
      if (!existing) {
        throw error;
      }
      if (!matchesDecisionRequest(existing, request)) {
        res.status(409).json({
          error: "This request key was already used for a different decision.",
        });
        return;
      }
      res
        .status(200)
        .json(CreateDecisionResponse.parse(asResponse(existing.toObject())));
      return;
    }

    res
      .status(201)
      .json(CreateDecisionResponse.parse(asResponse(record.toObject())));
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not save SaveWise decision",
    );
    res.status(503).json({ error: "Your decision could not be saved right now." });
  }
});

router.post(
  "/decisions/:id/complete",
  async (req, res): Promise<void> => {
    if (typeof req.query.sessionId !== "string") {
      res.status(400).json({ error: "sessionId is required." });
      return;
    }
    const params = ResolveWaitingDecisionParams.safeParse(req.params);
    const query = ResolveWaitingDecisionQueryParams.safeParse(req.query);
    const body = ResolveWaitingDecisionBody.safeParse(req.body);
    if (!params.success || !query.success || !body.success) {
      const message =
        (!params.success && params.error.message) ||
        (!query.success && query.error.message) ||
        (!body.success && body.error.message) ||
        "Invalid request.";
      res.status(400).json({ error: message });
      return;
    }
    if (!mongoose.isValidObjectId(params.data.id)) {
      res.status(404).json({ error: "Waiting decision not found." });
      return;
    }

    try {
      await connectMongo();
      const scope = getSaveWiseScope(req, query.data.sessionId);
      const record = await DecisionModel.findOne({
        _id: params.data.id,
        ...getSaveWiseScopeFilter(scope),
        status: "waiting",
      });
      if (!record) {
        res.status(404).json({ error: "Waiting decision not found." });
        return;
      }
      if (record.waitUntil && record.waitUntil.getTime() > Date.now()) {
        res.status(409).json({ error: "The waiting period has not ended yet." });
        return;
      }

      const now = new Date();
      record.wasWaiting = true;
      record.decision = body.data.decision;
      record.status = isWait(body.data.decision) ? "waiting" : "completed";
      const waitDetails = getWaitDetails(body.data.decision, now);
      record.waitingPeriod = waitDetails.waitingPeriod;
      record.waitUntil = waitDetails.waitUntil;
      const amounts = skipAmounts(
        body.data.decision,
        record.price,
        body.data.contributionPercent,
      );
      record.savedAmount = amounts.savedAmount;
      record.preparedContribution = amounts.preparedContribution;
      record.completedAt = isWait(body.data.decision) ? null : now;
      await record.save();

      res.json(ResolveWaitingDecisionResponse.parse(asResponse(record)));
    } catch (error) {
      req.log.error(
        { errorName: error instanceof Error ? error.name : "UnknownError" },
        "Could not resolve SaveWise waiting decision",
      );
      res.status(503).json({ error: "That decision could not be updated right now." });
    }
  },
);

export default router;
