import type { CatalogItem } from '@workspace/api-client-react';

export type SaveWisePick = {
  headline: string;
  message: string;
  reasons: string[];
  offers: string[];
  savings: number | null;
  significant: boolean;
};

export function getSaveWisePick(item: CatalogItem, contributionPercent = 10): SaveWisePick {
  const hasCheaperAlternative =
    item.alternativePrice != null && item.alternativePrice < item.price;
  const savings = hasCheaperAlternative ? item.price - item.alternativePrice! : null;
  const significant = savings != null && item.price > 0 && savings >= item.price * 0.1;
  const reasons: string[] = [];
  const offers: string[] = [];

  if (hasCheaperAlternative) {
    const alternativeName = item.alternativeName || 'The listed alternative';
    reasons.push(
      `${alternativeName} is ${item.currency} ${item.alternativePrice!.toFixed(2)} versus ${item.currency} ${item.price.toFixed(2)}.`,
    );
    reasons.push(
      `The listed price difference is ${item.currency} ${savings!.toFixed(2)}.`,
    );
  } else {
    reasons.push('No lower-priced alternative is listed for this item.');
  }

  if (item.discountLabel) {
    reasons.push(`Listed offer: ${item.discountLabel}.`);
    offers.push(item.discountLabel);
  }
  if (item.promoCode) {
    reasons.push(`Listed promo code: ${item.promoCode}.`);
    offers.push(`Promo code ${item.promoCode}`);
  }
  if (item.cashbackPercent != null) {
    reasons.push(`Listed cashback: ${item.cashbackPercent}%.`);
    offers.push(`${item.cashbackPercent}% cashback listed`);
  }
  if (!item.discountLabel && !item.promoCode && item.cashbackPercent == null) {
    reasons.push('No discount, promo code, or cashback details are listed.');
  }

  const contribution = item.price * contributionPercent / 100;
  const remaining = item.price - contribution;
  reasons.push(`At your selected ${contributionPercent}% rate, ${item.currency} ${contribution.toFixed(2)} would be prepared and ${item.currency} ${remaining.toFixed(2)} would remain outside the fund.`);
  if (contributionPercent === 10) reasons.push('10% is the default setting, not a claim that it is the right rate for you.');

  const headline = `${contributionPercent}% selected`;
  let message: string;
  if (contributionPercent === 10 && significant) {
    const alternativeName = item.alternativeName || 'The listed alternative';
    message = `${alternativeName} is ${item.currency} ${savings!.toFixed(2)} less. Consider waiting 24 hours or comparing it.`;
  } else if (contributionPercent === 10 && hasCheaperAlternative) {
    message = `There is a lower listed option, though the price difference is less than 10% of this item's listed price.`;
  } else if (contributionPercent === 10 && (item.discountLabel || item.promoCode || item.cashbackPercent != null)) {
    message = 'There are listed offer details to consider; SaveWise cannot verify whether they are current or applicable.';
  } else if (contributionPercent !== 10) {
    message = hasCheaperAlternative
      ? `${item.alternativeName || 'The listed alternative'} is ${item.currency} ${item.alternativePrice!.toFixed(2)} versus ${item.currency} ${item.price.toFixed(2)}. Comparing it is one option; your selected rate is your choice.`
      : 'This is your selected rate, not an objectively best choice.';
  } else {
    message = 'No lower-priced option or offer details are listed. Compare what matters to you before deciding.';
  }

  return { headline, message, reasons, offers, savings, significant };
}
