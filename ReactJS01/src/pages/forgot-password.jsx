import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { fetchCaptchaThunk, forgotPasswordThunk } from "../Redux/authSlice";

const ForgotPasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, message, error, captcha } = useSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    dispatch(fetchCaptchaThunk());
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");
    if (!email) {
      setLocalError("Vui lòng nhập email để khôi phục mật khẩu.");
      return;
    }
    if (!captchaAnswer) {
      setLocalError("Vui lòng nhập CAPTCHA.");
      return;
    }
    const result = await dispatch(
      forgotPasswordThunk({ email, captchaAnswer, captchaToken: captcha?.challengeToken }),
    );
    if (forgotPasswordThunk.fulfilled.match(result)) {
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <AuthLayout
      title="Khôi phục mật khẩu"
      subtitle="Nhập email để nhận OTP đặt lại mật khẩu."
      activeTab="login"
      formLabel="--- Quên mật khẩu ---"
      showGoogleButton={false}
      footer={
        <span>
          Bạn đã nhớ mật khẩu?{" "}
          <Link className="font-semibold text-[#7f00fd]" to="/login">
            Đăng nhập
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
        />
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-4">
          <div className="text-sm font-semibold text-slate-700">Xác nhận yêu cầu bảo mật</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="rounded-xl bg-white px-3 py-2 font-mono text-base font-bold text-slate-700 shadow-sm">
              {captcha?.question || "Đang tải..."}
            </div>
            <input
              type="text"
              value={captchaAnswer}
              onChange={(event) => setCaptchaAnswer(event.target.value)}
              placeholder="Kết quả"
              className="h-11 w-28 rounded-xl border border-violet-200 px-3 text-sm outline-none"
            />
          </div>
        </div>
        {localError || error ? (
          <div className="rounded-[14px] border border-[rgba(194,83,26,0.3)] bg-[rgba(194,83,26,0.08)] px-4 py-3 text-sm text-[#c2531a]">
            {localError || error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-[14px] border border-[rgba(127,0,253,0.3)] bg-[rgba(127,0,253,0.08)] px-4 py-3 text-sm text-[#7f00fd]">
            {message}
          </div>
        ) : null}
        <Button type="submit" loading={loading} className="w-full">
          Gửi yêu cầu
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
