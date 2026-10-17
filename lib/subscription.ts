import type { Lang, T } from "@/lib/i18n";

/**
 * ReLoop AI is sold to organisations (B2B). A person may sign up or log in only with a business email whose domain belongs to
 * an organisation that has subscribed. This file is the one place that says which organisations those are, which plan each is
 * on, and what each plan includes. Planning prices from the team's execution plan, not signed contracts.
 */

export const SUPPORT_EMAIL = "diva145@icloud.com";
export const contactHref = (subject: string) => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

type Bi = [en: string, vi: string];
export type TierKey = "starter" | "growth" | "enterprise";

export interface Tier {
  key: TierKey;
  name: string;
  priceM: number;      // million VND per month
  tagline: Bi;
  benefits: Bi[];
}

export const TIERS: Tier[] = [
  {
    key: "starter", name: "Starter", priceM: 3,
    tagline: ["One brand, CSV workflow", "Một thương hiệu, quy trình CSV"],
    benefits: [
      ["One brand", "Một thương hiệu"],
      ["CSV upload workflow", "Quy trình tải lên bằng CSV"],
      ["Dashboard with pilot targets", "Tổng quan kèm mục tiêu thí điểm"],
      ["Scenario simulator", "Bộ mô phỏng kịch bản"],
      ["Sustainability report", "Báo cáo bền vững"],
    ],
  },
  {
    key: "growth", name: "Growth", priceM: 7,
    tagline: ["API and your own AI model", "API và mô hình AI riêng"],
    benefits: [
      ["Everything in Starter", "Tất cả tính năng của Starter"],
      ["API integration", "Tích hợp API"],
      ["Custom AI model, retrained on your own data", "Mô hình AI riêng, huấn luyện lại bằng dữ liệu của bạn"],
      ["Multiple data sets", "Nhiều bộ dữ liệu"],
    ],
  },
  {
    key: "enterprise", name: "Enterprise", priceM: 15,
    tagline: ["Many warehouses, priority support", "Nhiều kho, hỗ trợ ưu tiên"],
    benefits: [
      ["Everything in Growth", "Tất cả tính năng của Growth"],
      ["Multi-warehouse", "Nhiều kho"],
      ["Scheduled retraining", "Huấn luyện lại theo lịch"],
      ["Priority support", "Hỗ trợ ưu tiên"],
    ],
  },
];

export interface SubscribedOrg {
  domain: string;      // email domain, lower case
  name: string;
  tier: TierKey;
  startedOn: { month: number; day: number };
  renewsOn: { month: number; day: number };
}

export const SUBSCRIBED_ORGS: SubscribedOrg[] = [
  { domain: "coolmate.me", name: "Coolmate", tier: "growth", startedOn: { month: 8, day: 17 }, renewsOn: { month: 10, day: 17 } },
];

/** Free personal mailboxes. A visitor using one is told to use a business email (a list can never be complete; anything else that is not subscribed gets the other message). */
const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "outlook.com.vn", "hotmail.com", "hotmail.co.uk", "live.com", "msn.com",
  "yahoo.com", "yahoo.com.vn", "ymail.com", "rocketmail.com", "icloud.com", "me.com", "mac.com", "aol.com",
  "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.net", "zoho.com", "mail.com", "yandex.com", "yandex.ru",
  "qq.com", "163.com", "126.com", "naver.com", "daum.net", "fpt.vn", "vnn.vn",
]);

export type EmailProblem = "invalid" | "personal" | "unsubscribed";
export type EmailCheck = { ok: true; org: SubscribedOrg } | { ok: false; reason: EmailProblem };

/** Is this email allowed in? Only the domain is looked at (the address itself is not verified). */
export function checkEmail(raw: string): EmailCheck {
  const match = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(raw.trim().toLowerCase());
  if (!match) return { ok: false, reason: "invalid" };
  const domain = match[1];
  if (PERSONAL_DOMAINS.has(domain)) return { ok: false, reason: "personal" };
  const org = SUBSCRIBED_ORGS.find((o) => o.domain === domain);
  return org ? { ok: true, org } : { ok: false, reason: "unsubscribed" };
}

/**
 * What to tell someone whose email is not accepted. Logging in: an address of a business that has not subscribed cannot have an
 * account, so that is what is said. Signing up: the business is told it has not subscribed.
 */
export function emailMessage(t: T, reason: EmailProblem, mode: "login" | "signup"): string {
  switch (reason) {
    case "personal": return t("You should log in with a business email.", "Bạn nên đăng nhập bằng email doanh nghiệp.");
    case "unsubscribed":
      return mode === "login" ? accountMissing(t) : t("Your business has not subscribed to ReLoop AI yet.", "Doanh nghiệp của bạn chưa đăng ký ReLoop AI.");
    default: return t("Enter a valid email address.", "Hãy nhập một địa chỉ email hợp lệ.");
  }
}

export const accountMissing = (t: T) => t("The account doesn't exist.", "Tài khoản không tồn tại.");

/** The organisation a logged-in person belongs to, found from their email domain (null if it is not a subscribed one). */
export function orgForEmail(email: string | undefined | null): SubscribedOrg | null {
  const c = checkEmail(email ?? "");
  return c.ok ? c.org : null;
}

export const tierOf = (org: SubscribedOrg): Tier => TIERS.find((x) => x.key === org.tier) ?? TIERS[0];

/** "17 October" / "17 tháng 10": day and month only, as a plan renews on the same day every term. */
export function dayMonth(lang: Lang, d: { month: number; day: number }): string {
  return new Date(2000, d.month - 1, d.day).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", { day: "numeric", month: "long" });
}
