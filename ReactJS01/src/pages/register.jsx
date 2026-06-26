import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { fetchCaptchaThunk, registerThunk } from "../Redux/authSlice";

const RegisterPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, captcha } = useSelector((state) => state.auth);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    captchaAnswer: "",
  });
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    dispatch(fetchCaptchaThunk());
  }, [dispatch]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (!formState.name.trim() || !formState.email.trim() || !formState.password) {
      setLocalError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
      setLocalError("Email không đúng định dạng.");
      return;
    }

    if (formState.password.length < 6) {
      setLocalError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (!formState.captchaAnswer.trim()) {
      setLocalError("Vui lòng nhập CAPTCHA để tiếp tục.");
      return;
    }

    const result = await dispatch(
      registerThunk({
        name: formState.name.trim(),
        email: formState.email.trim(),
        password: formState.password,
        captchaAnswer: formState.captchaAnswer,
        captchaToken: captcha?.challengeToken,
      }),
    );

    if (registerThunk.fulfilled.match(result)) {
      navigate(`/verify-email?email=${encodeURIComponent(formState.email.trim())}`);
    }
  };

  return (
    <AuthLayout
      title="Tạo tài khoản mới"
      subtitle="Đăng ký để bắt đầu sử dụng feed, chat, thông báo và khu vực cộng đồng."
      showGoogleButton={false}
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
          label="Họ và tên"
          name="name"
          value={formState.name}
          onChange={handleChange}
          placeholder="Nguyễn Văn A"
        />
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
          placeholder="Tối thiểu 6 ký tự"
        />
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-4">
          <div className="text-sm font-semibold text-slate-700">Xác nhận bạn không phải robot</div>
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
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
