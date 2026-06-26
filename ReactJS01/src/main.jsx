import React from "react";
import ReactDOM from "react-dom/client";
import {
  Button,
  Result,
} from "antd";
import { Provider, useSelector } from "react-redux";
import {
  Link,
  Navigate,
  RouterProvider,
  createBrowserRouter,
  useRouteError,
} from "react-router-dom";
import App from "./App.jsx";
import store from "./Redux/store.js";
import { SocketProvider } from "./components/context/socket.context.jsx";
import ForgotPasswordPage from "./pages/forgot-password.jsx";
import HomePage from "./pages/home.jsx";
import LoginPage from "./pages/login.jsx";
import RegisterPage from "./pages/register.jsx";
import UserPage from "./pages/user.jsx";
import UserProfilePage from "./pages/user-profile.jsx";
import SearchPage from "./pages/search.jsx";
import ChatPage from "./pages/chat.jsx";
import NotificationPage from "./pages/notifications.jsx";
import GroupsPage from "./pages/groups.jsx";
import AdminPage from "./pages/admin.jsx";
import SavedPage from "./pages/saved.jsx";
import ResetPasswordPage from "./pages/reset-password.jsx";
import SecurityPage from "./pages/security.jsx";
import VerifyEmailPage from "./pages/verify-email.jsx";
import IntroPage from "./pages/intro.jsx";
import "./styles/global.css";

const ProfileRedirect = () => {
  const { user } = useSelector((state) => state.auth);
  if (user?._id) {
    return <Navigate to={`/profile/${user._id}`} replace />;
  }
  return <Navigate to="/login" replace />;
};

const AdminRoute = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const role = String(user?.role || "").toLowerCase();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!["admin", "super_admin"].includes(role)) {
    return (
      <div className="route-error">
        <Result
          status="403"
          title="Không có quyền truy cập"
          subTitle="Tài khoản hiện tại không thuộc nhóm quản trị hệ thống."
          extra={
            <Link to="/">
              <Button type="primary">Về trang chủ</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return <AdminPage />;
};

const RouteError = () => {
  const error = useRouteError();
  return (
    <div className="route-error">
      <Result
        status="error"
        title="Có lỗi khi tải trang"
        subTitle={error?.message || "Vui lòng tải lại trang hoặc quay về bảng tin."}
        extra={
          <Link to="/">
            <Button type="primary">Về bảng tin</Button>
          </Link>
        }
      />
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "friends", element: <UserPage /> },
      { path: "user", element: <UserPage /> },
      { path: "profile", element: <ProfileRedirect /> },
      { path: "profile/:userId", element: <UserProfilePage /> },
      { path: "search", element: <SearchPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "notifications", element: <NotificationPage /> },
      { path: "saved", element: <SavedPage /> },
      { path: "groups", element: <GroupsPage /> },
      { path: "groups/:groupId", element: <GroupsPage /> },
      { path: "account/security", element: <SecurityPage /> },
      { path: "intro", element: <IntroPage /> },
      { path: "admin", element: <AdminRoute /> },
    ],
  },
  { path: "/register", element: <RegisterPage />, errorElement: <RouteError /> },
  { path: "/login", element: <LoginPage />, errorElement: <RouteError /> },
  // 2FA page removed
  { path: "/verify-email", element: <VerifyEmailPage />, errorElement: <RouteError /> },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
    errorElement: <RouteError />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
    errorElement: <RouteError />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
    </Provider>
  </React.StrictMode>,
);
