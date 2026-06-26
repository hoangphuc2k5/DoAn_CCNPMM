import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import {
  fetchCaptchaThunk,
  loginThunk,
} from "../Redux/authSlice";

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { loading, error, captcha } = useSelector((state) => state.auth);

  const [formState, setFormState] = useState({
    email: "",
    password: "",
    captchaAnswer: "",
  });

  const [localError, setLocalError] = useState("");

  useEffect(() => {
    dispatch(fetchCaptchaThunk());
  }, [dispatch]);

  // 2FA flow removed

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (!formState.email.trim() || !formState.password) {
      setLocalError("Vui lòng nhập email và mật khẩu.");
      return;
    }

    const result = await dispatch(
      loginThunk({
        email: formState.email.trim(),
        password: formState.password,
        captchaAnswer: formState.captchaAnswer,
        captchaToken: captcha?.challengeToken,
      })
    );

    if (loginThunk.fulfilled.match(result)) {
      if (result.payload?.requiresEmailVerification) {
        const email = result.payload.email || formState.email.trim();

        navigate(
          `/verify-email?email=${encodeURIComponent(email)}`,
          { replace: true }
        );
        return;
      }

      if (result.payload?.access_token) {
        navigate("/profile");
      }
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập"
      activeTab="login"
      subtitle="Đăng nhập để quay lại bảng tin, hồ sơ cá nhân và các nhóm bạn đang tham gia."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="text-reef hover:text-ink"
            to="/forgot-password"
          >
            Quên mật khẩu?
          </Link>

          <span>
            Chưa có tài khoản?{" "}
            <Link
              className="text-reef hover:text-ink"
              to="/register"
            >
              Đăng ký
            </Link>
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          name="email"
          type="email"
          value={formState.email}
          onChange={handleChange}
          placeholder="you@email.com"
        />

        <Input
          label="Mật khẩu"
          name="password"
          type="password"
          value={formState.password}
          onChange={handleChange}
          placeholder="••••••••"
        />

        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-4">
          <div className="text-sm font-semibold text-slate-700">
            Xác nhận đăng nhập an toàn
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="rounded-xl bg-white px-3 py-2 font-mono text-base font-bold text-slate-700 shadow-sm">
              {captcha?.question || "Đang tải..."}
            </div>

            <input
              type="text"
              name="captchaAnswer"
              value={formState.captchaAnswer}
              onChange={handleChange}
              placeholder="Kết quả"
              className="h-11 w-28 rounded-xl border border-violet-200 px-3 text-sm outline-none"
            />
          </div>
        </div>

        {(localError || error) && (
          <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
            {localError || error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            Đăng nhập
          </Button>

          <Link to="/" className="w-full">
            <Button variant="ghost" className="w-full">
              Về trang chủ
            </Button>
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;