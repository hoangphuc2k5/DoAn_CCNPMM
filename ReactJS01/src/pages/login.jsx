import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { loginThunk } from "../Redux/authSlice";

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [formState, setFormState] = useState({ email: "", password: "" });
  const [localError, setLocalError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
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
      }),
    );

    if (loginThunk.fulfilled.match(result)) {
      navigate("/profile");
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Đăng nhập để quay lại bảng tin, hồ sơ cá nhân và các nhóm bạn đang tham gia."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="text-reef hover:text-ink" to="/forgot-password">
            Quên mật khẩu?
          </Link>
          <span>
            Chưa có tài khoản?{" "}
            <Link className="text-reef hover:text-ink" to="/register">
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
        {localError || error ? (
          <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
            {localError || error}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={loading} className="w-full">
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
