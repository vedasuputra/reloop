import StatusPage from "@/components/StatusPage";

const TEXT = {
  en: { title: "Page not found", body: "This address does not exist in ReLoop AI." },
  vi: { title: "Không tìm thấy trang", body: "Địa chỉ này không tồn tại trong ReLoop AI." },
};

/** Unknown address. Same look as the error page; the language comes from the browser's cookie, with the EN / VN switch on the page. */
export default function NotFound() {
  return <StatusPage text={TEXT} />;
}
