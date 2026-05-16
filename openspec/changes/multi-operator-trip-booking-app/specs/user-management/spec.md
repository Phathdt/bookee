## ADDED Requirements

### Requirement: User registration

Hệ thống SHALL cho phép người dùng đăng ký tài khoản với số điện thoại, email, mật khẩu và họ tên. Mật khẩu MUST được hash với thuật toán bcrypt (cost factor ≥ 12) trước khi lưu trữ.

#### Scenario: Successful registration with phone and email
- **WHEN** user submit form đăng ký với phone, email, password, name hợp lệ và phone/email chưa tồn tại trong hệ thống
- **THEN** hệ thống tạo record User mới với role mặc định là `customer`, lưu passwordHash và trả về access token

#### Scenario: Duplicate phone or email
- **WHEN** user đăng ký với phone hoặc email đã tồn tại
- **THEN** hệ thống trả lỗi 409 Conflict với thông báo rõ trường nào bị trùng

#### Scenario: Weak password rejected
- **WHEN** user đăng ký với password ngắn hơn 8 ký tự hoặc không đáp ứng độ phức tạp tối thiểu
- **THEN** hệ thống trả lỗi 400 Bad Request và không tạo user

### Requirement: User authentication

Hệ thống SHALL hỗ trợ đăng nhập bằng cặp (phone OR email) + password và phát hành JWT chứa userId, role, operatorId (nếu có) với thời hạn tối đa 7 ngày.

#### Scenario: Login with valid credentials
- **WHEN** user gửi credentials đúng
- **THEN** hệ thống trả về access token JWT và refresh token

#### Scenario: Login with invalid credentials
- **WHEN** user gửi password sai 5 lần liên tiếp trong 15 phút
- **THEN** hệ thống tạm khoá đăng nhập tài khoản đó trong 15 phút và trả 429 Too Many Requests

### Requirement: Role-based access control

Hệ thống SHALL hỗ trợ 4 role: `customer`, `operator`, `driver`, `admin`. Mỗi API endpoint MUST khai báo role được phép truy cập.

#### Scenario: Operator staff accessing own operator data
- **WHEN** user có role `operator` với operatorId = X gọi API quản lý vehicle/route/trip
- **THEN** hệ thống chỉ trả về dữ liệu thuộc operatorId = X

#### Scenario: Customer accessing admin endpoint
- **WHEN** user có role `customer` gọi endpoint chỉ admin được truy cập
- **THEN** hệ thống trả 403 Forbidden

### Requirement: User profile management

Hệ thống SHALL cho phép user xem và cập nhật thông tin profile (name, email, phone) sau khi xác thực. Email và phone phải verify lại khi thay đổi.

#### Scenario: User updates name
- **WHEN** user authenticated gửi PATCH /users/me với name mới
- **THEN** hệ thống cập nhật và trả về user object mới

#### Scenario: User updates phone — re-verification required
- **WHEN** user đổi số điện thoại
- **THEN** hệ thống đánh dấu phone là `unverified` cho đến khi user verify OTP
