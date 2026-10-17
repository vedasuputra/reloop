"use client";
import StatusPage from "@/components/StatusPage";

const TEXT = {
  en: {
    title: "Something went wrong",
    body: "This page failed to load. Usually the database connection dropped for a moment or the login session expired.",
    tips: ["Try reloading with the button below.", "If it still fails, log out and log in again."],
  },
  vi: {
    title: "Đã xảy ra lỗi",
    body: "Không tải được trang này. Thường là do kết nối cơ sở dữ liệu bị gián đoạn trong chốc lát hoặc phiên đăng nhập đã hết hạn.",
    tips: ["Hãy thử tải lại bằng nút bên dưới.", "Nếu vẫn lỗi, hãy đăng xuất rồi đăng nhập lại."],
  },
};

/** Friendly message instead of a crash page. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatusPage text={TEXT} onRetry={() => reset()} digest={error.digest} />;
}
