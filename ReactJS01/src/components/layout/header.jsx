import React, { useContext, useState } from "react";
import {
  UsergroupAddOutlined,
  HomeOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Menu } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth.context";

const Header = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  console.log(">>> check auth: ", auth);
  const items = [
    {
      label: <Link to={"/"}>Home Page</Link>,
      key: "home",
      icon: <HomeOutlined />,
    },
    ...(auth.isAuthenticated
      ? [
          {
import React, { useState } from 'react';
import { UsergroupAddOutlined, HomeOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../Redux/authSlice';

const Header = () => {

    const navigate = useNavigate();
    const { auth, setAuth } = useContext(AuthContext);
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const items = [
        {
            label: <Link to={"/"}>Home Page</Link>,
            key: 'home',
            icon: <HomeOutlined />,
        },
        ...(isAuthenticated ? [{
            label: <Link to={"/user"}>Users</Link>,
            key: "user",
            icon: <UsergroupAddOutlined />,
          },
        ]
      : []),

    {
      label: `Welcome ${auth?.user?.email ?? ""}`,
      key: "SubMenu",
      icon: <SettingOutlined />,
      children: [
        ...(auth.isAuthenticated
          ? [
              {
                label: <Link to={"/profile"}>Profile</Link>,
                key: "profile",
              },
              {
                label: (
                  <span
                    onClick={() => {
                      localStorage.removeItem("access_token");

                      setAuth({
                        isAuthenticated: false,
                        user: {
                          email: "",
                          name: "",
                        },
                      });

                      navigate("/");
                    }}
                  >
                    Đăng xuất
                  </span>
                ),
                key: "logout",
              },
            ]
          : [
              {
                label: <Link to={"/login"}>Đăng nhập</Link>,
                key: "login",
              },
            ]),
      ],
    },
  ];
        {
            label: `Welcome ${user?.email ?? ""}`,
            key: 'SubMenu',
            icon: <SettingOutlined />,
            children: [
                ...(isAuthenticated ? [
                    {
                        label: <Link to={"/profile"}>Hồ sơ</Link>,
                        key: 'profile',
                    },
                    {
                        label: <span onClick={() => {
                            setCurrent("home");
                            dispatch(logout());
                            navigate("/");
                        }}>Đăng xuất</span>,
                        key: 'logout',
                    }
                ] : [
                    {
                        label: <Link to={"/login"}>Đăng nhập</Link>,
                        key: 'login',
                    }
                ]),
            ],
        },
    ];

    const [current, setCurrent] = useState('mail');
    const onClick = (e) => {
        setCurrent(e.key);
    };
    return <Menu onClick={onClick} selectedKeys={[current]} mode="horizontal" items={items} />;
  const [current, setCurrent] = useState("mail");
  const onClick = (e) => {
    console.log("click ", e);
    setCurrent(e.key);
  };
  return (
    <Menu
      onClick={onClick}
      selectedKeys={[current]}
      mode="horizontal"
      items={items}
    />
  );
};

export default Header;
