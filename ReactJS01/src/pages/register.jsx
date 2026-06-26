import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { registerThunk } from "../Redux/authSlice";

const RegisterPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    captcha: "",
  });
  const [localError, setLocalError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");
    if (!formState.name || !formState.email || !formState.password) {
      setLocalError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
  const isCaptchaValid = formState.captcha.trim() === "13";
  const isFormReady =
    formState.name.trim() &&
    formState.email.trim() &&
    formState.password &&
    isCaptchaValid;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (!formState.name.trim() || !formState.email.trim() || !formState.password) {
      setLocalError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formState.email.trim())) {
      setLocalError("Email không đúng định dạng.");
      return;
    }

    if (formState.password.length < 6) {
      setLocalError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    const result = await dispatch(registerThunk(formState));
    if (!isCaptchaValid) {
      setLocalError("Hãy nhập đúng kết quả phép tính để tiếp tục.");
      return;
    }

    const result = await dispatch(
      registerThunk({
        name: formState.name.trim(),
        email: formState.email.trim(),
        password: formState.password,
      }),
    );

    if (registerThunk.fulfilled.match(result)) {
      navigate("/login");
    }
  };

  return (
    <AuthLayout
      title="Tạo tài khoản mới"
      subtitle="Đăng ký để bắt đầu sử dụng mạng xã hội mini với feed, tương tác và thông báo."
      footer={
        <span>
          Đã có tài khoản?{" "}
          <Link className="text-reef hover:text-ink" to="/login">
            Đăng nhập ngay
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Ho va ten"
          name="name"
          value={formState.name}
          onChange={handleChange}
          placeholder="Nguyễn Văn A"
        />
        <Input
          label="Email"
    <AuthLayout activeTab="register" formLabel="--- Đăng ký ---">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Họ và tên"
          hideLabel
          name="name"
          value={formState.name}
          onChange={handleChange}
          placeholder="Họ và tên"
        />
        <Input
          label="Email"
          hideLabel
          name="email"
          type="email"
          value={formState.email}
          onChange={handleChange}
          placeholder="you@email.com"
        />
        <Input
          label="Mật khẩu"
          placeholder="Email"
        />
        <Input
          label="Mật khẩu"
          hideLabel
          name="password"
          type="password"
          value={formState.password}
          onChange={handleChange}
          placeholder="Nhập mật khẩu"
        />
        {localError || error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError || error}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={loading} className="w-full">
            Tạo tài khoản
          </Button>
          <Link to="/" className="w-full">
            <Button variant="ghost" className="w-full">
              Về trang chủ
            </Button>
          </Link>
        </div>
          placeholder="Mật khẩu"
        />

        <div className="w-full rounded-[14px] border-[1.6px] border-[rgba(127,0,253,0.3)] bg-[#f9fafb] p-[17.6px]">
          <div className="text-[12px] font-bold uppercase tracking-[0.3px] text-[#6a7282]">
            Xác nhận bạn không phải robot
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-[12.8px] py-[8.8px] font-mono text-[16px] font-bold leading-6 text-[#364153]">
              4 + 9 = ?
            </div>
            <input
              type="text"
              name="captcha"
              value={formState.captcha}
              onChange={handleChange}
              placeholder="Kết quả"
              className="h-[39.2px] w-24 rounded-[10px] border-[1.6px] border-[rgba(127,0,253,0.3)] bg-white px-[13.6px] text-[14px] text-[#111827] outline-none placeholder:text-[rgba(10,10,10,0.5)]"
            />
          </div>

          <div className="pt-2 text-[12px] leading-4 text-[#99a1af]">
            Nhập kết quả phép tính để xác nhận
          </div>
        </div>

        {localError || error ? (
          <div className="rounded-[14px] border border-[rgba(194,83,26,0.3)] bg-[rgba(194,83,26,0.08)] px-4 py-3 text-sm text-[#c2531a]">
            {localError || error}
          </div>
        ) : null}

        <Button type="submit" loading={loading} disabled={!isFormReady} className="w-full">
          Tiếp tục →
        </Button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
