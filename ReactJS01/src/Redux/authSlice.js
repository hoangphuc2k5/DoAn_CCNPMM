import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  changePasswordApi,
  createUserApi,
  forgotPasswordApi,
  getCaptchaApi,
  getAccountApi,
  getDeviceHistoryApi,
  loginApi,
  logoutApi,
  resendVerifyEmailOtpApi,
  resetPasswordApi,
  verifyEmailOtpApi,
  
} from "../util/api";

const initialState = {
  isAuthenticated: false,
  user: null,
  accessToken: localStorage.getItem("access_token") || "",
  loading: false,
  appLoading: true,
  error: "",
  message: "",
  captcha: null,
  // tempToken removed (2FA disabled)
  pendingVerificationEmail: "",
  deviceHistory: [],
};

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    const res = await loginApi(payload);
    if (res && res.EC === 0) {
      if (res.access_token) {
        localStorage.setItem("access_token", res.access_token);
      }
      return res;
    }
    return rejectWithValue(res?.EM || "Đăng nhập thất bại.");
  }
);



export const registerThunk = createAsyncThunk(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    const res = await createUserApi(payload);
    if (res && res.EC === 0) {
      return res;
    }
    return rejectWithValue(res?.EM || "Đăng ký thất bại.");
  }
);

export const fetchAccountThunk = createAsyncThunk(
  "auth/fetchAccount",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return rejectWithValue("Chưa có token.");
    }
    const res = await getAccountApi();
    if (res && !res.message) {
      return res;
    }
    return rejectWithValue(res?.message || "Không thể lấy thông tin.");
  }
);

export const forgotPasswordThunk = createAsyncThunk(
  "auth/forgotPassword",
  async (payload, { rejectWithValue }) => {
    const res = await forgotPasswordApi(payload);
    if (res && res.EC === 0) {
      return res;
    }
    return rejectWithValue(res?.EM || "Không thể xử lý yêu cầu.");
  }
);

export const resetPasswordThunk = createAsyncThunk(
  "auth/resetPassword",
  async (payload, { rejectWithValue }) => {
    const res = await resetPasswordApi(payload);
    if (res && res.EC === 0) return res;
    return rejectWithValue(res?.EM || "Không thể đặt lại mật khẩu.");
  },
);

export const verifyEmailThunk = createAsyncThunk(
  "auth/verifyEmail",
  async ({ email, otp }, { rejectWithValue }) => {
    const res = await verifyEmailOtpApi(email, otp);
    if (res && res.EC === 0) return res;
    return rejectWithValue(res?.EM || "Không thể xác thực email.");
  },
);

export const resendVerifyEmailThunk = createAsyncThunk(
  "auth/resendVerifyEmail",
  async ({ email }, { rejectWithValue }) => {
    const res = await resendVerifyEmailOtpApi(email);
    if (res && res.EC === 0) return res;
    return rejectWithValue(res?.EM || "Không thể gửi lại OTP.");
  },
);

export const verifyTwoFactorThunk = createAsyncThunk(
  "auth/verifyTwoFactor",
  async ({ tempToken, otp }, { rejectWithValue }) => {
    // 2FA removed
    return rejectWithValue("2FA disabled");
  },
);

export const fetchCaptchaThunk = createAsyncThunk(
  "auth/fetchCaptcha",
  async (_, { rejectWithValue }) => {
    const res = await getCaptchaApi();
    if (res && res.EC === 0) return res.data;
    return rejectWithValue(res?.EM || "Không thể tải CAPTCHA.");
  },
);

export const changePasswordThunk = createAsyncThunk(
  "auth/changePassword",
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    const res = await changePasswordApi(currentPassword, newPassword);
    if (res && res.EC === 0) return res;
    return rejectWithValue(res?.EM || "Không thể đổi mật khẩu.");
  },
);

export const toggleTwoFactorThunk = createAsyncThunk(
  "auth/toggleTwoFactor",
  async ({ enabled, password }, { rejectWithValue }) => {
    // 2FA removed
    return rejectWithValue("2FA disabled");
  },
);

export const fetchDeviceHistoryThunk = createAsyncThunk(
  "auth/deviceHistory",
  async (_, { rejectWithValue }) => {
    const res = await getDeviceHistoryApi();
    if (res && res.EC === 0) return res.data;
    return rejectWithValue(res?.EM || "Không thể tải lịch sử thiết bị.");
  },
);

export const logoutThunk = createAsyncThunk("auth/logoutThunk", async () => {
  await logoutApi();
  return true;
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem("access_token");
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = "";
      state.error = "";
      state.message = "";
      state.tempToken = "";
      state.pendingVerificationEmail = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = "";
        state.message = "";
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.error = "";
        state.message = action.payload.EM || "";
        if (action.payload.requiresEmailVerification) {
          localStorage.removeItem("access_token");
          state.isAuthenticated = false;
          state.accessToken = "";
          state.user = null;
          state.pendingVerificationEmail = action.payload.email || "";
        } else {
          state.isAuthenticated = true;
          state.accessToken = action.payload.access_token;
          state.user = action.payload.user;
          state.pendingVerificationEmail = "";
        }
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        localStorage.removeItem("access_token");
        state.error = action.payload || "Đăng nhập thất bại.";
        state.message = "";
        state.pendingVerificationEmail = "";
      })
      .addCase(registerThunk.pending, (state) => {
        state.loading = true;
        state.error = "";
        state.message = "";
      })
      .addCase(registerThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = "";
        state.pendingVerificationEmail = "";
        state.message = "Đăng ký thành công. Vui lòng kiểm tra email để nhập OTP xác thực.";
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Đăng ký thất bại.";
        state.message = "";
      })
      .addCase(fetchAccountThunk.pending, (state) => {
        state.appLoading = true;
      })
      .addCase(fetchAccountThunk.fulfilled, (state, action) => {
        state.appLoading = false;
        state.error = "";
        state.isAuthenticated = true;
        state.user = {
          _id: action.payload._id,
          email: action.payload.email,
          name: action.payload.name,
          avatar: action.payload.avatar,
          role: action.payload.role,
          status: action.payload.status,
          isEmailVerified: action.payload.isEmailVerified,
          createdBy: action.payload.createdBy,
        };
      })
      .addCase(fetchAccountThunk.rejected, (state, action) => {
        state.appLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload === "Chưa có token." ? "" : action.payload || "Không thể lấy thông tin.";
        localStorage.removeItem("access_token");
      })
      .addCase(forgotPasswordThunk.pending, (state) => {
        state.loading = true;
        state.error = "";
        state.message = "";
      })
      .addCase(forgotPasswordThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.error = "";
        state.message = action.payload.EM || "Đã gửi yêu cầu.";
      })
      .addCase(forgotPasswordThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Không thể xử lý yêu cầu.";
      })
      .addCase(resetPasswordThunk.pending, (state) => {
        state.loading = true;
        state.error = "";
        state.message = "";
      })
      .addCase(resetPasswordThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.EM || "Đặt lại mật khẩu thành công.";
      })
      .addCase(resetPasswordThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Không thể đặt lại mật khẩu.";
      })
      .addCase(verifyEmailThunk.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(verifyEmailThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingVerificationEmail = "";
        state.message = action.payload.EM || "Xác thực email thành công.";
      })
      .addCase(verifyEmailThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Không thể xác thực email.";
      })
      .addCase(resendVerifyEmailThunk.fulfilled, (state, action) => {
        state.message = action.payload.EM || "Đã gửi lại OTP.";
      })
      .addCase(resendVerifyEmailThunk.rejected, (state, action) => {
        state.error = action.payload || "Không thể gửi lại OTP.";
      })
      
      .addCase(fetchCaptchaThunk.fulfilled, (state, action) => {
        state.captcha = action.payload;
      })
      .addCase(changePasswordThunk.pending, (state) => {
        state.loading = true;
        state.error = "";
        state.message = "";
      })
      .addCase(changePasswordThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.EM || "Đổi mật khẩu thành công.";
      })
      .addCase(changePasswordThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Không thể đổi mật khẩu.";
      })
      
      .addCase(fetchDeviceHistoryThunk.fulfilled, (state, action) => {
        state.deviceHistory = action.payload || [];
      })
      .addCase(fetchDeviceHistoryThunk.rejected, (state, action) => {
        state.error = action.payload || "Không thể tải lịch sử thiết bị.";
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        localStorage.removeItem("access_token");
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = "";
        state.error = "";
        state.message = "";
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
