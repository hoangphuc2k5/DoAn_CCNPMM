import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Spin } from "antd";
import { fetchAccountThunk } from "../Redux/authSlice";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, appLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) dispatch(fetchAccountThunk());
  }, [dispatch, user]);

  useEffect(() => {
    if (user && user._id) {
      navigate(`/profile/${user._id}`, { replace: true });
    }
  }, [navigate, user]);

  if (appLoading && !user) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  return null;
};

export default ProfilePage;
