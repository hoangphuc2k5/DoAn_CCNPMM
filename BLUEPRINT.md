# Tổng Quan Dự Án (MERN Stack)

Dự án được xây dựng theo kiến trúc **Client-Server** sử dụng bộ công nghệ MERN Stack hiện đại, phân tách rõ ràng giữa hai phần Backend và Frontend.

---

## 🛠️ Kiến Trúc Hệ Thống

### 1. Backend (`ExpressJS01`)
Hệ thống Server-side chịu trách nhiệm cung cấp dữ liệu qua luồng **REST API**.

* **Nền tảng:** Node.js & Express.js.
* **Mô hình thiết kế:** MVC (Model - View - Controller).
* **Cơ sở dữ liệu:** MongoDB (kết nối thông qua Mongoose ORM).
* **Xác thực người dùng:** JSON Web Token (JWT).
* **Quản lý file:** Multer (hỗ trợ upload và lưu trữ tệp tin).

### 2. Frontend (`ReactJS01`)
Giao diện người dùng được xây dựng theo mô hình **SPA (Single Page Application)**.

* **Nền tảng:** React.js (sử dụng công cụ build **Vite** để tối ưu tốc độ).
* **Quản lý trạng thái:** Redux Toolkit (quản lý state toàn cục tập trung).
* **Giao tiếp API:** Axios (gửi/nhận request HTTP đến Backend).
* **Giao diện & Kỹ thuật:** 
  * **Ant Design:** Cung ứng bộ thư viện UI component chuẩn hóa.
  * **TailwindCSS:** Tối ưu hóa việc custom giao diện bằng utility classes.
