import React, { createContext, useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import io from "socket.io-client";

const SocketContext = createContext({
  socket: null,
  onlineUsers: [],
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    let socketInstance = null;

    if (isAuthenticated) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8888";
      const token = localStorage.getItem("access_token");

      socketInstance = io(backendUrl, {
        auth: { token },
      });

      setSocket(socketInstance);

      // Listeners
      socketInstance.on("connect", () => {
        console.log("Socket connected successfully");
      });

      socketInstance.on("get_online_users", (users) => {
        setOnlineUsers(users);
      });

      socketInstance.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setOnlineUsers([]);
      }
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
