import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  Link,
  RouterProvider,
  useRouteError,
  Navigate,
} from "react-router-dom";
import { Button, Result, Spin } from "antd";
import { Provider } from "react-redux";
import { useSelector } from "react-redux";
import App from "./App.jsx";
import store from "./Redux/store.js";
import "./styles/global.css";
import { SocketProvider } from "./components/context/socket.context.jsx";

const ForgotPasswordPage = lazy(() => import("./pages/forgot-password.jsx"));
const HomePage = lazy(() => import("./pages/home.jsx"));
const LoginPage = lazy(() => import("./pages/login.jsx"));
const RegisterPage = lazy(() => import("./pages/register.jsx"));
const UserPage = lazy(() => import("./pages/user.jsx"));
const UserProfilePage = lazy(() => import("./pages/user-profile.jsx"));
const SearchPage = lazy(() => import("./pages/search.jsx"));
const ChatPage = lazy(() => import("./pages/chat.jsx"));
const GroupsPage = lazy(() => import("./pages/groups.jsx"));

const withSuspense = (element) => (
  <Suspense
    fallback={
      <div className="route-loading">
        <Spin />
      </div>
    }
  >
    {element}
  </Suspense>
);

const ProfileRedirect = () => {
  const { user } = useSelector((state) => state.auth);
  if (user?._id) {
    return <Navigate to={`/profile/${user._id}`} replace />;
  }
  return <Navigate to="/login" replace />;
};

const RouteError = () => {
  const error = useRouteError();

  return (
    <div className="route-error">
      <Result
        status="error"
        title="Có lỗi khi tải trang"
        subTitle={
          error?.message || "Vui lòng tải lại trang hoặc quay về bảng tin."
        }
        extra={
          <Link to="/">
            <Button type="primary">Về bảng tin</Button>
          </Link>
        }
      />
    </div>
  );
};

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      errorElement: <RouteError />,
      children: [
        {
          index: true,
          element: withSuspense(<HomePage />),
        },
        {
          path: "friends",
          element: withSuspense(<UserPage />),
        },
        {
          path: "user",
          element: withSuspense(<UserPage />),
        },
        {
          path: "profile",
          element: <ProfileRedirect />,
        },
        {
          path: "profile/:userId",
          element: withSuspense(<UserProfilePage />),
        },
        {
          path: "search",
          element: withSuspense(<SearchPage />),
        },
        {
          path: "chat",
          element: withSuspense(<ChatPage />),
        },
        {
          path: "groups",
          element: withSuspense(<GroupsPage />),
        },
        {
          path: "groups/:groupId",
          element: withSuspense(<GroupsPage />),
        },
      ],
    },
    {
      path: "register",
      element: withSuspense(<RegisterPage />),
      errorElement: <RouteError />,
    },
    {
      path: "login",
      element: withSuspense(<LoginPage />),
      errorElement: <RouteError />,
    },
    {
      path: "forgot-password",
      element: withSuspense(<ForgotPasswordPage />),
      errorElement: <RouteError />,
    },
  ],
  {
    future: {
      v7_startTransition: true,
    },
  },
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <SocketProvider>
      <RouterProvider router={router} />
    </SocketProvider>
  </Provider>,
);
