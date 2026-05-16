## ADDED Requirements

### Requirement: Trip creation

Hệ thống SHALL cho phép operator staff tạo Trip gắn với routeId và vehicleId, với departureTime, arrivalTime, basePrice, status mặc định = `scheduled`. routeId và vehicleId MUST cùng thuộc operator của staff.

#### Scenario: Operator creates trip
- **WHEN** operator staff gửi POST /trips với routeId và vehicleId cùng thuộc operator của họ
- **THEN** hệ thống tạo Trip với status = `scheduled` và trả tripId

#### Scenario: Cross-operator route/vehicle mismatch
- **WHEN** operator staff tạo Trip với routeId thuộc operator A và vehicleId thuộc operator B
- **THEN** hệ thống trả 400 Bad Request

#### Scenario: arrivalTime before departureTime
- **WHEN** operator tạo Trip với arrivalTime ≤ departureTime
- **THEN** hệ thống trả 400 Bad Request

### Requirement: Vehicle scheduling conflict prevention

Hệ thống SHALL từ chối tạo Trip nếu vehicleId đã có Trip khác với khoảng thời gian [departureTime, arrivalTime] giao với Trip mới.

#### Scenario: Overlapping trip on same vehicle
- **WHEN** operator tạo Trip dùng vehicle X từ 20:00–02:00 hôm sau, trong khi đã có Trip dùng X từ 18:00–22:00 cùng ngày
- **THEN** hệ thống trả 409 Conflict với thông tin Trip xung đột

### Requirement: Trip status lifecycle

Hệ thống SHALL enforce chuyển trạng thái Trip theo trình tự: `scheduled` → `in_progress` → `completed`, hoặc `scheduled` → `cancelled`. Mọi chuyển trạng thái sai SHALL bị từ chối.

#### Scenario: Operator cancels scheduled trip
- **WHEN** operator gửi PATCH /trips/{id}/status với status = `cancelled` và trip đang ở `scheduled`
- **THEN** hệ thống cập nhật status và đánh dấu booking đã `paid` cần hoàn tiền

#### Scenario: Invalid status transition
- **WHEN** operator cố đổi status từ `completed` về `scheduled`
- **THEN** hệ thống trả 400 Bad Request

### Requirement: Trip price override

Hệ thống SHALL cho phép operator thiết lập `Trip.basePrice` riêng cho từng Trip, độc lập với mặc định của Route, để xử lý giá theo mùa cao điểm/dịp lễ.

#### Scenario: Set trip-specific price
- **WHEN** operator tạo Trip với basePrice = 450000 (cao hơn mức bình thường)
- **THEN** hệ thống lưu giá và áp dụng cho mọi booking trên Trip này

### Requirement: Bulk trip generation from route

Hệ thống SHALL cung cấp endpoint cho operator tạo nhiều Trip cùng lúc từ Route và lịch chạy (ví dụ: mỗi ngày trong 30 ngày tới, departureTime = 20:00). Mỗi Trip vẫn được kiểm tra xung đột vehicle.

#### Scenario: Generate 30-day schedule
- **WHEN** operator gửi POST /trips/bulk với routeId, vehicleId, dailyDepartureTime, dateRange [2026-06-01, 2026-06-30]
- **THEN** hệ thống tạo 30 Trip (bỏ qua ngày bị xung đột, trả danh sách Trip thành công và lỗi)
