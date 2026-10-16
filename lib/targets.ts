/**
 * Pilot targets from the team's execution plan (month 12, Coolmate pilot).
 * Baseline = all orders in single-use packaging.
 */
export const TARGETS = {
  auc: 0.7,                 // return-prediction AUC on newer orders
  selfReturn: 0.8,          // packs returned without a courier
  packsAvoidedPer1000: 400, // single-use packs avoided per 1,000 orders (40% reusable share)
  costSaving: 0.15,         // packaging cost saving vs all single-use
};
