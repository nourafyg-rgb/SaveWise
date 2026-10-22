import type {
  CatalogItem,
  Decision,
  RewardsSummary,
  SavingsGoal,
} from '@workspace/api-client-react';

export type SmartRecommendationAction =
  | 'review-purchase'
  | 'view-goals'
  | 'view-future-fund';

export interface SmartRecommendation {
  id: string;
  kind: 'alternative' | 'offer' | 'goal' | 'progress' | 'future-fund' | 'pause' | 'starter';
  title: string;
  message: string;
  why: string;
  action?: {
    label: string;
    target: SmartRecommendationAction;
  };
}

interface SmartRecommendationInput {
  item: CatalogItem | null;
  goals: SavingsGoal[];
  rewards: RewardsSummary | undefined;
  decisions: Decision[];
}

const money = (amount: number) => `${amount.toFixed(3)} KWD`;
const roundKwd = (amount: number) => Math.round((amount + Number.EPSILON) * 1000) / 1000;

const reviewAction = {
  label: 'Review this purchase',
  target: 'review-purchase',
} as const;

export function getSmartRecommendation({
  item,
  goals,
  rewards,
  decisions,
}: SmartRecommendationInput): SmartRecommendation {
  if (item && item.alternativePrice != null && item.alternativePrice < item.price) {
    const difference = roundKwd(item.price - item.alternativePrice);
    return {
      id: `alternative-${item.id}`,
      kind: 'alternative',
      title: 'A lower listed price is available',
      message: `The demo catalog lists ${item.alternativeName ?? 'an alternative'} at ${money(item.alternativePrice)} — ${money(difference)} below ${money(item.price)}.`,
      why: `The demo catalog lists ${item.name} at ${money(item.price)} and its alternative at ${money(item.alternativePrice)}. The difference is calculated from those two listed prices; it is potential savings, not money already saved.`,
      action: reviewAction,
    };
  }

  if (item) {
    const listedOffers = [
      item.discountLabel,
      item.promoCode ? `Promo code ${item.promoCode}` : null,
      item.cashbackPercent != null ? `${item.cashbackPercent}% cashback listed` : null,
    ].filter((offer): offer is string => Boolean(offer));

    if (listedOffers.length > 0) {
      return {
        id: `offer-${item.id}`,
        kind: 'offer',
        title: 'Check the listed offer',
        message: listedOffers.join(' · '),
        why: `These offer details come from the sample catalog entry for ${item.name}. They are not verified live retailer offers, and SaveWise does not apply them or open checkout.`,
        action: reviewAction,
      };
    }
  }

  const activeGoal = goals
    .filter((goal) => !goal.isComplete && goal.remainingAmount > 0)
    .sort((left, right) => left.remainingAmount - right.remainingAmount || left.name.localeCompare(right.name))[0];

  if (item && activeGoal) {
    const remaining = activeGoal.remainingAmount;
    const itemPrice = item.price;
    const share = Math.min(itemPrice, remaining);
    const sharePercent = remaining > 0 ? Math.min(100, Math.round((share / remaining) * 100)) : 0;
    const comparison = itemPrice >= remaining
      ? `Skipping could leave enough potential savings to cover the ${money(remaining)} still needed for ${activeGoal.name}, if you choose to track that progress.`
      : `Skipping could leave potential savings equal to about ${sharePercent}% of the ${money(remaining)} still needed for ${activeGoal.name}, if you choose to track that progress.`;

    return {
      id: `goal-${activeGoal.id}-${item.id}`,
      kind: 'goal',
      title: 'Keep your goal in view',
      message: `${comparison} A skip never updates the goal automatically.`,
      why: `This uses your active goal “${activeGoal.name}” and its ${money(remaining)} remaining amount, plus the item's ${money(itemPrice)} demo listed price. A skip never adds money to a goal automatically.`,
      action: {
        label: 'View your goal',
        target: 'view-goals',
      },
    };
  }

  if (rewards && rewards.currentStreak >= 2) {
    return {
      id: `streak-${rewards.currentStreak}`,
      kind: 'progress',
      title: `${rewards.currentStreak}-day saving streak`,
      message: 'You have kept a saving streak going. Take the same thoughtful pause before deciding on this purchase.',
      why: `Your current streak is ${rewards.currentStreak} qualifying calendar days, based on recorded skipped purchases. This recommendation does not assume what you will decide next.`,
      action: reviewAction,
    };
  }

  const mostRecentSkip = decisions
    .filter((decision) => decision.status === 'completed'
      && decision.decision === 'skip'
      && decision.price > 0
      && decision.preparedContribution > 0)
    .sort((left, right) => {
      const leftDate = new Date(left.completedAt ?? left.createdAt).getTime();
      const rightDate = new Date(right.completedAt ?? right.createdAt).getTime();
      return rightDate - leftDate;
    })[0];

  if (item && mostRecentSkip) {
    const priorPercent = Math.min(
      100,
      Math.max(1, Math.round((mostRecentSkip.preparedContribution / mostRecentSkip.price) * 100)),
    );
    const potentialAmount = roundKwd(item.price * priorPercent / 100);

    return {
      id: `future-fund-${item.id}-${mostRecentSkip.id}`,
      kind: 'future-fund',
      title: 'A familiar Future Fund split',
      message: `A recorded skip used ${priorPercent}%. On this item's ${money(item.price)} listed price, that share would be ${money(potentialAmount)} prepared if you choose Skip.`,
      why: `The percentage comes from a completed skip in this browser session (${money(mostRecentSkip.preparedContribution)} prepared from ${money(mostRecentSkip.price)}). This is only a preview; it does not record or approve a Future Fund contribution.`,
      action: {
        label: 'View Future Fund',
        target: 'view-future-fund',
      },
    };
  }

  if (rewards && rewards.skippedPurchases > 0) {
    return {
      id: `progress-${rewards.skippedPurchases}-${rewards.totalSaved}`,
      kind: 'progress',
      title: 'Your past choices count',
      message: `You have skipped ${rewards.skippedPurchases} ${rewards.skippedPurchases === 1 ? 'purchase' : 'purchases'} and kept ${money(rewards.totalSaved)} based on the listed prices.`,
      why: 'This total comes from completed skipped-purchase records in this browser session. It excludes Future Fund projections and is not a prediction about this item.',
      action: reviewAction,
    };
  }

  const waitedDecisions = decisions.filter((decision) => decision.waitingPeriod != null).length;
  if (waitedDecisions >= 2) {
    return {
      id: `pause-history-${waitedDecisions}`,
      kind: 'pause',
      title: 'A pause has worked for you before',
      message: `Your records show ${waitedDecisions} purchase decisions that started with a wait. If this one is not urgent, you can take another pause.`,
      why: `This count comes from ${waitedDecisions} recorded decisions with a 24-hour or 7-day waiting period. It does not assume what happened after those waits.`,
      action: reviewAction,
    };
  }

  return {
    id: item ? `starter-${item.id}` : 'starter-general',
    kind: 'starter',
    title: 'A simple place to start',
    message: 'For a non-essential purchase, compare the cost per use or give yourself a day before deciding.',
    why: 'There is not enough saved goal or purchase history in this browser session to make a personal recommendation yet, so this is a general tip.',
    ...(item ? { action: reviewAction } : {}),
  };
}
