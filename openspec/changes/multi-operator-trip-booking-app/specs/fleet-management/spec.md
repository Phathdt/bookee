## ADDED Requirements

### Requirement: Vehicle registration

Hệ thống SHALL cho phép operator staff đăng ký Vehicle thuộc operator của họ với plateNumber, type (`sleeper`/`limousine`/`seater`), seatLayoutId, totalSeats. plateNumber MUST unique trên toàn hệ thống.

#### Scenario: Operator registers new vehicle
- **WHEN** operator staff gửi POST /vehicles với plateNumber chưa tồn tại, seatLayoutId hợp lệ
- **THEN** hệ thống tạo Vehicle gắn với operatorId của staff và trả vehicleId

#### Scenario: Duplicate plate number
- **WHEN** operator đăng ký vehicle với plateNumber đã tồn tại (kể cả thuộc operator khác)
- **THEN** hệ thống trả 409 Conflict

#### Scenario: Invalid seat layout
- **WHEN** operator đăng ký vehicle với seatLayoutId không tồn tại
- **THEN** hệ thống trả 400 Bad Request

### Requirement: Vehicle totalSeats consistency

Hệ thống SHALL validate `Vehicle.totalSeats` khớp với số Seat trong SeatLayout được gán. Nếu không khớp, request MUST bị từ chối.

#### Scenario: Mismatched seat count
- **WHEN** operator đăng ký vehicle với totalSeats = 30 nhưng SeatLayout có 22 seats
- **THEN** hệ thống trả 400 Bad Request

### Requirement: Vehicle listing per operator

Hệ thống SHALL cho phép operator staff liệt kê và tìm kiếm Vehicle thuộc operator của họ theo type và plateNumber.

#### Scenario: List operator's vehicles
- **WHEN** operator staff gọi GET /vehicles?type=sleeper
- **THEN** hệ thống trả Vehicle loại sleeper thuộc operatorId của staff

### Requirement: Vehicle deletion safeguard

Hệ thống SHALL từ chối xoá Vehicle nếu vẫn còn Trip ở status active (`scheduled`, `in_progress`) tham chiếu đến.

#### Scenario: Delete vehicle with active trips
- **WHEN** operator gọi DELETE /vehicles/{id} mà vehicleId đang được dùng trong Trip active
- **THEN** hệ thống trả 409 Conflict
