# TEST CASE - NGUYỄN HOÀNG PHÚC & TRẦN NGUYỄN CASTROL
# Quy tắc đặt tên: <Tên viết tắt>_<Mức độ>_<Kỹ thuật>_<Số>
# Viết tắt mức độ : UT = Unit Testing | IT = Integration Testing | ST = System Testing | AT = Acceptance Testing
# Viết tắt kỹ thuật: UCT = Use Case Testing | EP = Equivalence Partitioning | BVA = Boundary Value Analysis | STT = State Transition | EG = Error Guessing | DT = Decision Table | CBT = Checklist-based Testing

================================================================
NGUYỄN HOÀNG PHÚC (NHP) — 5 Test Case
================================================================

───────────────────────────────────────────────────────────────
NHP_ST_UCT_001
Mức độ kiểm thử: Kiểm thử hệ thống (System Testing)
Kỹ thuật kiểm thử: Kiểm thử ca sử dụng (Use Case Testing)
Chức năng: UC01 - Đăng ký tài khoản
Mô tả: Đăng ký tài khoản thành công với đầy đủ thông tin hợp lệ

Điều kiện tiên quyết: Kết nối Internet ổn định. Đang ở màn hình Đăng ký.
Dữ liệu test: Tên: "Nguyễn Hoàng Phúc" | Email: "phucnh2005@gmail.com" (chưa tồn tại) | Mật khẩu: "phuchuy123"

Bước 1 — Nhập họ tên "Nguyễn Hoàng Phúc" vào ô "Tên"
Kết quả mong đợi: Ô nhập hiển thị "Nguyễn Hoàng Phúc"
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 2 — Nhập email "phucnh2005@gmail.com" vào ô "Email"
Kết quả mong đợi: Ô nhập hiển thị "phucnh2005@gmail.com"
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 3 — Nhập mật khẩu "phuchuy123" vào ô "Mật khẩu"
Kết quả mong đợi: Ô nhập hiển thị mật khẩu dưới dạng ẩn (dấu chấm)
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 4 — Nhấp nút "Đăng ký"
Kết quả mong đợi: Hệ thống lưu tài khoản vào database (mật khẩu được mã hóa bcrypt), trả về EC: 0, thông báo "Đăng ký thành công", chuyển hướng về màn hình Đăng nhập
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass
───────────────────────────────────────────────────────────────

───────────────────────────────────────────────────────────────
NHP_IT_UCT_002
Mức độ kiểm thử: Kiểm thử tích hợp (Integration Testing)
Kỹ thuật kiểm thử: Kiểm thử ca sử dụng (Use Case Testing)
Chức năng: UC02 - Đăng nhập
Mô tả: Đăng nhập thành công, hệ thống tạo JWT token và lưu vào Redux store

Điều kiện tiên quyết: Tài khoản "phucnh2005@gmail.com" đã tồn tại trong hệ thống. Đang ở màn hình Đăng nhập.
Dữ liệu test: Email: "phucnh2005@gmail.com" | Mật khẩu: "phuchuy123"

Bước 1 — Nhập email "phucnh2005@gmail.com" vào ô "Email"
Kết quả mong đợi: Ô nhập hiển thị "phucnh2005@gmail.com"
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 2 — Nhập mật khẩu "phuchuy123" vào ô "Mật khẩu"
Kết quả mong đợi: Ô nhập hiển thị mật khẩu dưới dạng ẩn
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 3 — Nhấp nút "Đăng nhập"
Kết quả mong đợi: Backend tìm user theo email, so khớp mật khẩu bằng bcrypt.compare, tạo JWT token có hạn 7 ngày, frontend nhận token và lưu vào Redux store, chuyển hướng về trang chủ (News Feed), trả về EC: 0
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass
───────────────────────────────────────────────────────────────

───────────────────────────────────────────────────────────────
NHP_ST_STT_003
Mức độ kiểm thử: Kiểm thử hệ thống (System Testing)
Kỹ thuật kiểm thử: Chuyển đổi trạng thái (State Transition Testing)
Chức năng: UC03 - Đăng xuất
Mô tả: Người dùng chuyển đổi trạng thái từ "Đã đăng nhập" → "Chưa đăng nhập" sau khi đăng xuất

Điều kiện tiên quyết: Người dùng đang đăng nhập, ở trang chủ (trạng thái: Đã đăng nhập).
Dữ liệu test: Không yêu cầu dữ liệu đầu vào

Bước 1 — Nhấp chọn biểu tượng Avatar/Tên tài khoản ở góc phải Header
Kết quả mong đợi: Menu tùy chọn tài khoản xổ xuống hiển thị, trong đó có nút "Đăng xuất" (biểu tượng LogoutOutlined)
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 2 — Nhấp chọn nút "Đăng xuất"
Kết quả mong đợi: Hệ thống gọi dispatch(logout()), xóa token và thông tin user khỏi Redux state → chuyển sang trạng thái "Chưa đăng nhập", điều hướng về màn hình Đăng nhập
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 3 — Thử nhấn nút Back của trình duyệt để quay lại trang chủ
Kết quả mong đợi: Hệ thống phát hiện không có token hợp lệ trong Redux state, chặn truy cập và điều hướng trở lại màn hình Đăng nhập (trạng thái "Chưa đăng nhập" được duy trì)
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass
───────────────────────────────────────────────────────────────

───────────────────────────────────────────────────────────────
NHP_UT_EP_004
Mức độ kiểm thử: Kiểm thử đơn vị (Unit Testing)
Kỹ thuật kiểm thử: Phân vùng tương đương (Equivalence Partitioning)
Chức năng: UC04 - Khôi phục mật khẩu
Mô tả: Yêu cầu khôi phục mật khẩu thành công với email hợp lệ đã đăng ký (lớp tương đương hợp lệ)

Điều kiện tiên quyết: Kết nối Internet ổn định. Đang ở màn hình Quên mật khẩu.
Dữ liệu test: Email: "phucnh2005@gmail.com" (đã tồn tại trong database — lớp hợp lệ)

Bước 1 — Nhập email "phucnh2005@gmail.com" vào ô "Email"
Kết quả mong đợi: Ô nhập hiển thị "phucnh2005@gmail.com"
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 2 — Nhấp nút "Gửi yêu cầu"
Kết quả mong đợi: Backend tìm thấy email trong database (User.findOne({email})), trả về EC: 0, hiển thị thông báo "Yêu cầu khôi phục đã được ghi nhận"
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass
───────────────────────────────────────────────────────────────

───────────────────────────────────────────────────────────────
NHP_AT_UCT_005
Mức độ kiểm thử: Kiểm thử chấp nhận (Acceptance Testing)
Kỹ thuật kiểm thử: Kiểm thử ca sử dụng (Use Case Testing)
Chức năng: UC18 - Đổi mật khẩu
Mô tả: Người dùng đổi mật khẩu thành công qua giao diện, hệ thống hiển thị thông báo xác nhận rõ ràng

Điều kiện tiên quyết: Người dùng đã đăng nhập. Đang ở trang cài đặt tài khoản, mục Đổi mật khẩu.
Dữ liệu test: Mật khẩu hiện tại: "phuchuy123" | Mật khẩu mới: "phuc@2025" | Xác nhận mật khẩu mới: "phuc@2025"

Bước 1 — Nhập "phuchuy123" vào ô "Mật khẩu hiện tại"
Kết quả mong đợi: Ô hiển thị các dấu chấm ẩn thay cho ký tự nhập vào
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 2 — Nhập "phuc@2025" vào ô "Mật khẩu mới"
Kết quả mong đợi: Ô hiển thị các dấu chấm ẩn, không xuất hiện cảnh báo lỗi độ dài hay định dạng
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 3 — Nhập lại "phuc@2025" vào ô "Xác nhận mật khẩu mới"
Kết quả mong đợi: Ô hiển thị các dấu chấm ẩn, không xuất hiện thông báo "mật khẩu không khớp"
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 4 — Nhấp nút "Đổi mật khẩu" / "Lưu thay đổi"
Kết quả mong đợi: Nút hiển thị trạng thái đang xử lý (loading), sau đó xuất hiện thông báo “Đổi mật khẩu thành công” màu xanh lá trên màn hình, các ô nhập được xóa trắng
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 5 — Đăng xuất và đăng nhập lại bằng mật khẩu mới "phuc@2025"
Kết quả mong đợi: Đăng nhập thành công, vào được trang chủ, mật khẩu mới hoạt động bình thường
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass
───────────────────────────────────────────────────────────────


================================================================
TRẦN NGUYỄN CASTROL (TNC) — 5 Test Case
================================================================

───────────────────────────────────────────────────────────────
TNC_ST_UCT_001
Mức độ kiểm thử: Kiểm thử hệ thống (System Testing)
Kỹ thuật kiểm thử: Kiểm thử ca sử dụng (Use Case Testing)
Chức năng: UC07 - Tương tác bài viết (React/Like)
Mô tả: Thả React "Love" thành công trên bài viết của người khác

Điều kiện tiên quyết: Người dùng đã đăng nhập. Đang ở News Feed, thấy bài viết của người khác. Hai bên không chặn nhau.
Dữ liệu test: Bài viết ID: "64f1a2b3c4d5e6f7a8b9c0d1" | Loại reaction: "love"

Bước 1 — Tìm đến bài viết ID "64f1a2b3c4d5e6f7a8b9c0d1" trên bảng tin
Kết quả mong đợi: Bài viết hiển thị đúng nội dung cùng các nút tương tác phía dưới
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 2 — Nhấp chọn biểu tượng "Thả tim" (Love) bên dưới bài viết
Kết quả mong đợi: Hệ thống kiểm tra hasBlockBetween (= false), gọi API POST /posts/{id}/react với body {type: "love"}, tạo bản ghi Reaction trong database, tăng stats.reactions của bài viết lên 1, biểu tượng tim sáng màu đỏ, tạo thông báo post_reaction cho tác giả, trả về EC: 0
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass
───────────────────────────────────────────────────────────────

───────────────────────────────────────────────────────────────
TNC_IT_UCT_002
Mức độ kiểm thử: Kiểm thử tích hợp (Integration Testing)
Kỹ thuật kiểm thử: Kiểm thử ca sử dụng (Use Case Testing)
Chức năng: UC07 - Tương tác bài viết (Comment)
Mô tả: Bình luận thành công vào bài viết, thông báo được tạo cho tác giả bài viết

Điều kiện tiên quyết: Người dùng đã đăng nhập. Đang xem bài viết ID "64f1a2b3c4d5e6f7a8b9c0d1". Hai bên không chặn nhau.
Dữ liệu test: Bài viết ID: "64f1a2b3c4d5e6f7a8b9c0d1" | Nội dung bình luận: "Bài viết rất hay!"

Bước 1 — Nhấp chọn ô bình luận bên dưới bài viết
Kết quả mong đợi: Ô nhập bình luận được kích hoạt (focus), hiển thị placeholder nhắc nhập nội dung
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 2 — Nhập nội dung "Bài viết rất hay!" vào ô bình luận
Kết quả mong đợi: Ô nhập hiển thị "Bài viết rất hay!"
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 3 — Nhấp nút "Gửi" hoặc nhấn Enter để đăng bình luận
Kết quả mong đợi: Hệ thống gọi API POST /posts/{id}/comments với {content: "Bài viết rất hay!"}, tạo bản ghi Comment trong database, tăng stats.comments của bài viết lên 1, bình luận hiển thị ngay bên dưới bài viết kèm tên và avatar người bình luận, tạo thông báo post_comment cho tác giả bài viết, trả về EC: 0
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass
───────────────────────────────────────────────────────────────

───────────────────────────────────────────────────────────────
TNC_IT_STT_003
Mức độ kiểm thử: Kiểm thử tích hợp (Integration Testing)
Kỹ thuật kiểm thử: Chuyển đổi trạng thái (State Transition Testing)
Chức năng: UC09 - Theo dõi / Kết bạn
Mô tả: Gửi lời mời kết bạn thành công, mối quan hệ chuyển từ "Chưa kết bạn" → "Đang chờ xác nhận"

Điều kiện tiên quyết: Người dùng đã đăng nhập. Hai người chưa có quan hệ bạn bè (trạng thái: Chưa kết bạn). Không chặn nhau.
Dữ liệu test: Target User ID: "64f1a2b3c4d5e6f7a8b9c0d2" (Nguyễn Quốc Bảo)

Bước 1 — Tìm kiếm và truy cập trang cá nhân của Nguyễn Quốc Bảo
Kết quả mong đợi: Trang cá nhân hiển thị đúng với nút "Kết bạn" (trạng thái: Chưa kết bạn)
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 2 — Nhấp nút "Kết bạn"
Kết quả mong đợi: Hệ thống kiểm tra hasBlockBetween (= false) và không có lời mời trùng lặp, gọi API POST /users/{id}/friend-request, tạo bản ghi Friendship với status: "pending", tạo thông báo friend_request cho Nguyễn Quốc Bảo, nút chuyển sang "Đã gửi lời mời" (trạng thái: Đang chờ xác nhận), trả về EC: 0
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass
───────────────────────────────────────────────────────────────

───────────────────────────────────────────────────────────────
TNC_ST_DT_004
Mức độ kiểm thử: Kiểm thử hệ thống (System Testing)
Kỹ thuật kiểm thử: Bảng quyết định (Decision Table)
Chức năng: UC15 - Block / Report người dùng
Mô tả: Chặn người dùng thành công theo đúng luồng quyết định — toàn bộ quan hệ bị xóa tự động

Điều kiện tiên quyết: Người dùng đã đăng nhập. Đang ở trang cá nhân của Phan Lê Tùng (hai người đang là bạn bè và đang theo dõi nhau).
Dữ liệu test: Target User ID: "64f1a2b3c4d5e6f7a8b9c0d3" (Phan Lê Tùng)
Bảng quyết định: Hành động = "block" → Xóa Follow (cả 2 chiều) = Có | Xóa Friendship = Có | Tạo bản ghi Block = Có | Kết quả = EC: 0

Bước 1 — Nhấp menu 3 chấm ở góc phải trang cá nhân Phan Lê Tùng
Kết quả mong đợi: Menu tùy chọn hiển thị gồm các mục: "Chặn người dùng", "Báo cáo"
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 2 — Nhấp "Chặn người dùng" → Nhấp "Xác nhận chặn" trong hộp thoại xác nhận
Kết quả mong đợi: Hệ thống gọi API POST /users/{id}/block, tạo bản ghi Block trong database, đồng thời xóa tất cả bản ghi Follow và Friendship giữa hai tài khoản, trả về EC: 0, hiển thị thông báo "Đã chặn người dùng"
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 3 — Kiểm tra News Feed sau khi chặn
Kết quả mong đợi: Bài viết của Phan Lê Tùng không còn xuất hiện trên News Feed (getBlockedUserIds lọc đúng)
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass
───────────────────────────────────────────────────────────────

───────────────────────────────────────────────────────────────
TNC_AT_UCT_005
Mức độ kiểm thử: Kiểm thử chấp nhận (Acceptance Testing)
Kỹ thuật kiểm thử: Kiểm thử ca sử dụng (Use Case Testing)
Chức năng: UC07 - Tương tác bài viết (Chia sẻ)
Mô tả: Người dùng chia sẻ bài viết của người khác, nội dung bài chia sẻ hiển thị đúng trên trang cá nhân

Điều kiện tiên quyết: Người dùng đã đăng nhập. Đang ở News Feed, thấy bài viết công khai của người khác.
Dữ liệu test: Bài viết công khai của Nguyễn Hoàng Phúc có nội dung "Hôm nay trời đẹp quá!"

Bước 1 — Nhấp vào biểu tượng “Chia sẻ” bên dưới bài viết
Kết quả mong đợi: Hộp thoại chia sẻ xuất hiện, hiển thị xem trước nội dung bài gốc cùng ô nhập “Nhập cảm nghĩ của bạn” (tùy chọn)
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 2 — Để trống ô cảm nghĩ, nhấp nút “Chia sẻ ngay”
Kết quả mong đợi: Hộp thoại đóng lại, xuất hiện thông báo “Chia sẻ thành công” trên màn hình, số lượt chia sẻ của bài gốc tăng lên 1
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass

Bước 3 — Truy cập trang cá nhân của chính mình
Kết quả mong đợi: Bài chia sẻ xuất hiện ở đầu danh sánh bài viết, hiển thị đúng nội dung bài gốc của Nguyễn Hoàng Phúc kèm nhãn “đã chia sẻ bài viết của”
Kết quả thực tế: Như mong đợi (As Expected)
Trạng thái: Pass
───────────────────────────────────────────────────────────────
