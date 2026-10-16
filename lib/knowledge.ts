/**
 * What ReLoop is and how it works: the only background knowledge the assistant may use besides the live FACTS.
 * Keep this in sync with the report and config.json. Do not add numbers that are not sourced.
 */
export const KNOWLEDGE = `
ABOUT RELOOP AI
- B2B SaaS for e-commerce fashion and lifestyle brands in Vietnam (first target: brands like Coolmate, YODY). Tagline: "Predict the Return. Choose the Right Package."
- ReLoop does not sell packaging. It sells decision intelligence: for each order it recommends a reusable pack or a single-use pack.
- Flow: order data -> return probability (AI model) -> Reuse Viability Score (RVS) -> packaging recommendation -> cost and impact dashboard.

RETURN MODEL
- Logistic regression. Features: bought more than one size, COD payment, voucher used, 2 or more items, customer has earlier orders, customer's past return rate, product category (reference category Accessories).
- The built-in model is trained on SIMULATED data with a time-based split (oldest 75% train, newest 25% test). Its AUC (about 0.66 vs 0.63 for a category-only baseline) shows the pipeline works, not real-world accuracy.
- A brand can retrain the model on its own orders (screen "AI Model", at least 200 delivered orders with a was_returned column). This is the Custom AI Model.

REUSE VIABILITY SCORE (RVS v2)
- RVS = 0.55 x cost advantage + 0.30 x chance the reusable pack comes back + 0.15 x reuse cycles. Each part is 0-100.
- Cost advantage: 50 points at break-even, 100 when reusable saves at least 25% of the single-use pack cost, 0 when it loses a full single-use pack cost or more.
- Thresholds: 70 or more REUSABLE, 40-69 REVIEW, below 40 SINGLE-USE. Guard: never REUSABLE if the reusable pack is expected to cost more than single-use.
- Version 1 in the first deck (return, cycles, cost, distance) was replaced because return probability was counted twice and distance barely changes cost (courier tariff is flat per route).
- Why return probability matters: when an item is returned, the reusable pack rides back with it for free, so reusable gets cheaper as the return probability rises.

PACK COLLECTION METHODS
- Courier pickup: a courier collects the empty pack; this adds a pickup fee, so reusable is usually more expensive.
- Drop-off: the customer returns the pack without a courier (no pickup fee) but fewer packs come back.

COSTS (reference values; each brand can enter its own on "Cost Settings")
- Sourced from public listings (Lazada, Shopee, laundry prices, GHN courier tariffs). Single-use mailer and box, reusable zip bag, reuse cycles (assumption 10), cleaning per reuse.
- Brand presets: Low-cost packaging, Clothing-size reference, Premium brand (logo mailer), Premium brand (box).

APP SCREENS
- Main menu: Dashboard (overview + pilot targets), Orders (list of orders with CSV download for the packing team; click an order for its detail page with the return prediction, the factors behind it, the RVS breakdown and cost; "+ Score a new order" to type in a single order), Simulator (10-40% reusable, RVS vs random), Report (sustainability: packs and plastic avoided, illustrative EPR), AI Model (retrain on own data, fairness by group, wrong cases).
- Settings menu: Upload data (CSV), Cost settings, API integration (POST /api/score). Footer: Data & Privacy.
- AI assistant: the "Ask AI" button in the bottom-right corner of every page.
- The app is available in English and Vietnamese (EN/VI switch at the top).

LIMITS (say these honestly when relevant)
- All demo orders are simulated. Behaviour (who returns, pack recovery) is simulated; prices are sourced.
- CO2 impact is NOT estimated: there is no sourced emission factor yet. Reusable is not automatically lower-carbon.
- EPR figures (Vietnam Decree 05/2025) use placeholder recycling rates and Fs values, so they are illustrative only.
- No pilot with a real brand has been run yet.

BUSINESS MODEL
- Main revenue: monthly SaaS subscription. Extra: one-time integration fee, premium sustainability/EPR reporting, custom AI model, enterprise consulting. Exact prices are not in the app; do not quote any.
`;
