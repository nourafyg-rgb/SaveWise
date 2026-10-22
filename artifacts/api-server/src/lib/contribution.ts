export function calculatePreparedContribution(price: number, contributionPercent: number) {
  return Number(((price * contributionPercent) / 100).toFixed(3));
}
