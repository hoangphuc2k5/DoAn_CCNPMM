const {
  createUserService,
  forgotPasswordService,
  getProfileService,
  getUserService,
  loginService,
  updateProfileService,
} = require("../services/userService");

const createUser = async (req, res) => {
  const { name, email, password } = req.body;
  const data = await createUserService(name, email, password);
  return res.status(200).json(data);
};

const handleLogin = async (req, res) => {
  const { email, password } = req.body;
  const data = await loginService(email, password);
  return res.status(200).json(data);
};

const getUser = async (req, res) => {
  const data = await getUserService(req.user?._id);
  return res.status(200).json(data);
};

const getAccount = async (req, res) => {
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
  const { email } = req.body;
  const data = await forgotPasswordService(email);
  return res.status(200).json(data);
};

module.exports = {
  createUser,
  forgotPassword,
  getAccount,
  getProfile,
  getUser,
  handleLogin,
  updateProfile,
};
