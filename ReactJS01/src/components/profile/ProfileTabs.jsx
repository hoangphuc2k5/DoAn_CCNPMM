import { Tabs } from "antd";
import {
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  PictureOutlined,
} from "@ant-design/icons";

const ProfileTabs = ({
  activeTab,
  onTabChange,
  postsCount,
  friendsCount,
  followersCount,
}) => {
  const tabs = [
    {
      key: "posts",
      label: (
        <>
          <FileTextOutlined /> Bài viết ({postsCount || 0})
        </>
      ),
    },
    {
      key: "friends",
      label: (
        <>
          <TeamOutlined /> Bạn bè ({friendsCount || 0})
        </>
      ),
    },
    {
      key: "followers",
      label: (
        <>
          <UserOutlined /> Người theo dõi ({followersCount || 0})
        </>
      ),
    },
    {
      key: "media",
      label: (
        <>
          <PictureOutlined /> Ảnh & Video
        </>
      ),
    },
  ];

  return <Tabs activeKey={activeTab} onChange={onTabChange} items={tabs} />;
};

export default ProfileTabs;
