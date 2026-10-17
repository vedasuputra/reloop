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
- Main menu: Dashboard (overview + pilot targets), Orders (list of orders with CSV download for the packing team; click an order for its detail page with the return prediction, the factors behind it, the RVS breakdown and cost; "+ Score a new order" to type in a single order), Simulator (10-40% reusable, RVS vs random, courier pickup and drop-off side by side, scaled to a daily order volume), Pack recovery (forward and reverse loop, five return channels to validate, damaged vs lost packs, effective cycles and fleet size), Report (sustainability: packs and plastic avoided net of lost bags; no EPR figure is shown until official figures are entered), AI Model (retrain on own data, fairness by group, wrong cases), Pilot plan (roadmap, live Go / No-Go gate preview, risks and Plan B, scaling).
- Settings menu: Upload data (CSV), Cost settings, API integration (POST /api/score). Footer: Data & Privacy.
- AI assistant: the "Ask AI" button in the bottom-right corner of every page.
- The app is available in English and Vietnamese (EN/VI switch at the top).

LIMITS (say these honestly when relevant)
- DATA: every person sees three data sets in the Data dropdown: the shared sample data (simulated, read-only), their organisation's data (already prepared with the organisation's cost settings, read-only for employees) and their own data, which starts empty and is where they upload their own orders and set their own costs.
- ACCESS: ReLoop AI is B2B. Only business emails of subscribed organisations can sign up or log in (for the prototype: any address ending with @coolmate.me; only the domain is checked). Subscriptions are arranged by personal contact; an employee cannot change the plan in the app. The plan shows under the email in the sidebar (Growth for Coolmate) and opens a read-only details popup.
- All demo orders are simulated. Behaviour (who returns, pack recovery) is simulated; prices are sourced.
- CO2 impact is NOT estimated: there is no sourced emission factor yet. Reusable is not automatically lower-carbon.
- EPR (Vietnam Decree 05/2025): the report shows no EPR figure yet. It appears only once the official Fs rate and mandatory recycling rate are entered in the configuration; the placeholders in the model are never shown. EPR credits are excluded from all results.
- No pilot with a real brand has been run yet.

BUSINESS MODEL
- Main revenue: monthly SaaS subscription. Planning prices (not signed contracts): Starter 3M VND/month (one brand, CSV workflow, dashboard, simulator, report), Growth 7M VND/month (API integration, custom AI model, multiple data sets), Enterprise 15M VND/month (multi-warehouse, scheduled retraining, priority support). One-time integration fee 15M VND. Add-ons: premium ESG/EPR reports, custom models, consulting.
- Pilot plan (12 months, four phases): M1-2 discover and govern, M3-4 configure the B2B MVP, M5-7 one-brand pilot in shadow mode, M8-12 retrain and scale only if the gates are met. Targets by month 12: AUC at least 0.70, 80% of packs returned without a courier, 400 single-use packs avoided per 1,000 orders, at least 15% packaging cost saving vs all single-use.
- Team (the Loopies): Diva Meilla Nisyah (business development & partnerships), Permata Andini Sinaga (finance, impact & compliance), Aisha Nasywa Emiliana (operations & recovery system), I Ketut Veda Suputra (AI, website, data & product). UEH Business Challenge 2026.
`;
