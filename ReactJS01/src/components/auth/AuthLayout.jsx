import { Link } from "react-router-dom";
import appLogo from "../../Logo/logo.jpg";
const googleIcon =
  "http://localhost:3845/assets/e7272a1b9b5fba11852f805cecac75e832328b3d.svg";

const tabs = [
  { key: "register", label: "Đăng ký", to: "/register" },
  { key: "login", label: "Đăng nhập", to: "/login" },
];

const AuthLayout = ({
  title,
  heading = "Chào mừng",
  subtitle = "Tiếp tục để truy cập nền tảng mạng xã hội của bạn.",
  activeTab = "login",
  formLabel = "--- Đăng nhập ---",
  children,
  footer,
}) => {
  return (
    <div className="min-h-screen bg-white px-6 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-[1180px] items-center justify-center">
        <div className="grid w-full max-w-[1024px] gap-10 lg:grid-cols-[554px_430px]">
          <div className="flex flex-col gap-4">
            <div className="flex h-[500px] items-center justify-center rounded-[16px] bg-[#7f00fd]">
              <div className="flex w-[349.725px] flex-col items-center px-8 text-center">
                <img
                  src={appLogo}
                  alt="Tegram"
                  className="h-36 w-36 rounded-full bg-white object-cover shadow-lg"
                />
                <div className="pt-6 text-[24px] font-bold leading-[33px] text-white">
                  Kết nối với mọi người
                </div>
                <div className="pt-3 text-[14px] leading-[20px] text-[rgba(255,255,255,0.7)]">
                  Tham gia cộng đồng hàng triệu người dùng
                </div>
              </div>
            </div>
          </div>

          <div className="flex max-w-[430px] flex-col gap-10 self-center">
            <h1 className="text-[36px] font-bold leading-[40px] text-[#7f00fd]">
              {title || heading}
            </h1>
            <p className="-mt-6 text-sm text-[#6b7280]">{subtitle}</p>

            <div className="flex flex-col gap-7">
              <div className="rounded-[16px] border-[1.6px] border-[#7f00fd] p-[9.6px]">
                <div className="grid grid-cols-2 gap-0">
                  {tabs.map((tab) => {
                    const active = tab.key === activeTab;

                    return (
                      <Link
                        key={tab.key}
                        to={tab.to}
                        className={`flex h-16 items-center justify-center rounded-[14px] text-[16px] font-bold leading-6 transition ${
                          active
                            ? "bg-[#7f00fd] text-white"
                            : "bg-white text-[#7f00fd]"
                        }`}
                      >
                        {tab.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <p className="text-center text-[14px] font-light leading-5 text-[#515151]">
                {formLabel}
              </p>

              <div className="flex flex-col gap-3">
                {children}
                {footer ? <div>{footer}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
