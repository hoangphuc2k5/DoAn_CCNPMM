import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { useDispatch, useSelector } from "react-redux";
import Header from "./components/layout/header";
import { fetchAccountThunk } from "./Redux/authSlice";

function App() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { appLoading } = useSelector((state) => state.auth);
  const hideHeader = location.pathname.startsWith("/groups");

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
    <>
      {hideHeader ? null : <Header />}
      <Outlet />
    </>
  );
}

export default App;
