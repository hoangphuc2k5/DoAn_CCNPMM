const {
  createUserService,
  loginService,
  getUserService,
  getProfileService,
  updateProfileService,
} = require("../services/userService");
const { createUserService, loginService, getUserService, forgotPasswordService } = require("../services/userService");

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
  const data = await getUserService();
  return res.status(200).json(data);
};

const getAccount = async (req, res) => {
  return res.status(200).json(req.user);
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const data = await getProfileService(userId);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      EC: 1,
      EM: "Error fetching profile",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const updateData = req.body;

    // Không cho phép update email và password từ endpoint này
    delete updateData.email;
    delete updateData.password;
    delete updateData.role;

    const data = await updateProfileService(userId, updateData);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      EC: 1,
      EM: "Error updating profile",
    });
  }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const data = await forgotPasswordService(email);
    return res.status(200).json(data);
}

module.exports = {
  createUser,
  handleLogin,
  getUser,
  getAccount,
  getProfile,
  updateProfile,
};
    createUser, handleLogin, getUser, getAccount, forgotPassword
}
