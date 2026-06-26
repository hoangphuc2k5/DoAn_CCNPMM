import { useEffect, useState } from "react";
import { Avatar, Button, Card, DatePicker, Form, Input, Select, Skeleton, message } from "antd";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import {
  clearError,
  clearSuccess,
  fetchProfile,
  updateProfile,
} from "../Redux/profileSlice";
import { getMediaUrl } from "../util/media";
import "./profile.css";

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { user, loading, error, success } = useSelector((state) => state.profile);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (user && isEditing) {
      form.setFieldsValue({
        ...user,
        dateOfBirth: user.dateOfBirth ? dayjs(user.dateOfBirth) : null,
      });
    }
  }, [form, isEditing, user]);

  useEffect(() => {
    if (success) {
      message.success("Cập nhật hồ sơ thành công");
      dispatch(clearSuccess());
      setIsEditing(false);
    }
  }, [dispatch, success]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [dispatch, error]);

  const handleSubmit = (values) => {
    dispatch(
      updateProfile({
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toDate() : null,
      }),
    );
  };

  if (loading && !user) {
    return (
      <div className="profile-container">
        <Card>
          <Skeleton active avatar paragraph={{ rows: 5 }} />
        </Card>
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import { fetchAccountThunk, logout } from "../Redux/authSlice";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, appLoading } = useSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    if (!user) {
      dispatch(fetchAccountThunk());
    }
  }, [dispatch, user]);

  if (appLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-black/60">
        Đang tải hồ sơ...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-[28px] border border-[#ede9fe] bg-white p-8 shadow-[0_20px_60px_rgba(127,0,253,0.08)]">
          <h2 className="text-3xl font-bold text-[#7f00fd]">Bạn chưa đăng nhập</h2>
          <p className="mt-3 text-sm text-[#6b7280]">
            Hãy đăng nhập để xem thông tin hồ sơ.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/login">
              <Button>Đăng nhập</Button>
            </Link>
            <Link to="/">
              <Button variant="ghost">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <Card
        className="profile-card"
        title={
          <div className="profile-title">
            <Avatar
              size={64}
              src={getMediaUrl(user?.avatar)}
              icon={<UserOutlined />}
            />
            <div className="profile-name">
              <h2>{user?.name || "Người dùng"}</h2>
              <p className="profile-role">{user?.email}</p>
            </div>
          </div>
        }
        extra={
          <Button onClick={() => setIsEditing((value) => !value)}>
            {isEditing ? "Huy" : "Chinh sua"}
          </Button>
        }
      >
        {isEditing ? (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="name" label="Ten" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="So dien thoai">
              <Input />
            </Form.Item>
            <Form.Item name="address" label="Dia chi">
              <Input />
            </Form.Item>
            <Form.Item name="avatar" label="Avatar URL">
              <Input />
            </Form.Item>
            <Form.Item name="gender" label="Gioi tinh">
              <Select
                options={[
                  { value: "Male", label: "Nam" },
                  { value: "Female", label: "Nữ" },
                  { value: "Other", label: "Khác" },
                ]}
              />
            </Form.Item>
            <Form.Item name="dateOfBirth" label="Ngay sinh">
              <DatePicker format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="bio" label="Tieu su">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Luu thay doi
            </Button>
          </Form>
        ) : (
          <div className="profile-grid">
            <div>
              <p className="label">Số điện thoại</p>
              <p className="value">{user?.phone || "Chưa cập nhật"}</p>
            </div>
            <div>
              <p className="label">Địa chỉ</p>
              <p className="value">{user?.address || "Chưa cập nhật"}</p>
            </div>
            <div>
              <p className="label">Giới tính</p>
              <p className="value">{user?.gender || "Other"}</p>
            </div>
            <div>
              <p className="label">Tiểu sử</p>
              <p className="value">{user?.bio || "Chưa cập nhật"}</p>
            </div>
          </div>
        )}
      </Card>
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="grid gap-8 rounded-[32px] border border-[#ede9fe] bg-white p-8 shadow-[0_20px_60px_rgba(127,0,253,0.08)] md:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#7f00fd]">Profile</p>
          <h2 className="mt-4 text-3xl font-bold text-[#111827]">
            Xin chào, {user?.name || "bạn"}
          </h2>
          <p className="mt-3 text-sm text-[#6b7280]">
            Đây là không gian quản lý cá nhân, cập nhật thông tin và theo dõi phiên đăng nhập.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => dispatch(fetchAccountThunk())}>
              Làm mới
            </Button>
            <Button variant="ghost" onClick={() => dispatch(logout())}>
              Đăng xuất
            </Button>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <div className="rounded-2xl border border-[#ede9fe] bg-[#faf7ff] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6b7280]">Email</p>
            <p className="mt-2 text-base font-semibold text-[#111827]">{user?.email}</p>
          </div>
          <div className="rounded-2xl border border-[#ede9fe] bg-[#faf7ff] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6b7280]">Tên hiển thị</p>
            <p className="mt-2 text-base font-semibold text-[#111827]">{user?.name}</p>
          </div>
          <div className="rounded-2xl border border-[#ede9fe] bg-[#faf7ff] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6b7280]">Nguồn tạo</p>
            <p className="mt-2 text-base font-semibold text-[#111827]">
              {user?.createdBy || "HCMUTE"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
