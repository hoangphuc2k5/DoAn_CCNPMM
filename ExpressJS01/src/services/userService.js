require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Block = require("../models/block");

const saltRounds = 10;

const createUserService = async (name, email, password) => {
  try {
    if (!name || !email || !password) {
      return { EC: 1, EM: "Vui lòng nhập đầy đủ thông tin" };
    }

    const user = await User.findOne({ email });
    if (user) {
      return { EC: 1, EM: "Email đã tồn tại" };
    }

    const hashPassword = await bcrypt.hash(password, saltRounds);
    const result = await User.create({
      name,
      email,
      password: hashPassword,
      role: "User",
    });

    return {
      EC: 0,
      EM: "Đăng ký thành công",
      data: {
        _id: result._id,
        name: result.name,
        email: result.email,
        role: result.role,
      },
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi đăng ký" };
  }
};

const loginService = async (email, password) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return { EC: 1, EM: "Email hoặc mật khẩu không hợp lệ" };
    }

    const isMatchPassword = await bcrypt.compare(password, user.password);
    if (!isMatchPassword) {
      return { EC: 2, EM: "Email hoặc mật khẩu không hợp lệ" };
    }

    const payload = {
      _id: user._id,
      email: user.email,
      name: user.name,
    };

    const access_token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    });

    return {
      EC: 0,
      access_token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    };
  } catch (error) {
    console.log(error);
    return { EC: 3, EM: "Có lỗi xảy ra khi đăng nhập" };
  }
};

const getUserService = async (currentUserId) => {
  try {
    const blockedRelations = currentUserId
      ? await Block.find({
          $or: [{ blocker: currentUserId }, { blocked: currentUserId }],
        })
      : [];
    const hiddenUserIds = blockedRelations.flatMap((item) => [
      item.blocker.toString(),
      item.blocked.toString(),
    ]);

    return await User.find({
      _id: { $nin: hiddenUserIds.filter((id) => id !== String(currentUserId)) },
    }).select("-password");
  } catch (error) {
    console.log(error);
    return [];
  }
};

const getProfileService = async (userId) => {
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return { EC: 1, EM: "Không tìm thấy người dùng" };
    }
    return { EC: 0, data: user };
  } catch (error) {
    console.log(error);
    return { EC: 1, EM: "Không thể tải hồ sơ" };
  }
};

const updateProfileService = async (userId, updateData) => {
  try {
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");

    if (!user) {
      return { EC: 1, EM: "Không tìm thấy người dùng" };
    }

    return {
      EC: 0,
      EM: "Cập nhật hồ sơ thành công",
      data: user,
    };
  } catch (error) {
    console.log(error);
    return { EC: 1, EM: "Không thể cập nhật hồ sơ" };
  }
};

const forgotPasswordService = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return { EC: 1, EM: "Email không tồn tại" };
    }

    return {
      EC: 0,
      EM: "Yêu cầu khôi phục đã được ghi nhận",
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra" };
  }
};

module.exports = {
  createUserService,
  forgotPasswordService,
  getProfileService,
  getUserService,
  loginService,
  updateProfileService,
};
