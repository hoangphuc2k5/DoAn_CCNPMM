import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createUserApi } from '../util/api';

export const registerUser = createAsyncThunk(
  'register/registerUser',
  async ({ name, email, password }, { rejectWithValue }) => {
    const response = await createUserApi(name, email, password);

    if (!response) {
      return rejectWithValue('Dang ky that bai hoac email da ton tai.');
    }

    if (response.message) {
      return rejectWithValue(response.message);
    }

    if (!response._id) {
      return rejectWithValue('Khong nhan duoc du lieu nguoi dung hop le.');
    }

    return response;
  }
);

const registerSlice = createSlice({
  name: 'register',
  initialState: {
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    resetRegister: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        state.success = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload || action.error.message || 'Dang ky that bai';
      });
  },
});

export const { resetRegister } = registerSlice.actions;
export default registerSlice.reducer;
