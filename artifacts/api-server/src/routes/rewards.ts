import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import {
  AddSavingsGoalContributionBody,
  AddSavingsGoalContributionParams,
  AddSavingsGoalContributionResponse,
  CreateSavingsGoalBody,
  CreateSavingsGoalResponse,
  DeleteSavingsGoalParams,
  DeleteSavingsGoalQueryParams,
  GetRewardsSummaryQueryParams,
  GetRewardsSummaryResponse,
  ListSavingsGoalsQueryParams,
  ListSavingsGoalsResponse,
  UpdateSavingsGoalBody,
  UpdateSavingsGoalParams,
  UpdateSavingsGoalResponse,
} from "@workspace/api-zod";
import { connectMongo } from "../lib/mongo";
import {
  fromKwdMills,
  getStreakSummary,
  hasAtMostThreeDecimals,
  normalizeTimeZone,
  roundKwd,
  toKwdMills,
} from "../lib/reward-calculations";
import { DecisionModel } from "../models/decision";
import {
  SavingsGoalModel,
  type SavingsGoalRecord,
} from "../models/savings-goal";
import { getSaveWiseScope, getSaveWiseScopeFilter } from "../lib/savewise-scope";

const router: IRouter = Router();
const SKIP_POINTS = 10;
const WAITED_SKIP_POINTS = 15;
const GOAL_COMPLETION_POINTS = 50;

type SavingsGoalDocument = SavingsGoalRecord & {
  _id: mongoose.Types.ObjectId;
};

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function asGoalResponse(record: SavingsGoalDocument) {
  const targetAmount = roundKwd(record.targetAmount);
  const currentAmount = roundKwd(record.currentAmount);
  const remainingAmount = roundKwd(
    Math.max(0, toKwdMills(targetAmount) - toKwdMills(currentAmount)) / 1000,
  );
  const isComplete = toKwdMills(currentAmount) >= toKwdMills(targetAmount);

  return {
    id: record._id.toString(),
    name: record.name,
    targetAmount,
    currentAmount,
    remainingAmount,
    percentComplete: isComplete
      ? 100
      : Math.round((currentAmount / targetAmount) * 1000) / 10,
    isComplete,
    bonusAwarded: Boolean(record.completionBonusAwardedAt),
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function sameGoalRequest(
  record: SavingsGoalRecord,
  request: { nameKey: string; targetAmount: number },
): boolean {
  return (
    record.nameKey === request.nameKey &&
    toKwdMills(record.targetAmount) === toKwdMills(request.targetAmount)
  );
}

router.get("/rewards", async (req, res): Promise<void> => {
  if (typeof req.query.sessionId !== "string") {
    res.status(400).json({ error: "sessionId is required." });
    return;
  }
  const query = GetRewardsSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const timeZone = normalizeTimeZone(query.data.timeZone);
  if (!timeZone) {
    res.status(400).json({ error: "Choose a valid time zone." });
    return;
  }

  try {
    await connectMongo();
    const scope = getSaveWiseScope(req, query.data.sessionId);
    const decisions = await DecisionModel.find({
      ...getSaveWiseScopeFilter(scope),
      decision: "skip",
      status: "completed",
    })
      .select("price wasWaiting completedAt")
      .lean();
    const goals = await SavingsGoalModel.find({
      ...getSaveWiseScopeFilter(scope),
      completionBonusAwardedAt: { $type: "date" },
    })
      .select("completionBonusAwardedAt")
      .lean();

    const decisionPoints = decisions.reduce(
      (sum, decision) =>
        sum + (decision.wasWaiting ? WAITED_SKIP_POINTS : SKIP_POINTS),
      0,
    );
    const goalBonusPoints = goals.length * GOAL_COMPLETION_POINTS;
    const streak = getStreakSummary(
      decisions.flatMap((decision) =>
        decision.completedAt instanceof Date ? [decision.completedAt] : [],
      ),
      new Date(),
      timeZone,
    );
    const summary = {
      pointsBalance: decisionPoints + goalBonusPoints,
      decisionPoints,
      goalBonusPoints,
      ...streak,
      totalSaved: roundKwd(
        decisions.reduce((sum, decision) => sum + decision.price, 0),
      ),
      skippedPurchases: decisions.length,
    };

    res.json(GetRewardsSummaryResponse.parse(summary));
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not load SaveWise rewards summary",
    );
    res.status(503).json({ error: "Rewards are temporarily unavailable." });
  }
});

router.get("/goals", async (req, res): Promise<void> => {
  if (typeof req.query.sessionId !== "string") {
    res.status(400).json({ error: "sessionId is required." });
    return;
  }
  const query = ListSavingsGoalsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  try {
    await connectMongo();
    const scope = getSaveWiseScope(req, query.data.sessionId);
    const records = await SavingsGoalModel.find({
      ...getSaveWiseScopeFilter(scope),
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();
    const response = records.map((record) =>
      asGoalResponse(record as SavingsGoalDocument),
    );
    res.json(ListSavingsGoalsResponse.parse(response));
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not load SaveWise savings goals",
    );
    res.status(503).json({ error: "Savings goals are temporarily unavailable." });
  }
});

router.post("/goals", async (req, res): Promise<void> => {
  const body = CreateSavingsGoalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const name = body.data.name.trim();
  const targetAmount =
    fromKwdMills(toKwdMills(body.data.targetAmount));
  if (
    name.length === 0 ||
    name.length > 60 ||
    targetAmount <= 0 ||
    !hasAtMostThreeDecimals(body.data.targetAmount)
  ) {
    res.status(400).json({ error: "Enter a goal name and a valid KWD target." });
    return;
  }
  const request = {
    nameKey: name.toLocaleLowerCase(),
    targetAmount,
  };

  try {
    await connectMongo();
    await SavingsGoalModel.init();
    const scope = getSaveWiseScope(req, body.data.sessionId);
    const existingRequest = await SavingsGoalModel.findOne({
      ...getSaveWiseScopeFilter(scope),
      createRequestId: body.data.requestId,
    });
    if (existingRequest) {
      if (!sameGoalRequest(existingRequest, request)) {
        res.status(409).json({
          error: "This request key was already used for a different goal.",
        });
        return;
      }
      res
        .status(200)
        .json(
          CreateSavingsGoalResponse.parse(
            asGoalResponse(existingRequest.toObject() as SavingsGoalDocument),
          ),
        );
      return;
    }

    try {
      const record = await SavingsGoalModel.create({
        ...scope,
        createRequestId: body.data.requestId,
        name,
        nameKey: request.nameKey,
        targetAmount,
        currentAmount: 0,
        contributions: [],
        completedAt: null,
        completionBonusAwardedAt: null,
        deletedAt: null,
      });
      res
        .status(201)
        .json(
          CreateSavingsGoalResponse.parse(
            asGoalResponse(record.toObject() as SavingsGoalDocument),
          ),
        );
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      const replay = await SavingsGoalModel.findOne({
        ...getSaveWiseScopeFilter(scope),
        createRequestId: body.data.requestId,
      });
      if (replay) {
        if (!sameGoalRequest(replay, request)) {
          res.status(409).json({
            error: "This request key was already used for a different goal.",
          });
          return;
        }
        res
          .status(200)
          .json(
            CreateSavingsGoalResponse.parse(
              asGoalResponse(replay.toObject() as SavingsGoalDocument),
            ),
          );
        return;
      }
      res.status(409).json({ error: "A goal with this name already exists." });
    }
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not create SaveWise savings goal",
    );
    res.status(503).json({ error: "Your savings goal could not be saved." });
  }
});

router.patch("/goals/:id", async (req, res): Promise<void> => {
  const params = UpdateSavingsGoalParams.safeParse(req.params);
  const body = UpdateSavingsGoalBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (!mongoose.isValidObjectId(params.data.id)) {
    res.status(404).json({ error: "Savings goal not found." });
    return;
  }
  const name =
    body.data.name === undefined ? undefined : body.data.name.trim();
  if (name !== undefined && (name.length === 0 || name.length > 60)) {
    res.status(400).json({ error: "Goal name cannot be empty." });
    return;
  }
  if (body.data.name === undefined && body.data.targetAmount === undefined) {
    res.status(400).json({ error: "Add a name or target change." });
    return;
  }
  if (
    body.data.targetAmount !== undefined &&
    (!hasAtMostThreeDecimals(body.data.targetAmount) ||
      body.data.targetAmount <= 0)
  ) {
    res.status(400).json({ error: "Enter a positive KWD target with up to 3 decimals." });
    return;
  }

  const scope = getSaveWiseScope(req, body.data.sessionId);

  try {
    await connectMongo();
    const record = await SavingsGoalModel.findOne({
      _id: params.data.id,
      ...getSaveWiseScopeFilter(scope),
      deletedAt: null,
    });
    if (!record) {
      res.status(404).json({ error: "Savings goal not found." });
      return;
    }

    const targetAmount =
      body.data.targetAmount === undefined
        ? record.targetAmount
        : fromKwdMills(toKwdMills(body.data.targetAmount));
    const currentMills = toKwdMills(record.currentAmount);
    const targetMills = toKwdMills(targetAmount);
    if (targetMills < currentMills) {
      res.status(409).json({
        error: "The target cannot be lower than the progress already recorded.",
      });
      return;
    }

    const now = new Date();
    const isComplete = currentMills === targetMills;
    const bonusAwardedNow = isComplete && !record.completionBonusAwardedAt;
    const update = {
      name: name ?? record.name,
      nameKey: name?.toLocaleLowerCase() ?? record.nameKey,
      targetAmount,
      completedAt: isComplete ? record.completedAt ?? now : null,
      completionBonusAwardedAt: bonusAwardedNow
        ? now
        : record.completionBonusAwardedAt,
      updatedAt: now,
    };

    let updated;
    try {
      updated = await SavingsGoalModel.findOneAndUpdate(
        {
          _id: record._id,
          ...getSaveWiseScopeFilter(scope),
          deletedAt: null,
          currentAmount: record.currentAmount,
          targetAmount: record.targetAmount,
          updatedAt: record.updatedAt,
        },
        { $set: update },
        { returnDocument: "after", runValidators: true },
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        res.status(409).json({ error: "A goal with this name already exists." });
        return;
      }
      throw error;
    }

    if (!updated) {
      res.status(409).json({
        error: "This goal changed while you were editing it. Refresh and try again.",
      });
      return;
    }
    res.json(
      UpdateSavingsGoalResponse.parse(
        asGoalResponse(updated.toObject() as SavingsGoalDocument),
      ),
    );
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not update SaveWise savings goal",
    );
    res.status(503).json({ error: "Your savings goal could not be updated." });
  }
});

router.delete("/goals/:id", async (req, res): Promise<void> => {
  if (typeof req.query.sessionId !== "string") {
    res.status(400).json({ error: "sessionId is required." });
    return;
  }
  const params = DeleteSavingsGoalParams.safeParse(req.params);
  const query = DeleteSavingsGoalQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  if (!mongoose.isValidObjectId(params.data.id)) {
    res.status(404).json({ error: "Savings goal not found." });
    return;
  }

  const scope = getSaveWiseScope(req, query.data.sessionId);

  try {
    await connectMongo();
    const result = await SavingsGoalModel.updateOne(
      {
        _id: params.data.id,
        ...getSaveWiseScopeFilter(scope),
        deletedAt: null,
      },
      { $set: { deletedAt: new Date(), updatedAt: new Date() } },
    );
    if (result.modifiedCount === 0) {
      res.status(404).json({ error: "Savings goal not found." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Could not delete SaveWise savings goal",
    );
    res.status(503).json({ error: "Your savings goal could not be deleted." });
  }
});

router.post(
  "/goals/:id/contributions",
  async (req, res): Promise<void> => {
    const params = AddSavingsGoalContributionParams.safeParse(req.params);
    const body = AddSavingsGoalContributionBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    if (!mongoose.isValidObjectId(params.data.id)) {
      res.status(404).json({ error: "Savings goal not found." });
      return;
    }
    if (
      body.data.amount <= 0 ||
      !hasAtMostThreeDecimals(body.data.amount)
    ) {
      res.status(400).json({
        error: "Enter a positive contribution with up to 3 decimals.",
      });
      return;
    }

    const scope = getSaveWiseScope(req, body.data.sessionId);

    try {
      await connectMongo();
      const goal = await SavingsGoalModel.findOne({
        _id: params.data.id,
        ...getSaveWiseScopeFilter(scope),
        deletedAt: null,
      });
      if (!goal) {
        res.status(404).json({ error: "Savings goal not found." });
        return;
      }

      const amountMills = toKwdMills(body.data.amount);
      const priorContribution = goal.contributions.find(
        (contribution) => contribution.requestId === body.data.requestId,
      );
      if (priorContribution) {
        if (toKwdMills(priorContribution.amount) !== amountMills) {
          res.status(409).json({
            error: "This request key was already used for a different contribution.",
          });
          return;
        }
        res
          .status(200)
          .json(
            AddSavingsGoalContributionResponse.parse({
              goal: asGoalResponse(goal.toObject() as SavingsGoalDocument),
              duplicate: true,
              completedNow: false,
              bonusAwardedNow: false,
            }),
          );
        return;
      }

      const currentMills = toKwdMills(goal.currentAmount);
      const targetMills = toKwdMills(goal.targetAmount);
      const newCurrentMills = currentMills + amountMills;
      if (newCurrentMills > targetMills) {
        res.status(409).json({
          error: "That amount is more than this goal's remaining balance.",
        });
        return;
      }

      const now = new Date();
      const completedNow =
        newCurrentMills === targetMills && !goal.completedAt;
      const bonusAwardedNow =
        completedNow && !goal.completionBonusAwardedAt;
      const updated = await SavingsGoalModel.findOneAndUpdate(
        {
          _id: goal._id,
          ...getSaveWiseScopeFilter(scope),
          deletedAt: null,
          currentAmount: goal.currentAmount,
          targetAmount: goal.targetAmount,
          contributions: {
            $not: { $elemMatch: { requestId: body.data.requestId } },
          },
        },
        {
          $set: {
            currentAmount: fromKwdMills(newCurrentMills),
            completedAt: newCurrentMills === targetMills ? now : null,
            completionBonusAwardedAt: bonusAwardedNow
              ? now
              : goal.completionBonusAwardedAt,
            updatedAt: now,
          },
          $push: {
            contributions: {
              requestId: body.data.requestId,
              amount: fromKwdMills(amountMills),
            },
          },
        },
        { returnDocument: "after", runValidators: true },
      );

      if (!updated) {
        const latest = await SavingsGoalModel.findOne({
          _id: params.data.id,
          ...getSaveWiseScopeFilter(scope),
          deletedAt: null,
        });
        if (!latest) {
          res.status(404).json({ error: "Savings goal not found." });
          return;
        }
        const replay = latest.contributions.find(
          (contribution) => contribution.requestId === body.data.requestId,
        );
        if (replay) {
          if (toKwdMills(replay.amount) !== amountMills) {
            res.status(409).json({
              error: "This request key was already used for a different contribution.",
            });
            return;
          }
          res
            .status(200)
            .json(
              AddSavingsGoalContributionResponse.parse({
                goal: asGoalResponse(latest.toObject() as SavingsGoalDocument),
                duplicate: true,
                completedNow: false,
                bonusAwardedNow: false,
              }),
            );
          return;
        }
        res.status(409).json({
          error: "This goal changed while you were contributing. Refresh and try again.",
        });
        return;
      }

      res
        .status(201)
        .json(
          AddSavingsGoalContributionResponse.parse({
            goal: asGoalResponse(updated.toObject() as SavingsGoalDocument),
            duplicate: false,
            completedNow,
            bonusAwardedNow,
          }),
        );
    } catch (error) {
      req.log.error(
        { errorName: error instanceof Error ? error.name : "UnknownError" },
        "Could not save SaveWise goal contribution",
      );
      res.status(503).json({ error: "Your goal progress could not be saved." });
    }
  },
);

export default router;
