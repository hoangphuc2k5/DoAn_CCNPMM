import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import { fetchAccountThunk, logout } from "../Redux/authSlice";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, appLoading } = useSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    if (!user) {
      dispatch(fetchAccountThunk());
    }
  }, [dispatch, user]);

  if (appLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-black/60">
        Đang tải hồ sơ...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-[28px] border border-[#ede9fe] bg-white p-8 shadow-[0_20px_60px_rgba(127,0,253,0.08)]">
          <h2 className="text-3xl font-bold text-[#7f00fd]">Bạn chưa đăng nhập</h2>
          <p className="mt-3 text-sm text-[#6b7280]">
            Hãy đăng nhập để xem thông tin hồ sơ.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/login">
              <Button>Đăng nhập</Button>
            </Link>
            <Link to="/">
              <Button variant="ghost">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="grid gap-8 rounded-[32px] border border-[#ede9fe] bg-white p-8 shadow-[0_20px_60px_rgba(127,0,253,0.08)] md:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#7f00fd]">Profile</p>
          <h2 className="mt-4 text-3xl font-bold text-[#111827]">
            Xin chào, {user?.name || "bạn"}
          </h2>
          <p className="mt-3 text-sm text-[#6b7280]">
            Đây là không gian quản lý cá nhân, cập nhật thông tin và theo dõi phiên đăng nhập.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => dispatch(fetchAccountThunk())}>
              Làm mới
            </Button>
            <Button variant="ghost" onClick={() => dispatch(logout())}>
              Đăng xuất
            </Button>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <div className="rounded-2xl border border-[#ede9fe] bg-[#faf7ff] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6b7280]">Email</p>
            <p className="mt-2 text-base font-semibold text-[#111827]">{user?.email}</p>
          </div>
          <div className="rounded-2xl border border-[#ede9fe] bg-[#faf7ff] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6b7280]">Tên hiển thị</p>
            <p className="mt-2 text-base font-semibold text-[#111827]">{user?.name}</p>
          </div>
          <div className="rounded-2xl border border-[#ede9fe] bg-[#faf7ff] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6b7280]">Nguồn tạo</p>
            <p className="mt-2 text-base font-semibold text-[#111827]">
              {user?.createdBy || "HCMUTE"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
