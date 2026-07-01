# Đồ Án CNPMM - Mạng Xã Hội Fullstack

Ứng dụng web mạng xã hội được xây dựng theo kiến trúc tách biệt giữa backend `ExpressJS01` và frontend `ReactJS01`. Dự án hỗ trợ đầy đủ các luồng người dùng phổ biến như đăng ký, đăng nhập, xác thực email, đăng bài, tương tác xã hội, chat realtime, nhóm, thông báo và khu vực quản trị.

## Tổng Quan

- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO, EJS.
- Frontend: React, Vite, Redux Toolkit, React Router, Ant Design, Socket.IO Client.
- Upload media: Multer, Sharp.
- Thông báo đẩy: Web Push.
- Bảo mật và tiện ích: JWT, CORS, rate limit, sanitize input, security headers.

## Tính Năng Chính

### Tài khoản người dùng

- Đăng ký, đăng nhập, đăng xuất.
- Quên mật khẩu, đặt lại mật khẩu.
- Xác thực email bằng OTP, gửi lại OTP.
- Cập nhật hồ sơ cá nhân, đổi mật khẩu, xóa tài khoản.
- Lưu lịch sử thiết bị đăng nhập.

### Hồ sơ và mạng xã hội

- Xem hồ sơ cá nhân và hồ sơ người dùng khác.
- Theo dõi, bỏ theo dõi, kết bạn, hủy kết bạn.
- Chặn, bỏ chặn, hạn chế người dùng.
- Báo cáo bài viết, bình luận và người dùng.
- Ẩn, lưu, chia sẻ, chỉnh sửa và xóa bài viết.

### Bài viết và News Feed

- Tạo bài viết kèm tối đa 10 file media.
- Xem feed theo chế độ hiển thị.
- Thả cảm xúc, bình luận, trả lời bình luận.
- Theo dõi xu hướng từ khóa và bài viết nổi bật.
- Quản lý bài đã lưu và bài bị ẩn.

### Nhóm và cộng đồng

- Tạo và quản lý nhóm.
- Upload avatar và cover nhóm.
- Tham gia, rời nhóm, duyệt yêu cầu tham gia.
- Phân quyền thành viên, xóa thành viên.
- Đăng bài trong nhóm, duyệt bài chờ, xem media, sự kiện và báo cáo trong nhóm.

### Chat realtime và thông báo

- Danh sách hội thoại và tin nhắn chưa đọc.
- Nhắn tin realtime bằng Socket.IO.
- Gửi tệp đính kèm trong chat.
- Thu hồi tin nhắn và đánh dấu đã xem.
- Thông báo hệ thống và thông báo đẩy qua Web Push.

### Admin panel

- Dashboard quản trị.
- Danh sách người dùng, trạng thái, khóa/mở khóa tài khoản.
- Danh sách bài viết và xử lý bài vi phạm.
- Danh sách báo cáo và lịch sử audit log.

## Cấu Trúc Dự Án

```text
README.md
ExpressJS01/
  package.json
  scripts/
    seedSocialData.js
  src/
    server.js
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    views/
  uploads/
ReactJS01/
  package.json
  public/
    notification-sw.js
  src/
    App.jsx
    main.jsx
    components/
    pages/
    Redux/
    styles/
    util/
```

## Yêu Cầu Hệ Thống

- Node.js 18+.
- npm 9+.
- MongoDB đang chạy cục bộ hoặc MongoDB Atlas.

## Cài Đặt Và Chạy Dự Án

### 1. Backend

```bash
cd ExpressJS01
npm install
```

Tạo file `.env` trong thư mục `ExpressJS01` với các biến tối thiểu:

```env
PORT=8888
MONGO_DB_URL=mongodb://127.0.0.1:27017/doan_cnpmm
JWT_SECRET=your_secret_key
JWT_EXPIRE=1d

SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
SMTP_FROM=your_email@example.com
SMTP_SECURE=true

VAPID_PUBLIC_KEY=your_public_vapid_key
VAPID_PRIVATE_KEY=your_private_vapid_key
VAPID_SUBJECT=mailto:admin@example.com

MEDIA_BASE_URL=http://localhost:8888
MEDIA_STORAGE_PROVIDER=local
```

Khởi động backend:

```bash
npm run dev
```

Nếu không cấu hình `PORT`, backend sẽ chạy ở cổng `8888`.

### 2. Frontend

```bash
cd ../ReactJS01
npm install
```

Tạo file `.env` trong thư mục `ReactJS01`:

```env
VITE_BACKEND_URL=http://localhost:8888
```

Chạy frontend:

```bash
npm run dev
```

### 3. Seeder dữ liệu mẫu

Nếu cần nạp dữ liệu xã hội mẫu cho backend:

```bash
cd ../ExpressJS01
npm run seed:social
```

## Mô Tả Luồng Chạy

1. Người dùng mở frontend React.
2. Frontend gọi backend qua `VITE_BACKEND_URL`.
3. Backend xác thực JWT, truy vấn MongoDB và trả dữ liệu JSON.
4. Các tính năng realtime như chat và cập nhật trạng thái sử dụng Socket.IO.
5. Media được lưu trong thư mục `uploads/` hoặc theo cấu hình storage hiện có.

## API Chính

Backend expose các nhóm endpoint dưới tiền tố `/v1/api/`:

- `auth`: đăng ký, đăng nhập, quên mật khẩu, xác thực email.
- `profile`: hồ sơ cá nhân, avatar, cover, media.
- `posts`: tạo, sửa, xóa, lưu, ẩn, chia sẻ, bình luận, phản ứng.
- `relationships`: follow, friend request, block, restrict, report.
- `notifications`: danh sách thông báo, đánh dấu đã đọc, push subscription.
- `groups`: nhóm, thành viên, duyệt bài, sự kiện, báo cáo nhóm.
- `conversations`: chat, tin nhắn, trạng thái đã xem.
- `admin`: dashboard, người dùng, bài viết, báo cáo, audit logs.

## Thành Viên Nhóm

| STT | Họ và tên | MSSV | Chức năng phụ trách | Deliverables chính |
|-----|------------|-------|----------------------|--------------------|
| 1 | Trần Nguyễn Castrol | 23110185 | Tương tác xã hội, News Feed, Thông báo, Chat/Nhắn tin | API + Database + Use Case + Sequence Diagram |
| 2 | Nguyễn Hoàng Phúc | 23110287 | Tài khoản người dùng, Tìm kiếm, Hệ thống bài viết | API + Database + Use Case + Sequence Diagram |
| 3 | Phan Lê Tùng | 23110358 | Nhóm/Community, Media System | API + Database + Use Case + Sequence Diagram |
| 4 | Nguyễn Quốc Bảo | 23110182 | Hồ sơ cá nhân, Realtime Features, Hệ thống quản trị (Admin Panel) | API + Database + Use Case + Sequence Diagram |

## Phân Công Chức Năng

### Nguyễn Hoàng Phúc (23110287)

- Đăng ký tài khoản.
- Đăng nhập, đăng xuất.
- Quên mật khẩu.
- Xác thực email bằng OTP.
- Chỉnh sửa hồ sơ.
- Đổi mật khẩu.
- Xóa tài khoản.
- Tìm kiếm.
- Hệ thống bài viết.

### Nguyễn Quốc Bảo (23110182)

- Hồ sơ cá nhân.
- Realtime features.
- Hệ thống quản trị.

### Phan Lê Tùng (23110358)

- Nhóm / Community.
- Media system.

### Trần Nguyễn Castrol (23110185)

- Tương tác xã hội.
- News Feed / Trang chủ.
- Thông báo.
- Chat / Nhắn tin.

## Ghi Chú Triển Khai

- Frontend dùng Redux Toolkit để quản lý trạng thái xác thực và hồ sơ.
- React app khởi tạo socket khi người dùng đã đăng nhập.
- Backend có middleware chống spam, rate limit, sanitize input và security headers.
- Một số tính năng nâng cao như push notification và media storage phụ thuộc vào biến môi trường tương ứng.

## Hướng Phát Triển Tiếp

- Bổ sung sơ đồ kiến trúc và ERD.
- Thêm ảnh chụp màn hình các màn hình chính.
- Chuẩn hóa file `.env.example` cho backend và frontend.
- Viết thêm tài liệu API chi tiết nếu cần bàn giao hoặc bảo trì.
