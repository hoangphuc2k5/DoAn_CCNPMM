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
    </div>
  );
};

export default ProfilePage;
