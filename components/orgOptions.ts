import type { SelectOption } from "@/components/DescribedSelect";
import { DEMO_ORG, type OrgInfo } from "@/lib/context";
import type { T } from "@/lib/i18n";

/**
 * The options of a "Data" picker. A data set without orders is greyed out and cannot be chosen: every screen would only show zeros.
 * (The demo data set always has orders.)
 */
export function orgOptions(orgs: OrgInfo[], t: T): SelectOption[] {
  return orgs.map((o) => {
    const empty = o.id !== DEMO_ORG && o.orders === 0;
    return {
      value: o.id, label: o.name, disabled: empty,
      description: o.id === DEMO_ORG
        ? t("Shared demo orders, all simulated.", "Đơn hàng demo dùng chung, toàn bộ là dữ liệu mô phỏng.")
        : empty
          ? t("You haven't uploaded your data yet.", "Bạn chưa tải dữ liệu của mình lên.")
          : t("Your own orders and settings.", "Đơn hàng và cài đặt của riêng bạn."),
    };
  });
}
