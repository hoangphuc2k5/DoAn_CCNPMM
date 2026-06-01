import { configureStore } from '@reduxjs/toolkit';
import registerSlice from './registerSlice';

export const store = configureStore({
  reducer: {
    register: registerSlice,
  },
});
import { configureStore } from "@reduxjs/toolkit";
import profileReducer from "./profileSlice";

const store = configureStore({
  reducer: {
    profile: profileReducer,
  },
});

export default store;
