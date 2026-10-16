import { getT } from "@/lib/i18n";

/** Shown on the login page so judges know what they can do with the demo account. */
export default async function DemoNote() {
  const { t } = await getT();
  return (
    <div className="rounded border p-3 text-sm space-y-1">
      <p className="font-semibold">{t("For judges and visitors", "Dành cho giám khảo và khách tham quan")}</p>
      <p>{t("Log in with the demo account:", "Đăng nhập bằng tài khoản demo:")} <b>demo@reloop.app</b> / <b>reloop</b></p>
      <p>
        {t(
          "The demo account is shared. Other visitors can change its \"My data\", so results may differ from what you left. To try CSV upload, cost settings or model retraining undisturbed, create your own account with the Sign up button on this page.",
          "Tài khoản demo được dùng chung. Khách khác có thể thay đổi mục \"Dữ liệu của tôi\" của tài khoản này, nên kết quả có thể khác với lúc bạn rời đi. Để thử tải lên CSV, cài đặt chi phí hoặc huấn luyện lại mô hình mà không bị ảnh hưởng, hãy tạo tài khoản riêng bằng nút Đăng ký trên trang này.",
        )}
      </p>
      <p className="text-gray-500">{t("All demo orders are simulated data.", "Toàn bộ đơn hàng demo là dữ liệu mô phỏng.")}</p>
    </div>
  );
}
