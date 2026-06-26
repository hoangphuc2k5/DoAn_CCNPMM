import React from "react";
import { Card, Typography, Button } from "antd";
import { useNavigate } from "react-router-dom";

const { Title, Paragraph } = Typography;

const IntroPage = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card style={{ maxWidth: 900 }}>
        <Title>Giới thiệu Tegram</Title>
        <Paragraph>
          Tegram là nền tảng kết nối cộng đồng, chia sẻ bài viết, hình ảnh và video. Người dùng có thể tạo bài viết, tham gia
          nhóm, theo dõi người khác và tương tác với nội dung bằng phản ứng và bình luận.
        </Paragraph>

        <Paragraph>
          Tính năng nổi bật:
        </Paragraph>
        <ul>
          <li>Trang cá nhân và timeline cá nhân</li>
          <li>Nhóm thảo luận và chia sẻ nội dung</li>
          <li>Tìm kiếm người dùng, nhóm, hashtag và bài viết</li>
          <li>Thông báo và nhắn tin</li>
        </ul>

        <Paragraph>
          Để bắt đầu, hãy <strong>đăng nhập</strong> bằng tài khoản của bạn.
        </Paragraph>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
          <Button type="primary" onClick={() => navigate('/login')}>Đăng nhập</Button>
          <Button onClick={() => navigate('/')}>Quay về</Button>
        </div>
      </Card>
    </div>
  );
};

export default IntroPage;
