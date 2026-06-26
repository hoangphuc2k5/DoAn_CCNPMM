import { Card, Space, Tag, Typography } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";

const TrendingSidebar = ({ topics = [] }) => (
  <aside className="social-right-rail">
    <Card className="social-panel" title="Chủ đề thịnh hành">
      <Space wrap>
        {topics.length ? (
          topics.map((item) => (
            <Tag key={item.topic} color="blue" className="trend-tag">
              <ThunderboltOutlined /> #{item.topic} ({item.count})
            </Tag>
          ))
        ) : (
          <Typography.Text type="secondary">Chưa có chủ đề nổi bật</Typography.Text>
        )}
      </Space>
    </Card>
  </aside>
);

export default TrendingSidebar;
