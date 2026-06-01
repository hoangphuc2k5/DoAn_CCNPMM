import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
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
      title="Quên mật khẩu"
      subtitle="Nhập email để nhận hướng dẫn khôi phục. Chúng tôi sẽ kiểm tra tài khoản và phản hồi ngay."
      footer={
        <span>
          Bạn đã nhớ mật khẩu?{" "}
          <Link className="text-reef hover:text-ink" to="/login">
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
          placeholder="you@email.com"
        />
        {localError || error ? (
          <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
            {localError || error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-2xl border border-reef/30 bg-reef/10 px-4 py-3 text-sm text-reef">
            {message}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={loading} className="w-full">
            Gửi yêu cầu
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

export default ForgotPasswordPage;
