import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../../Redux/authSlice";

const linkClass = (active) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    active ? "bg-[#ede9fe] text-[#7f00fd]" : "text-[#4b5563] hover:text-[#7f00fd]"
  }`;

const Header = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <header className="border-b border-[#ede9fe] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-bold text-[#7f00fd]">
          Telegram
        </Link>

        <nav className="flex items-center gap-2">
          <Link to="/" className={linkClass(location.pathname === "/")}>
            Trang chủ
          </Link>
          <Link to="/user" className={linkClass(location.pathname === "/user")}>
            Người dùng
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className={linkClass(location.pathname === "/profile")}
              >
                {user?.email || "Hồ sơ"}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-[#7f00fd] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6b00d7]"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={linkClass(location.pathname === "/login")}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-[#7f00fd] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6b00d7]"
              >
                Đăng ký
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
