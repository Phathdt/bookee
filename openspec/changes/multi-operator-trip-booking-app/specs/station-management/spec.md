## ADDED Requirements

### Requirement: Station catalog management

Hệ thống SHALL duy trì danh mục Station dùng chung cho mọi operator, mỗi Station có name, address, lat, lng, city. Chỉ admin được tạo/sửa/xoá Station.

#### Scenario: Admin creates station
- **WHEN** admin gửi POST /stations với name, address, lat, lng, city hợp lệ
- **THEN** hệ thống tạo Station mới và trả stationId

#### Scenario: Non-admin attempts to create station
- **WHEN** user có role `operator` hoặc `customer` gọi POST /stations
- **THEN** hệ thống trả 403 Forbidden

### Requirement: Station search

Hệ thống SHALL cung cấp tìm kiếm Station theo city và tên (partial match, case-insensitive, hỗ trợ tiếng Việt không dấu).

#### Scenario: Search stations by city
- **WHEN** user gọi GET /stations?city=HCM
- **THEN** hệ thống trả danh sách Station có city = "HCM" được sắp xếp theo name

#### Scenario: Fuzzy name search
- **WHEN** user gọi GET /stations?q=mien-dong
- **THEN** hệ thống trả về Station có tên chứa "miền đông" (không phân biệt dấu)

### Requirement: Station geolocation

Hệ thống SHALL lưu lat/lng dạng decimal degrees (WGS84) cho mỗi Station và SHALL từ chối tạo Station nếu lat ngoài [-90, 90] hoặc lng ngoài [-180, 180].

#### Scenario: Invalid coordinates rejected
- **WHEN** admin tạo Station với lat = 200
- **THEN** hệ thống trả 400 Bad Request với chi tiết lỗi

### Requirement: Station deletion safeguard

Hệ thống SHALL từ chối xoá Station nếu vẫn còn Route hoặc Trip đang reference đến Station đó.

#### Scenario: Delete station with active routes
- **WHEN** admin gọi DELETE /stations/{id} mà stationId đang được dùng trong Route
- **THEN** hệ thống trả 409 Conflict với thông báo "station in use"
