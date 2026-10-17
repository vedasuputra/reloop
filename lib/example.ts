import type { Order } from "@/lib/rvs";

/** The order shown in the landing page's live example (also used by the public assistant). */
export const LANDING_EXAMPLE: Order = {
  category: "Dress", payment_method: "COD", multi_size: 1, voucher_used: 1, quantity_of_item: 2,
  past_delivered_in_data: 3, customer_return_rate_in_data: 0.33, estimated_delivery_distance_km: 12,
};
