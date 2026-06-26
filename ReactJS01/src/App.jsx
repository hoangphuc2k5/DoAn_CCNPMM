import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import Header from "./components/layout/header";
import { fetchAccountThunk } from "./Redux/authSlice";

function App() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { appLoading } = useSelector((state) => state.auth);
  const hideHeader = location.pathname.startsWith("/groups");
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
    <>
      {hideHeader ? null : <Header />}
      <Outlet />
    </>
    <div className="min-h-screen bg-white">
      <Header />
      <Outlet />
    </div>
  );
}

export default App;
