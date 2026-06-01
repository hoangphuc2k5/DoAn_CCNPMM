import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../util/axios.customize";

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.EM ||
    error?.response?.data?.message ||
    error?.EM ||
    error?.message ||
    fallback
  );
};

const getProfilePayload = (response, fallbackMessage) => {
  if (response?.EC === 0) {
    return response.data;
  }

  throw new Error(response?.EM || response?.message || fallbackMessage);
};

// Async thunks
export const fetchProfile = createAsyncThunk(
  "profile/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/v1/api/profile");
      return getProfilePayload(response, "Error fetching profile");
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Error fetching profile"));
    }
  },
);

export const updateProfile = createAsyncThunk(
  "profile/updateProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put("/v1/api/profile", profileData);
      return getProfilePayload(response, "Error updating profile");
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Error updating profile"));
    }
  },
);

const initialState = {
  user: null,
  loading: false,
  error: null,
  success: false,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    // Fetch Profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
        state.success = true;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      });
  },
});

export const { clearError, clearSuccess } = profileSlice.actions;
export default profileSlice.reducer;
