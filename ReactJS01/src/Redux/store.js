import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import profileReducer from "./profileSlice";
import registerReducer from "./registerSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    register: registerReducer,
  },
});

export default store;
