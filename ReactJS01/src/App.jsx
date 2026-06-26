import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Spin } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Sidebar from "./components/layout/sidebar";
import { Outlet } from "react-router-dom";
import Header from "./components/layout/header";
import { fetchAccountThunk } from "./Redux/authSlice";

function App() {
  const dispatch = useDispatch();
  const { appLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchAccountThunk());
  }, [dispatch]);

  if (appLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin />
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main-content">
        <Outlet />
      </main>
    <div className="min-h-screen bg-white">
      <Header />
      <Outlet />
    </div>
  );
}

export default App;
