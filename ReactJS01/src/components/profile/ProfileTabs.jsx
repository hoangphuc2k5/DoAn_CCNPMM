import { Tabs } from "antd";
import {
  FileTextOutlined,
  TeamOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import "../../styles/user-profile.css";

const ProfileTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      key: "posts",
      label: (
        <span>
          <FileTextOutlined style={{ marginRight: 6 }} />
          Bài viết
        </span>
      ),
    },
    {
      key: "media",
      label: (
        <span>
          <FolderOutlined style={{ marginRight: 6 }} />
          Album
        </span>
      ),
    },
    {
      key: "friends",
      label: (
        <span>
          <TeamOutlined style={{ marginRight: 6 }} />
          Bạn bè
        </span>
      ),
    },
  ];

  return (
    <div className="profile-tabs-card">
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        items={tabs}
        className="profile-custom-tabs"
      />
    </div>
  );
};

export default ProfileTabs;
