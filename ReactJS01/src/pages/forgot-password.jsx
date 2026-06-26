import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { forgotPasswordThunk } from "../Redux/authSlice";

const ForgotPasswordPage = () => {
  const dispatch = useDispatch();
  const { loading, message, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");
    if (!email) {
      setLocalError("Vui lòng nhập email để khôi phục mật khẩu.");
      return;
    }
    await dispatch(forgotPasswordThunk({ email }));
  };

  return (
    <AuthLayout
      heading="Khôi phục mật khẩu"
      activeTab="login"
      formLabel="--- Quên mật khẩu ---"
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
          hideLabel
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
        />
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
