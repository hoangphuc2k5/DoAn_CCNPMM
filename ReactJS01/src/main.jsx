import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/global.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import RegisterPage from "./pages/register.jsx";
import UserPage from "./pages/user.jsx";
import HomePage from "./pages/home.jsx";
import LoginPage from "./pages/login.jsx";
import ProfilePage from "./pages/profile.jsx";
import { AuthWrapper } from "./components/context/auth.context.jsx";

import { Provider } from "react-redux";
import store from "./redux/store.js";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "user",
        element: <UserPage />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: "register",
    element: <RegisterPage />,
  },
  {
    path: "login",
    element: <LoginPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <AuthWrapper>
        <RouterProvider router={router} />
      </AuthWrapper>
    </Provider>
  </React.StrictMode>,
);
import {
    createBrowserRouter,
    RouterProvider,
} from "react-router-dom";
import RegisterPage from './pages/register.jsx';
import UserPage from './pages/user.jsx';
import HomePage from './pages/home.jsx';
import LoginPage from './pages/login.jsx';
import { AuthWrapper } from './components/context/auth.context.jsx';
import { Provider } from 'react-redux';
import { store } from './redux/store.js';
import ForgotPasswordPage from './pages/forgot-password.jsx';
import ProfilePage from './pages/profile.jsx';
import { Provider } from 'react-redux';
import store from './Redux/store.js';

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                element: <HomePage />
            },
            {
                path: "user",
                element: <UserPage />
            },
        ]
    },
    {
        path: "register",
        element: <RegisterPage />
    },
    {
        path: "login",
        element: <LoginPage />
    },
], {
    future: {
        v7_startTransition: true
    }
});
    {
        path: "forgot-password",
        element: <ForgotPasswordPage />
    },
    {
        path: "profile",
        element: <ProfilePage />
    },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}>
            <AuthWrapper>
                <RouterProvider router={router} />
            </AuthWrapper>
            <RouterProvider router={router} />
        </Provider>
    </React.StrictMode>,
)
