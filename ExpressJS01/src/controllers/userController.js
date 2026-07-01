const {
  changePasswordService,
  createUserService,
  deleteAccountService,
  forgotPasswordService,
  getDeviceHistoryService,
  getProfileService,
  getUserService,
  loginService,
  logoutService,
  resendVerificationOtpService,
  resetPasswordService,
  updateProfileService,
  verifyEmailOtpService,
} = require("../services/userService");
const {
  createCaptchaChallenge,
  verifyCaptchaChallenge,
} = require("../services/captchaService");

const createUser = async (req, res) => {
  const { name, email, password, captchaAnswer, captchaToken } = req.body;
  if (!verifyCaptchaChallenge(captchaToken, captchaAnswer)) {
    return res.status(200).json({ EC: 1, EM: "CAPTCHA không hợp lệ." });
  }
  const data = await createUserService(name, email, password, {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    headers: req.headers,
  });
  return res.status(200).json(data);
};

const handleLogin = async (req, res) => {
  const { email, password, captchaAnswer, captchaToken } = req.body;
  if (captchaToken && !verifyCaptchaChallenge(captchaToken, captchaAnswer)) {
    return res.status(200).json({ EC: 1, EM: "CAPTCHA không hợp lệ." });
  }
  const data = await loginService(email, password, {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    headers: req.headers,
  });
  return res.status(200).json(data);
};




const getUser = async (req, res) => {
  const data = await getUserService(req.user?._id);
  return res.status(200).json(data);
};

const getAccount = async (req, res) => {
  const data = await getProfileService(req.user._id);
  if (data?.EC === 0) {
    return res.status(200).json(data.data);
  }
  return res.status(200).json(req.user);
};

const getProfile = async (req, res) => {
  const data = await getProfileService(req.user._id);
  return res.status(200).json(data);
};

const updateProfile = async (req, res) => {
  const updateData = { ...req.body };
  delete updateData.email;
  delete updateData.password;
  delete updateData.role;

  const data = await updateProfileService(req.user._id, updateData);
  return res.status(200).json(data);
};

const forgotPassword = async (req, res) => {
  const { email, captchaAnswer, captchaToken } = req.body;
  if (!verifyCaptchaChallenge(captchaToken, captchaAnswer)) {
    return res.status(200).json({ EC: 1, EM: "CAPTCHA không hợp lệ." });
  }
  const data = await forgotPasswordService(email);
  return res.status(200).json(data);
};

const getCaptcha = async (_req, res) => {
  return res.status(200).json(createCaptchaChallenge());
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const data = await resetPasswordService(email, otp, newPassword);
  return res.status(200).json(data);
};

const verifyEmailOtp = async (req, res) => {
  const { email, otp } = req.body;
  const data = await verifyEmailOtpService(email, otp);
  return res.status(200).json(data);
};

const resendVerificationOtp = async (req, res) => {
  const { email } = req.body;
  const data = await resendVerificationOtpService(email);
  return res.status(200).json(data);
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const data = await changePasswordService(req.user._id, currentPassword, newPassword);
  return res.status(200).json(data);
};

const deleteAccount = async (req, res) => {
  const { password } = req.body;
  const data = await deleteAccountService(req.user._id, password);
  return res.status(200).json(data);
};

const logout = async (req, res) => {
  const data = await logoutService(req.user._id, req.headers["x-device-id"]);
  return res.status(200).json(data);
};

const getDeviceHistory = async (req, res) => {
  const data = await getDeviceHistoryService(req.user._id);
  return res.status(200).json(data);
};


module.exports = {
  changePassword,
  createUser,
  deleteAccount,
  forgotPassword,
  getCaptcha,
  getAccount,
  getDeviceHistory,
  getProfile,
  getUser,
  handleLogin,
  logout,
  resendVerificationOtp,
  resetPassword,
  updateProfile,
  verifyEmailOtp,
};
