import { useEffect, useState } from "react";
import { Card, List, Switch, Typography, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import {
  changePasswordThunk,
  fetchDeviceHistoryThunk,
  toggleTwoFactorThunk,
} from "../Redux/authSlice";
import { deleteAccountApi } from "../util/api";

const SecurityPage = () => {
  const dispatch = useDispatch();
  const { user, deviceHistory, loading, error, message: successMessage } = useSelector(
    (state) => state.auth,
  );
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    dispatch(fetchDeviceHistoryThunk());
  }, [dispatch]);

  useEffect(() => {
    if (error) message.error(error);
    if (successMessage) message.success(successMessage);
  }, [error, successMessage]);

  const handleChangePassword = async (event) => {
    event.preventDefault();
    await dispatch(changePasswordThunk(passwordForm));
    setPasswordForm({ currentPassword: "", newPassword: "" });
  };

  const handleToggle2FA = async (checked) => {
    if (!twoFactorPassword) {
      message.error("Nhập mật khẩu hiện tại để thay đổi 2FA.");
      return;
    }
    await dispatch(toggleTwoFactorThunk({ enabled: checked, password: twoFactorPassword }));
    setTwoFactorPassword("");
  };

  const handleDeleteAccount = async () => {
    const res = await deleteAccountApi(deletePassword);
    if (res?.EC === 0) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
      return;
    }
    message.error(res?.EM || "Không thể xóa tài khoản.");
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <Card>
        <Typography.Title level={3}>Bảo mật tài khoản</Typography.Title>
        <Typography.Paragraph type="secondary">
          Quản lý mật khẩu, 2FA và lịch sử đăng nhập theo thiết bị cho tài khoản {user?.email}.
        </Typography.Paragraph>
      </Card>

      <Card title="Đổi mật khẩu">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Mật khẩu hiện tại"
            name="currentPassword"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
            }
          />
          <Input
            label="Mật khẩu mới"
            name="newPassword"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
            }
          />
          <Button type="submit" loading={loading}>
            Cập nhật mật khẩu
          </Button>
        </form>
      </Card>

      <Card title="Xác thực 2 lớp">
        <div className="flex flex-col gap-4">
          <Input
            label="Nhập mật khẩu để thay đổi 2FA"
            name="twoFactorPassword"
            type="password"
            value={twoFactorPassword}
            onChange={(e) => setTwoFactorPassword(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <Typography.Text>Bật xác thực 2 lớp qua OTP email</Typography.Text>
            <Switch checked={Boolean(user?.twoFactorEnabled)} onChange={handleToggle2FA} />
          </div>
        </div>
      </Card>

      <Card title="Lịch sử đăng nhập thiết bị">
        <List
          dataSource={deviceHistory}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.deviceId}
                description={`${item.userAgent || "Unknown agent"} | ${item.ipAddress || "Unknown IP"} | ${new Date(
                  item.lastSeenAt,
                ).toLocaleString("vi-VN")}`}
              />
              <Typography.Text type={item.isActive ? "success" : "secondary"}>
                {item.isActive ? "Đang hoạt động" : "Đã đăng xuất"}
              </Typography.Text>
            </List.Item>
          )}
        />
      </Card>

      <Card title="Xóa tài khoản" extra={<Typography.Text type="danger">Không thể hoàn tác</Typography.Text>}>
        <div className="flex flex-col gap-4">
          <Input
            label="Nhập mật khẩu để xác nhận xóa tài khoản"
            name="deletePassword"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          <Button onClick={handleDeleteAccount}>Xóa tài khoản</Button>
        </div>
      </Card>
    </div>
  );
};

export default SecurityPage;
