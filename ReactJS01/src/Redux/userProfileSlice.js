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

export const fetchUserProfile = createAsyncThunk(
  "userProfile/fetchUserProfile",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/v1/api/profile/${userId}`);
      if (response?.EC === 0) {
        return response.data;
      }
      throw new Error(response?.EM || "Error fetching profile");
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Error fetching profile"));
    }
  },
);

export const fetchUserPosts = createAsyncThunk(
  "userProfile/fetchUserPosts",
  async ({ userId, cursor }, { rejectWithValue }) => {
    try {
      const params = cursor ? { cursor } : {};
      const response = await axiosInstance.get(
        `/v1/api/profile/${userId}/posts`,
        { params },
      );
      if (response?.EC === 0) {
        return response.data;
      }
      throw new Error(response?.EM || "Error fetching posts");
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Error fetching posts"));
    }
  },
);

export const fetchUserFriends = createAsyncThunk(
  "userProfile/fetchUserFriends",
  async ({ userId, limit = 10, skip = 0 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/v1/api/profile/${userId}/friends`,
        {
          params: { limit, skip },
        },
      );
      if (response?.EC === 0) {
        return response.data;
      }
      throw new Error(response?.EM || "Error fetching friends");
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Error fetching friends"));
    }
  },
);

export const fetchUserFollowers = createAsyncThunk(
  "userProfile/fetchUserFollowers",
  async ({ userId, limit = 10, skip = 0 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/v1/api/profile/${userId}/followers`,
        {
          params: { limit, skip },
        },
      );
      if (response?.EC === 0) {
        return response.data;
      }
      throw new Error(response?.EM || "Error fetching followers");
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Error fetching followers"),
      );
    }
  },
);

export const fetchUserMedia = createAsyncThunk(
  "userProfile/fetchUserMedia",
  async ({ userId, cursor }, { rejectWithValue }) => {
    try {
      const params = cursor ? { cursor } : {};
      const response = await axiosInstance.get(
        `/v1/api/profile/${userId}/media`,
        { params },
      );
      if (response?.EC === 0) {
        return response.data;
      }
      throw new Error(response?.EM || "Error fetching media");
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Error fetching media"));
    }
  },
);

const initialState = {
  profileUser: null,
  posts: [],
  friends: [],
  followers: [],
  media: [],
  loading: false,
  error: null,
  activeTab: "posts",
  postsCursor: null,
  mediaCursor: null,
  postsHasNextPage: false,
  mediaHasNextPage: false,
};

const userProfileSlice = createSlice({
  name: "userProfile",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    resetUserProfile: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch User Profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profileUser = action.payload;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch User Posts
    builder
      .addCase(fetchUserPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        state.loading = false;
        const nextPosts = action.payload.posts || [];
        state.posts = action.meta.arg?.cursor ? [...state.posts, ...nextPosts] : nextPosts;
        state.postsCursor = action.payload.nextCursor;
        state.postsHasNextPage = Boolean(action.payload.hasNextPage);
        state.error = null;
      })
      .addCase(fetchUserPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch User Friends
    builder
      .addCase(fetchUserFriends.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserFriends.fulfilled, (state, action) => {
        state.loading = false;
        state.friends = action.payload.friends || [];
        state.error = null;
      })
      .addCase(fetchUserFriends.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch User Followers
    builder
      .addCase(fetchUserFollowers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserFollowers.fulfilled, (state, action) => {
        state.loading = false;
        state.followers = action.payload.followers || [];
        state.error = null;
      })
      .addCase(fetchUserFollowers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch User Media
    builder
      .addCase(fetchUserMedia.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserMedia.fulfilled, (state, action) => {
        state.loading = false;
        const nextMedia = action.payload.media || [];
        state.media = action.meta.arg?.cursor ? [...state.media, ...nextMedia] : nextMedia;
        state.mediaCursor = action.payload.nextCursor;
        state.mediaHasNextPage = Boolean(action.payload.hasNextPage);
        state.error = null;
      })
      .addCase(fetchUserMedia.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setActiveTab, resetUserProfile } =
  userProfileSlice.actions;
export default userProfileSlice.reducer;
