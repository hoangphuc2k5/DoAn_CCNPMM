import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { resetPasswordThunk } from "../Redux/authSlice";

const ResetPasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, message } = useSelector((state) => state.auth);
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: searchParams.get("email") || "",
    otp: "",
    newPassword: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(resetPasswordThunk(form));
    if (resetPasswordThunk.fulfilled.match(result)) {
      navigate("/login");
    }
  };

  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      subtitle="Dùng OTP đã nhận để tạo mật khẩu mới."
      activeTab="login"
      formLabel="--- Mật khẩu mới ---"
      showGoogleButton={false}
      footer={
        <Link className="text-reef hover:text-ink" to="/login">
          Quay lại đăng nhập
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
        <Input label="OTP" name="otp" value={form.otp} onChange={handleChange} placeholder="6 chữ số" />
        <Input
          label="Mật khẩu mới"
          name="newPassword"
          type="password"
          value={form.newPassword}
          onChange={handleChange}
          placeholder="Tối thiểu 6 ký tự"
        />
        {error ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-700">{message}</div> : null}
        <Button type="submit" loading={loading} className="w-full">
          Đặt lại mật khẩu
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
