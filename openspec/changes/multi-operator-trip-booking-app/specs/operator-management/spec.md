## ADDED Requirements

### Requirement: Operator (BusCompany) registration

Hệ thống SHALL cho phép admin tạo hồ sơ nhà xe mới với name, hotline, logo và trạng thái mặc định `pending`. Một nhà xe chỉ được kích hoạt (`active`) sau khi admin duyệt thông tin pháp lý.

#### Scenario: Admin creates operator
- **WHEN** admin gửi POST /operators với name, hotline, logo hợp lệ
- **THEN** hệ thống tạo BusCompany mới với status = `pending` và trả về operatorId

#### Scenario: Duplicate operator name
- **WHEN** admin tạo operator với name đã tồn tại
- **THEN** hệ thống trả lỗi 409 Conflict

### Requirement: Operator activation

Hệ thống SHALL chỉ cho phép operator có status = `active` được tạo Route, Vehicle, Trip. Các operator ở status khác (`pending`, `suspended`) MUST bị từ chối.

#### Scenario: Pending operator attempts to create trip
- **WHEN** operator staff thuộc BusCompany có status = `pending` tạo Trip
- **THEN** hệ thống trả 403 Forbidden với thông báo "operator not active"

#### Scenario: Admin activates operator
- **WHEN** admin PATCH /operators/{id} đổi status sang `active`
- **THEN** hệ thống cập nhật và cho phép operator vận hành ngay sau đó

### Requirement: Operator profile retrieval

Hệ thống SHALL cung cấp endpoint công khai để liệt kê và xem chi tiết các operator có status = `active` với thông tin name, hotline, logo.

#### Scenario: Public lists active operators
- **WHEN** bất kỳ request nào (kể cả không auth) gọi GET /operators
- **THEN** hệ thống trả về danh sách operator có status = `active`, không bao gồm operator `pending`/`suspended`

### Requirement: Operator staff assignment

Hệ thống SHALL cho phép admin gán user (với role `operator` hoặc `driver`) vào một BusCompany cụ thể qua `User.operatorId`. Một user chỉ thuộc tối đa 1 operator.

#### Scenario: Admin assigns operator staff
- **WHEN** admin gán userId X (role = `operator`) vào operatorId Y
- **THEN** user X chỉ có quyền thao tác trên dữ liệu thuộc operatorId Y
