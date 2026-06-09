import {
  Modal,
  Form,
  Input,
  Upload,
  Button,
  DatePicker,
  Select,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import axiosInstance from "../../util/axios.customize";

const EditProfileModal = ({ visible, onCancel, profile, onSave }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    form.setFieldsValue({
      name: profile?.name || "",
      bio: profile?.bio || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      gender: profile?.gender || "",
      dateOfBirth: profile?.dateOfBirth ? dayjs(profile.dateOfBirth) : null,
    });
  }, [form, profile, visible]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      // Update profile info
      await axiosInstance.put("/v1/api/profile/me", {
        name: values.name,
        bio: values.bio,
        phone: values.phone,
        address: values.address,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth
          ? values.dateOfBirth.format("YYYY-MM-DD")
          : "",
      });

      // Upload avatar if changed
      if (values.avatar?.[0]?.originFileObj) {
        const avatarForm = new FormData();
        avatarForm.append("avatar", values.avatar[0].originFileObj);
        await axiosInstance.put("/v1/api/profile/me/avatar", avatarForm);
      }

      // Upload cover if changed
      if (values.cover?.[0]?.originFileObj) {
        const coverForm = new FormData();
        coverForm.append("cover", values.cover[0].originFileObj);
        await axiosInstance.put("/v1/api/profile/me/cover", coverForm);
      }

      message.success("Cập nhật trang cá nhân thành công!");
      onSave();
      onCancel();
    } catch (error) {
      message.error(error.response?.data?.EM || "Lỗi cập nhật profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Chỉnh sửa trang cá nhân"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: profile?.name || "",
          bio: profile?.bio || "",
          phone: profile?.phone || "",
          address: profile?.address || "",
          gender: profile?.gender || "",
          dateOfBirth: profile?.dateOfBirth ? dayjs(profile.dateOfBirth) : null,
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="name"
          label="Tên"
          rules={[{ required: true, message: "Vui lòng nhập tên" }]}
        >
          <Input placeholder="Nhập tên" />
        </Form.Item>

        <Form.Item name="bio" label="Tiểu sử">
          <Input.TextArea rows={3} placeholder="Viết gì đó về bạn" />
        </Form.Item>

        <Form.Item name="phone" label="Số điện thoại">
          <Input placeholder="Nhập số điện thoại" />
        </Form.Item>

        <Form.Item name="address" label="Địa chỉ">
          <Input placeholder="Nhập địa chỉ" />
        </Form.Item>

        <Form.Item name="gender" label="Giới tính">
          <Select placeholder="Chọn giới tính">
            <Select.Option value="">Không chỉ định</Select.Option>
            <Select.Option value="male">Nam</Select.Option>
            <Select.Option value="female">Nữ</Select.Option>
            <Select.Option value="other">Khác</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="dateOfBirth" label="Ngày sinh">
          <DatePicker format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          name="avatar"
          label="Ảnh đại diện"
          valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList}
        >
          <Upload
            maxCount={1}
            beforeUpload={() => false}
            accept="image/*"
            listType="picture"
          >
            <Button icon={<UploadOutlined />}>Chọn ảnh đại diện</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          name="cover"
          label="Ảnh bìa"
          valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList}
        >
          <Upload
            maxCount={1}
            beforeUpload={() => false}
            accept="image/*"
            listType="picture"
          >
            <Button icon={<UploadOutlined />}>Chọn ảnh bìa</Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Lưu thay đổi
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditProfileModal;
