import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createUserApi,
  forgotPasswordApi,
  getAccountApi,
  loginApi,
} from "../util/api";

const initialState = {
  isAuthenticated: false,
  user: null,
  accessToken: localStorage.getItem("access_token") || "",
  loading: false,
  appLoading: true,
  error: "",
  message: "",
};

export const loginThunk = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    const res = await loginApi(email, password);
    if (res && res.EC === 0) {
      localStorage.setItem("access_token", res.access_token);
      return res;
    }
    return rejectWithValue(res?.EM || "Đăng nhập thất bại.");
  }
);

export const registerThunk = createAsyncThunk(
  "auth/register",
  async ({ name, email, password }, { rejectWithValue }) => {
    const res = await createUserApi(name, email, password);
    if (res) {
      return res;
    }
    return rejectWithValue("Đăng ký thất bại.");
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
  async ({ email }, { rejectWithValue }) => {
    const res = await forgotPasswordApi(email);
    if (res && res.EC === 0) {
      return res;
    }
    return rejectWithValue(res?.EM || "Không thể xử lý yêu cầu.");
  }
);

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
        state.message = "";
        state.isAuthenticated = true;
        state.accessToken = action.payload.access_token;
        state.user = action.payload.user;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Đăng nhập thất bại.";
        state.message = "";
      })
      .addCase(registerThunk.pending, (state) => {
        state.loading = true;
        state.error = "";
        state.message = "";
      })
      .addCase(registerThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = "";
        state.message = "";
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
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
