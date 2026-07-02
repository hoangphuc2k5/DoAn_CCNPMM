import { useEffect } from "react";
import { Spin } from "antd";
import { Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Sidebar from "./components/layout/sidebar";
import CallNotification from "./components/CallNotification";
import { fetchAccountThunk } from "./Redux/authSlice";

function App() {
  const dispatch = useDispatch();
  const { appLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchAccountThunk());
  }, [dispatch]);

  if (appLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
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
      <CallNotification />
    </div>
  );
}

export default App;
