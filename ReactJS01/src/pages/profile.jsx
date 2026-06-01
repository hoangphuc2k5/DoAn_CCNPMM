import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Skeleton,
  Button,
  Space,
  Empty,
  Avatar,
  Divider,
  Form,
  Input,
  DatePicker,
  Select,
  message,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchProfile,
  updateProfile,
  clearSuccess,
  clearError,
} from "../redux/profileSlice";
import dayjs from "dayjs";
import "./profile.css";

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { user, loading, error, success } = useSelector(
    (state) => state.profile,
  );

  // Fetch profile khi mount
  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  // Cập nhật form khi user data thay đổi
  useEffect(() => {
    if (user && isEditing) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar,
        bio: user.bio,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth ? dayjs(user.dateOfBirth) : null,
      });
    }
  }, [user, isEditing, form]);

  // Xử lý khi update thành công
  useEffect(() => {
    if (success) {
      message.success("Cập nhật profile thành công!");
      dispatch(clearSuccess());
      setIsEditing(false);
    }
  }, [success, dispatch]);

  // Xử lý lỗi
  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleEditSubmit = async (values) => {
    const updateData = {
      name: values.name,
      phone: values.phone,
      address: values.address,
      avatar: values.avatar,
      bio: values.bio,
      gender: values.gender,
      dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toDate() : null,
    };
    dispatch(updateProfile(updateData));
  };

  // VIEW MODE
  const renderProfileView = () => {
    if (loading) {
      return (
        <Card>
          <Skeleton active avatar paragraph={{ rows: 4 }} />
        </Card>
      );
    }

    if (error && !user) {
      return (
        <Card>
          <Empty
            description={error}
            style={{ marginTop: 48, marginBottom: 48 }}
          />
        </Card>
      );
    }

    if (!user) {
      return (
        <Card>
          <Empty
            description="No profile data"
            style={{ marginTop: 48, marginBottom: 48 }}
          />
        </Card>
      );
    }

    return (
      <Card
        title={
          <div className="profile-title">
            <Avatar size={64} icon={<UserOutlined />} src={user.avatar} />
            <div className="profile-name">
              <h2>{user.name || "N/A"}</h2>
              <p className="profile-role">{user.role || "User"}</p>
            </div>
          </div>
        }
        extra={
          <Button type="primary" onClick={() => setIsEditing(true)}>
            Chỉnh sửa
          </Button>
        }
        className="profile-card"
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <div className="profile-item">
              <MailOutlined className="profile-icon" />
              <div>
                <p className="label">Email</p>
                <p className="value">{user.email || "N/A"}</p>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="profile-item">
              <PhoneOutlined className="profile-icon" />
              <div>
                <p className="label">Số điện thoại</p>
                <p className="value">{user.phone || "Chưa cập nhật"}</p>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="profile-item">
              <EnvironmentOutlined className="profile-icon" />
              <div>
                <p className="label">Địa chỉ</p>
                <p className="value">{user.address || "Chưa cập nhật"}</p>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className="profile-item">
              <UserOutlined className="profile-icon" />
              <div>
                <p className="label">Giới tính</p>
                <p className="value">{user.gender || "Khác"}</p>
              </div>
            </div>
          </Col>
        </Row>

        <Divider />

        <div className="profile-bio">
          <h3>Tiểu sử</h3>
          <p>{user.bio || "Chưa cập nhật tiểu sử"}</p>
        </div>

        {user.dateOfBirth && (
          <>
            <Divider />
            <div className="profile-bio">
              <h3>Ngày sinh</h3>
              <p>{new Date(user.dateOfBirth).toLocaleDateString("vi-VN")}</p>
            </div>
          </>
        )}
      </Card>
    );
  };

  // EDIT MODE
  const renderProfileEdit = () => {
    return (
      <Card
        title="Chỉnh sửa Profile"
        className="profile-edit-card"
        extra={<Button onClick={() => setIsEditing(false)}>Hủy</Button>}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
          className="profile-form"
        >
          <Form.Item
            label="Tên"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên!" },
              { min: 3, message: "Tên phải có ít nhất 3 ký tự" },
            ]}
          >
            <Input placeholder="Nhập tên của bạn" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email!" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input disabled placeholder="Email" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              {
                pattern: /^[0-9\-\+\(\)\s]*$/,
                message: "Số điện thoại không hợp lệ",
              },
            ]}
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item label="Địa chỉ" name="address">
            <Input placeholder="Nhập địa chỉ" />
          </Form.Item>

          <Form.Item
            label="Avatar URL"
            name="avatar"
            rules={[{ type: "url", message: "URL không hợp lệ" }]}
          >
            <Input placeholder="Nhập URL avatar" />
          </Form.Item>

          <Form.Item label="Giới tính" name="gender">
            <Select placeholder="Chọn giới tính">
              <Select.Option value="Male">Nam</Select.Option>
              <Select.Option value="Female">Nữ</Select.Option>
              <Select.Option value="Other">Khác</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Ngày sinh" name="dateOfBirth">
            <DatePicker placeholder="Chọn ngày sinh" format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item label="Tiểu sử" name="bio">
            <Input.TextArea placeholder="Nhập tiểu sử của bạn" rows={4} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Lưu thay đổi
              </Button>
              <Button onClick={() => setIsEditing(false)}>Quay lại</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    );
  };

  return (
    <div className="profile-container">
      <div className="profile-row">
        <div className="profile-col">
          {isEditing ? renderProfileEdit() : renderProfileView()}
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import { fetchAccountThunk, logout } from "../Redux/authSlice";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, appLoading } = useSelector(
    (state) => state.auth
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
        <div className="rounded-[28px] border border-black/10 bg-white/80 p-8 shadow-glow">
          <h2 className="font-display text-3xl text-ink">Bạn chưa đăng nhập</h2>
          <p className="mt-3 text-sm text-black/70">
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
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="grid gap-8 rounded-[32px] border border-black/10 bg-white/80 p-8 shadow-glow md:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-reef">Profile</p>
          <h2 className="mt-4 font-display text-3xl text-ink">
            Xin chào, {user?.name || "bạn"}
          </h2>
          <p className="mt-3 text-sm text-black/70">
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
          <div className="rounded-2xl border border-black/10 bg-paper/70 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-black/60">Email</p>
            <p className="mt-2 text-base font-semibold text-ink">{user?.email}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-paper/70 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-black/60">Tên hiển thị</p>
            <p className="mt-2 text-base font-semibold text-ink">{user?.name}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-paper/70 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-black/60">Nguồn tạo</p>
            <p className="mt-2 text-base font-semibold text-ink">
              {user?.createdBy || "HCMUTE"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
