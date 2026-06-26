import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { verifyTwoFactorThunk } from "../Redux/authSlice";

const VerifyTwoFactorPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, tempToken } = useSelector((state) => state.auth);
  const [otp, setOtp] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(verifyTwoFactorThunk({ tempToken, otp }));
    if (verifyTwoFactorThunk.fulfilled.match(result)) {
      navigate("/profile");
    }
  };

  return (
    <AuthLayout
      title="Xác minh 2 lớp"
      subtitle="Nhập OTP vừa được gửi tới email để hoàn tất đăng nhập."
      activeTab="login"
      formLabel="--- Xác minh 2FA ---"
      showGoogleButton={false}
      footer={
        <Link className="text-reef hover:text-ink" to="/login">
          Quay lại đăng nhập
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Mã OTP" name="otp" value={otp} onChange={(e) => setOtp(e.target.value)} />
        {error ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <Button type="submit" loading={loading} className="w-full">
          Xác minh
        </Button>
      </form>
    </AuthLayout>
  );
};

export default VerifyTwoFactorPage;
