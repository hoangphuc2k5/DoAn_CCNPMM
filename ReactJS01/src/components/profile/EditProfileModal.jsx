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
import { getMediaUrl } from "../../util/media";

const MAX_BIO_CHARS = 500;
const PHONE_REGEX = /^(?:0\d{9,10}|\+84\d{9})$/;

const buildExistingFileList = (src, name) =>
  src
    ? [
        {
          uid: `current-${name}`,
          name: `current-${name}`,
          status: "done",
          url: getMediaUrl(src),
        },
      ]
    : [];

const EditProfileModal = ({ visible, onCancel, profile, onSave }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarFileList, setAvatarFileList] = useState([]);
  const [coverFileList, setCoverFileList] = useState([]);

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
    setAvatarFileList(buildExistingFileList(profile?.avatar, "avatar"));
    setCoverFileList(buildExistingFileList(profile?.coverPhoto, "cover"));
  }, [form, profile, visible]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      const shouldClearAvatar = Boolean(profile?.avatar) && avatarFileList.length === 0;
      const shouldClearCover = Boolean(profile?.coverPhoto) && coverFileList.length === 0;

      const payload = {
        name: values.name,
        bio: values.bio,
        phone: values.phone,
        address: values.address,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth
          ? values.dateOfBirth.format("YYYY-MM-DD")
          : "",
      };

      if (shouldClearAvatar) {
        payload.avatar = "";
      }

      if (shouldClearCover) {
        payload.coverPhoto = "";
      }

      // Update profile info
      await axiosInstance.put("/v1/api/profile/me", payload);

      // Upload avatar if changed
      if (avatarFileList[0]?.originFileObj) {
        const avatarForm = new FormData();
        avatarForm.append("avatar", avatarFileList[0].originFileObj);
        await axiosInstance.put("/v1/api/profile/me/avatar", avatarForm);
      }

      // Upload cover if changed
      if (coverFileList[0]?.originFileObj) {
        const coverForm = new FormData();
        coverForm.append("cover", coverFileList[0].originFileObj);
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

        <Form.Item
          name="phone"
          label="Số điện thoại"
          rules={[
            {
              validator: (_, value) => {
                const normalized = String(value || "").replace(/[\s-]/g, "").trim();
                if (!normalized) return Promise.resolve();
                if (!PHONE_REGEX.test(normalized)) {
                  return Promise.reject(new Error("Số điện thoại không đúng định dạng"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
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

        <Form.Item
          name="dateOfBirth"
          label="Ngày sinh"
          rules={[
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (value.isAfter(dayjs().endOf("day"))) {
                  return Promise.reject(new Error("Ngày sinh không được ở trong tương lai"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <DatePicker
            format="DD/MM/YYYY"
            allowClear
            disabledDate={(current) => current && current.isAfter(dayjs().endOf("day"))}
          />
        </Form.Item>

        <Form.Item label="Ảnh đại diện">
          <Upload
            maxCount={1}
            fileList={avatarFileList}
            beforeUpload={(file) => {
              if (!file.type?.startsWith("image/")) {
                message.error("Chỉ chấp nhận file ảnh cho ảnh đại diện");
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            accept="image/*"
            listType="picture"
            onChange={({ fileList }) => setAvatarFileList(fileList)}
          >
            <Button icon={<UploadOutlined />}>Chọn ảnh đại diện</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          name="bio"
          label="Tiểu sử"
          rules={[
            {
              validator: (_, value) => {
                const chars = String(value || "").trim().length;
                if (chars > MAX_BIO_CHARS) {
                  return Promise.reject(
                    new Error(`Tiểu sử chỉ được tối đa ${MAX_BIO_CHARS} ký tự`),
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.TextArea rows={3} placeholder="Viết gì đó về bạn" maxLength={MAX_BIO_CHARS} showCount />
        </Form.Item>

        <Form.Item label="Ảnh bìa">
          <Upload
            maxCount={1}
            fileList={coverFileList}
            beforeUpload={(file) => {
              if (!file.type?.startsWith("image/")) {
                message.error("Chỉ chấp nhận file ảnh cho ảnh bìa");
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            accept="image/*"
            listType="picture"
            onChange={({ fileList }) => setCoverFileList(fileList)}
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
