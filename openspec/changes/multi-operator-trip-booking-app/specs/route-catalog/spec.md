## ADDED Requirements

### Requirement: Route creation by operator

Hệ thống SHALL cho phép operator staff tạo Route gắn với operator của họ, bao gồm fromStationId, toStationId, distanceKm, durationMinutes. From và to MUST khác nhau.

#### Scenario: Operator creates valid route
- **WHEN** operator staff gửi POST /routes với fromStationId, toStationId khác nhau và operator của họ có status = `active`
- **THEN** hệ thống tạo Route mới gắn với operatorId của staff và trả routeId

#### Scenario: Same from and to stations
- **WHEN** operator tạo Route với fromStationId = toStationId
- **THEN** hệ thống trả 400 Bad Request

#### Scenario: Cross-operator data isolation
- **WHEN** operator staff thuộc operator A cố sửa Route thuộc operator B
- **THEN** hệ thống trả 403 Forbidden

### Requirement: Route listing per operator

Hệ thống SHALL cho phép tra cứu danh sách Route theo operatorId hoặc theo cặp (fromStationId, toStationId). Endpoint công khai chỉ trả Route của operator có status = `active`.

#### Scenario: Public lists routes by stations
- **WHEN** user gọi GET /routes?from=X&to=Y (không cần auth)
- **THEN** hệ thống trả Route từ X đến Y của các operator `active`, kèm thông tin operator

### Requirement: Route validation

Hệ thống SHALL từ chối tạo Route với distanceKm ≤ 0 hoặc durationMinutes ≤ 0.

#### Scenario: Negative distance
- **WHEN** operator tạo Route với distanceKm = -10
- **THEN** hệ thống trả 400 Bad Request

### Requirement: Route update

Hệ thống SHALL cho phép operator staff cập nhật distanceKm và durationMinutes của Route do operator họ sở hữu. Việc đổi fromStationId/toStationId SHALL bị cấm — nếu cần thay đổi, phải tạo Route mới.

#### Scenario: Operator updates distance
- **WHEN** operator gửi PATCH /routes/{id} với distanceKm mới
- **THEN** hệ thống cập nhật và áp dụng cho mọi Trip tạo sau này (Trip cũ giữ giá trị tại thời điểm tạo)

#### Scenario: Attempt to change stations
- **WHEN** operator gửi PATCH /routes/{id} với fromStationId mới
- **THEN** hệ thống trả 400 Bad Request với thông báo "stations are immutable"
