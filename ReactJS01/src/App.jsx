import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Spin } from "antd";
import { useDispatch, useSelector } from "react-redux";
import Sidebar from "./components/layout/sidebar";
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
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
