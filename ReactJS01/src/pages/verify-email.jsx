import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { resendVerifyEmailThunk, verifyEmailThunk } from "../Redux/authSlice";

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, message } = useSelector((state) => state.auth);
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(verifyEmailThunk({ email, otp }));
    if (verifyEmailThunk.fulfilled.match(result)) {
      navigate("/login", { replace: true });
    }
  };

  return (
    <AuthLayout
      title="Xác thực email"
      subtitle="Nhập OTP đã gửi qua email để hoàn tất kích hoạt tài khoản."
      activeTab="register"
      formLabel="--- Xác thực OTP ---"
      showGoogleButton={false}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Link className="text-reef hover:text-ink" to="/login">
            Về đăng nhập
          </Link>
          <button
            type="button"
            className="text-reef hover:text-ink"
            onClick={() => dispatch(resendVerifyEmailThunk({ email }))}
          >
            Gửi lại OTP
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="OTP" name="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6 chữ số" />
        {error ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-700">{message}</div> : null}
        <Button type="submit" loading={loading} className="w-full">
          Xác thực email
        </Button>
      </form>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
