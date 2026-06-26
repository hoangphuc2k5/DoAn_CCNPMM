import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import profileReducer from "./profileSlice";
import registerReducer from "./registerSlice";
import userProfileReducer from "./userProfileSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    register: registerReducer,
    userProfile: userProfileReducer,
  },
});

export default store;
