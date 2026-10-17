import type { SelectOption } from "@/components/DescribedSelect";
import { DEMO_ORG, type OrgInfo } from "@/lib/context";
import type { T } from "@/lib/i18n";

/** How a data set relates to the person: the shared sample, their organisation's (they may only read it), or their own (they upload to it). */
export type DataKind = "sample" | "organisation" | "own";
export const dataKind = (o: Pick<OrgInfo, "id" | "role">): DataKind => (o.id === DEMO_ORG ? "sample" : o.role === "owner" ? "own" : "organisation");

/**
 * The options of a "Data" picker, with what each one is. A data set without orders is greyed out and cannot be chosen: every screen
 * would only show zeros. (The sample data set always has orders.)
 */
export function orgOptions(orgs: OrgInfo[], t: T): SelectOption[] {
  return orgs.map((o) => {
    const kind = dataKind(o);
    const empty = kind !== "sample" && o.orders === 0;
    const description =
      kind === "sample" ? t("Sample data: simulated orders, the same for everyone.", "Dữ liệu mẫu: đơn hàng mô phỏng, giống nhau cho mọi người.")
      : kind === "own" ? (empty ? t("You haven't uploaded your data yet.", "Bạn chưa tải dữ liệu của mình lên.") : t("Your own orders and settings.", "Đơn hàng và cài đặt của riêng bạn."))
      : (empty ? t("Your organisation hasn't added its data yet.", "Tổ chức của bạn chưa thêm dữ liệu.") : t("Your organisation's orders and cost settings, the same for every colleague.", "Đơn hàng và cài đặt chi phí của tổ chức bạn, giống nhau cho mọi đồng nghiệp."));
    return { value: o.id, label: o.name, disabled: empty, description };
  });
}
