## ADDED Requirements

### Requirement: Seat layout creation

Hệ thống SHALL cho phép admin tạo SeatLayout dùng chung với name, rows, cols, và mảng Seat con. Mỗi Seat có code, floor, row, col. SeatLayout là tài nguyên global, không thuộc operator nào riêng.

#### Scenario: Admin creates layout for limousine
- **WHEN** admin gửi POST /seat-layouts với name = "Limousine 22 seats", rows = 8, cols = 3 và mảng 22 seat
- **THEN** hệ thống tạo SeatLayout và toàn bộ Seat con trong một transaction

#### Scenario: Operator attempts to create layout
- **WHEN** operator staff gọi POST /seat-layouts
- **THEN** hệ thống trả 403 Forbidden

### Requirement: Seat uniqueness within layout

Hệ thống SHALL enforce mỗi seat code MUST unique trong cùng một SeatLayout. Cặp (floor, row, col) cũng MUST unique trong cùng layout.

#### Scenario: Duplicate seat code in same layout
- **WHEN** admin tạo SeatLayout với 2 seat cùng code "A01"
- **THEN** hệ thống trả 400 Bad Request

#### Scenario: Same code across different layouts allowed
- **WHEN** admin tạo SeatLayout B chứa seat code "A01" trong khi SeatLayout A khác cũng có "A01"
- **THEN** hệ thống chấp nhận vì code chỉ unique theo layoutId

### Requirement: Seat layout reuse

Hệ thống SHALL cho phép nhiều Vehicle (cả cùng operator và khác operator) cùng tham chiếu một SeatLayout. Việc xoá hoặc sửa cấu trúc seat trong layout SHALL bị cấm nếu vẫn có Vehicle đang dùng.

#### Scenario: Modify seats in used layout
- **WHEN** admin cố thêm/xoá seat trong SeatLayout đang được tham chiếu bởi ≥ 1 Vehicle
- **THEN** hệ thống trả 409 Conflict

#### Scenario: Rename layout name allowed
- **WHEN** admin đổi `SeatLayout.name` (không đổi seats)
- **THEN** hệ thống cho phép

### Requirement: Seat metadata for booking UI

Hệ thống SHALL cung cấp endpoint GET /seat-layouts/{id} trả về toàn bộ Seat của layout với thông tin code, floor, row, col để client render sơ đồ ghế khi user chọn ghế.

#### Scenario: Fetch layout for booking flow
- **WHEN** customer gọi GET /seat-layouts/{id}
- **THEN** hệ thống trả layout + danh sách seat sắp xếp theo floor, row, col
