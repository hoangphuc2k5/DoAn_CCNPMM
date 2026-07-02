require("dotenv").config();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/user");
const Block = require("../models/block");
const DeviceSession = require("../models/deviceSession");
const { sendEmail } = require("./emailService");
const { writeAuditLog } = require("./auditService");

const saltRounds = 10;
const OTP_EXPIRE_MINUTES = 10;

const normalizeRole = (role) => String(role || "user").toLowerCase();
const normalizeStatus = (status) => String(status || "active").toLowerCase();
const hashCode = (value = "") =>
  crypto.createHash("sha256").update(String(value)).digest("hex");
const createOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));
const addMinutes = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

const getDeviceId = (context = {}) =>
  String(
    context.deviceId ||
      context.headers?.["x-device-id"] ||
      context.headers?.["x-device"] ||
      `${context.userAgent || "unknown-device"}::${context.ipAddress || "unknown-ip"}`,
  );

const createAccessToken = (user) =>
  jwt.sign(
    {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: normalizeRole(user.role),
      avatar: user.avatar,
      status: normalizeStatus(user.status),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "1d",
    },
  );

const createTempToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });

const publicUser = (user) => ({
  _id: user._id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
  coverPhoto: user.coverPhoto,
  bio: user.bio,
  role: normalizeRole(user.role),
  status: normalizeStatus(user.status),
  isEmailVerified: Boolean(user.isEmailVerified),
  authProvider: user.authProvider || "local",
});

const sanitizeText = (value = "") =>
  String(value)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .trim();

const MAX_BIO_CHARS = 500;
const PHONE_REGEX = /^(?:0\d{9,10}|\+84\d{9})$/;

const normalizePhone = (value = "") => String(value).replace(/[\s-]/g, "").trim();

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const persistDeviceSession = async (user, context = {}) => {
  const deviceId = getDeviceId(context);
  await DeviceSession.findOneAndUpdate(
    { user: user._id, deviceId },
    {
      user: user._id,
      deviceId,
      ipAddress: context.ipAddress || "",
      userAgent: context.userAgent || "",
      isActive: true,
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return deviceId;
};

const sendOtpEmail = async ({ to, code, purpose }) => {
  const subjects = {
    verify_email: "Ma xac thuc email Tegram",
    reset_password: "Ma dat lai mat khau Tegram",
    two_factor: "Ma xac minh 2 lop Tegram",
  };

  const labels = {
    verify_email: "xac thuc email",
    reset_password: "dat lai mat khau",
    two_factor: "dang nhap 2 lop",
  };

  return sendEmail({
    to,
    subject: subjects[purpose] || "Ma OTP Tegram",
    text: `Xin chao,\n\nMa OTP de ${labels[purpose] || "xac minh tai khoan"} cua ban la: ${code}\nMa co hieu luc trong ${OTP_EXPIRE_MINUTES} phut.\n\nNeu ban khong thuc hien thao tac nay, vui long bo qua email nay.`,
  });
};

const sendVerificationCodeToUser = async (user) => {
  const code = createOtpCode();
  user.emailVerificationCodeHash = hashCode(code);
  user.emailVerificationExpiresAt = addMinutes(OTP_EXPIRE_MINUTES);
  await user.save();
  await sendOtpEmail({ to: user.email, code, purpose: "verify_email" });
};

const sendResetCodeToUser = async (user) => {
  const code = createOtpCode();
  user.passwordResetCodeHash = hashCode(code);
  user.passwordResetExpiresAt = addMinutes(OTP_EXPIRE_MINUTES);
  await user.save();
  await sendOtpEmail({ to: user.email, code, purpose: "reset_password" });
};


const issueLoginResult = async (user, context = {}) => {
  user.failedLoginAttempts = 0;
  user.lastLoginAt = new Date();
  await user.save();
  const deviceId = await persistDeviceSession(user, context);
  const access_token = createAccessToken(user);

  await writeAuditLog({
    actor: user._id,
    action: "auth.login.success",
    targetType: "user",
    targetId: String(user._id),
    metadata: { deviceId },
    ipAddress: context.ipAddress || "",
    userAgent: context.userAgent || "",
  });

  return {
    EC: 0,
    access_token,
    device_id: deviceId,
    user: publicUser(user),
  };
};

const createUserService = async (name, email, password, context = {}) => {
  try {
    const safeName = sanitizeText(name);
    const safeEmail = String(email || "").trim().toLowerCase();

    if (!safeName || !safeEmail || !password) {
      return { EC: 1, EM: "Vui lòng nhập đầy đủ thông tin." };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      return { EC: 1, EM: "Email không đúng định dạng." };
    }

    if (password.length < 6) {
      return { EC: 1, EM: "Mật khẩu phải có ít nhất 6 ký tự." };
    }

    const user = await User.findOne({ email: safeEmail, deletedAt: null });
    if (user) {
      return { EC: 1, EM: "Email đã tồn tại." };
    }

    const hashPassword = await bcrypt.hash(password, saltRounds);
    const result = await User.create({
      name: safeName,
      email: safeEmail,
      password: hashPassword,
      role: "user",
      status: "active",
      authProvider: "local",
      isEmailVerified: false,
    });

    await sendVerificationCodeToUser(result);
    await writeAuditLog({
      actor: result._id,
      action: "auth.register",
      targetType: "user",
      targetId: String(result._id),
      ipAddress: context.ipAddress || "",
      userAgent: context.userAgent || "",
    });

    return {
      EC: 0,
      EM: "Đăng ký thành công. OTP xác thực email đã được gửi.",
      data: publicUser(result),
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi đăng ký." };
  }
};

const loginService = async (email, password, context = {}) => {
  try {
    const safeEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: safeEmail, deletedAt: null }).select(
      "+emailVerificationCodeHash +emailVerificationExpiresAt",
    );

    if (!user) {
      return { EC: 1, EM: "Email hoặc mật khẩu không hợp lệ." };
    }

    if (["banned", "suspended"].includes(normalizeStatus(user.status))) {
      return { EC: 1, EM: "Tài khoản hiện đang bị khóa." };
    }

    const isMatchPassword = await bcrypt.compare(password, user.password);
    if (!isMatchPassword) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      await user.save();
      await writeAuditLog({
        actor: user._id,
        action: "auth.login.failed",
        targetType: "user",
        targetId: String(user._id),
        ipAddress: context.ipAddress || "",
        userAgent: context.userAgent || "",
      });
      return { EC: 2, EM: "Email hoặc mật khẩu không hợp lệ." };
    }

    if (!user.isEmailVerified) {
      const hasActiveVerificationCode =
        user.emailVerificationCodeHash &&
        user.emailVerificationExpiresAt &&
        user.emailVerificationExpiresAt > new Date();

      if (!hasActiveVerificationCode) {
        await sendVerificationCodeToUser(user);
      }

      return {
        EC: 0,
        requiresEmailVerification: true,
        email: user.email,
        EM: hasActiveVerificationCode
          ? "Tài khoản chưa xác thực email. Vui lòng nhập OTP đã gửi."
          : "Tài khoản chưa xác thực email. OTP mới đã được gửi.",
      };
    }

    return issueLoginResult(user, context);
  } catch (error) {
    console.log(error);
    return { EC: 3, EM: "Có lỗi xảy ra khi đăng nhập." };
  }
};


const verifyEmailOtpService = async (email, otp) => {
  const safeEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({ email: safeEmail, deletedAt: null }).select(
    "+emailVerificationCodeHash +emailVerificationExpiresAt",
  );

  if (!user) {
    return { EC: 1, EM: "Không tìm thấy tài khoản." };
  }

  if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
    return { EC: 1, EM: "Không có mã xác thực đang hoạt động." };
  }

  if (user.emailVerificationExpiresAt < new Date()) {
    return { EC: 1, EM: "Mã OTP đã hết hạn." };
  }

  if (hashCode(otp) !== user.emailVerificationCodeHash) {
    return { EC: 1, EM: "Mã OTP không chính xác." };
  }

  user.isEmailVerified = true;
  user.emailVerificationCodeHash = "";
  user.emailVerificationExpiresAt = null;
  await user.save();

  return { EC: 0, EM: "Xác thực email thành công.", data: publicUser(user) };
};

const resendVerificationOtpService = async (email) => {
  const safeEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({ email: safeEmail, deletedAt: null });
  if (!user) {
    return { EC: 1, EM: "Không tìm thấy tài khoản." };
  }

  await sendVerificationCodeToUser(user);
  return { EC: 0, EM: "Đã gửi lại OTP xác thực email." };
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
      deletedAt: null,
    }).select("-password");
  } catch (error) {
    console.log(error);
    return [];
  }
};

const getProfileService = async (userId) => {
  try {
    const user = await User.findOne({ _id: userId, deletedAt: null }).select("-password");
    if (!user) {
      return { EC: 1, EM: "Không tìm thấy người dùng." };
    }
    return { EC: 0, data: user };
  } catch (error) {
    console.log(error);
    return { EC: 1, EM: "Không thể tải hồ sơ." };
  }
};

const updateProfileService = async (userId, updateData) => {
  try {
    const safeUpdate = {
      ...updateData,
      name: updateData.name !== undefined ? sanitizeText(updateData.name) : undefined,
      bio: updateData.bio !== undefined ? sanitizeText(updateData.bio) : undefined,
      address: updateData.address !== undefined ? sanitizeText(updateData.address) : undefined,
      phone: updateData.phone !== undefined ? sanitizeText(updateData.phone) : undefined,
      avatar: updateData.avatar !== undefined ? sanitizeText(updateData.avatar) : undefined,
      coverPhoto:
        updateData.coverPhoto !== undefined ? sanitizeText(updateData.coverPhoto) : undefined,
    };

    Object.keys(safeUpdate).forEach((key) => safeUpdate[key] === undefined && delete safeUpdate[key]);

    if (safeUpdate.phone !== undefined) {
      const normalizedPhone = normalizePhone(safeUpdate.phone);
      if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
        return { EC: 1, EM: "Số điện thoại không đúng định dạng." };
      }
      safeUpdate.phone = normalizedPhone;
    }

    if (safeUpdate.bio !== undefined && safeUpdate.bio.length > MAX_BIO_CHARS) {
      return { EC: 1, EM: `Tiểu sử chỉ được tối đa ${MAX_BIO_CHARS} ký tự.` };
    }

    if (safeUpdate.dateOfBirth !== undefined) {
      const rawDate = String(safeUpdate.dateOfBirth || "").trim();

      if (!rawDate) {
        safeUpdate.dateOfBirth = null;
      } else {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(rawDate)) {
          return { EC: 1, EM: "Ngày sinh không hợp lệ." };
        }

        const [year, month, day] = rawDate.split("-").map(Number);
        const parsedDate = new Date(year, month - 1, day);
        if (
          parsedDate.getFullYear() !== year ||
          parsedDate.getMonth() + 1 !== month ||
          parsedDate.getDate() !== day
        ) {
          return { EC: 1, EM: "Ngày sinh không hợp lệ." };
        }

        if (rawDate > getLocalDateString()) {
          return { EC: 1, EM: "Ngày sinh không được ở trong tương lai." };
        }
        safeUpdate.dateOfBirth = parsedDate;
      }
    }

    const user = await User.findOneAndUpdate({ _id: userId, deletedAt: null }, safeUpdate, {
      new: true,
    }).select("-password");

    if (!user) {
      return { EC: 1, EM: "Không tìm thấy người dùng." };
    }

    return {
      EC: 0,
      EM: "Cập nhật hồ sơ thành công.",
      data: user,
    };
  } catch (error) {
    console.log(error);
    return { EC: 1, EM: "Không thể cập nhật hồ sơ." };
  }
};

const forgotPasswordService = async (email) => {
  try {
    const safeEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: safeEmail, deletedAt: null });
    if (!user) {
      return { EC: 1, EM: "Email không tồn tại." };
    }

    await sendResetCodeToUser(user);
    await writeAuditLog({
      actor: user._id,
      action: "auth.password_reset.request",
      targetType: "user",
      targetId: String(user._id),
    });

    return {
      EC: 0,
      EM: "OTP đặt lại mật khẩu đã được gửi đến email của bạn.",
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra." };
  }
};

const resetPasswordService = async (email, otp, newPassword) => {
  const safeEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({ email: safeEmail, deletedAt: null }).select(
    "+passwordResetCodeHash +passwordResetExpiresAt",
  );

  if (!user) {
    return { EC: 1, EM: "Không tìm thấy tài khoản." };
  }

  if (!newPassword || newPassword.length < 6) {
    return { EC: 1, EM: "Mật khẩu mới phải có ít nhất 6 ký tự." };
  }

  if (!user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
    return { EC: 1, EM: "Không có OTP đặt lại mật khẩu đang hoạt động." };
  }

  if (user.passwordResetExpiresAt < new Date()) {
    return { EC: 1, EM: "OTP đặt lại mật khẩu đã hết hạn." };
  }

  if (hashCode(otp) !== user.passwordResetCodeHash) {
    return { EC: 1, EM: "OTP đặt lại mật khẩu không chính xác." };
  }

  user.password = await bcrypt.hash(newPassword, saltRounds);
  user.passwordResetCodeHash = "";
  user.passwordResetExpiresAt = null;
  await user.save();

  await writeAuditLog({
    actor: user._id,
    action: "auth.password_reset.complete",
    targetType: "user",
    targetId: String(user._id),
  });

  return { EC: 0, EM: "Đặt lại mật khẩu thành công." };
};

const changePasswordService = async (userId, currentPassword, newPassword) => {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) {
    return { EC: 1, EM: "Không tìm thấy tài khoản." };
  }

  if (!newPassword || newPassword.length < 6) {
    return { EC: 1, EM: "Mật khẩu mới phải có ít nhất 6 ký tự." };
  }

  const isMatchPassword = await bcrypt.compare(currentPassword || "", user.password);
  if (!isMatchPassword) {
    return { EC: 1, EM: "Mật khẩu hiện tại không chính xác." };
  }

  user.password = await bcrypt.hash(newPassword, saltRounds);
  await user.save();

  return { EC: 0, EM: "Đổi mật khẩu thành công." };
};

const deleteAccountService = async (userId, password) => {
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) {
    return { EC: 1, EM: "Không tìm thấy tài khoản." };
  }

  const isMatchPassword = await bcrypt.compare(password || "", user.password);
  if (!isMatchPassword) {
    return { EC: 1, EM: "Mật khẩu không chính xác." };
  }

  user.deletedAt = new Date();
  user.status = "suspended";
  await user.save();
  await DeviceSession.updateMany({ user: user._id }, { isActive: false, lastSeenAt: new Date() });

  return { EC: 0, EM: "Tài khoản đã được xóa." };
};

const logoutService = async (userId, deviceId) => {
  if (deviceId) {
    await DeviceSession.findOneAndUpdate({ user: userId, deviceId }, { isActive: false });
  } else {
    await DeviceSession.updateMany({ user: userId }, { isActive: false });
  }
  return { EC: 0, EM: "Đăng xuất thành công." };
};

const getDeviceHistoryService = async (userId) => {
  const sessions = await DeviceSession.find({ user: userId })
    .sort({ lastSeenAt: -1 })
    .lean();
  return { EC: 0, data: sessions };
};


module.exports = {
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
};
