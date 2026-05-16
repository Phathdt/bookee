## ADDED Requirements

### Requirement: Search trips by stations and date

Hệ thống SHALL cung cấp endpoint công khai GET /trips/search với tham số bắt buộc fromStationId, toStationId, departureDate (YYYY-MM-DD). Endpoint trả Trip có status = `scheduled` của tất cả operator `active`.

#### Scenario: Customer searches available trips
- **WHEN** customer gọi GET /trips/search?from=X&to=Y&date=2026-06-01
- **THEN** hệ thống trả danh sách Trip cùng tên operator, loại xe, basePrice, số ghế còn trống

#### Scenario: Missing required parameter
- **WHEN** request thiếu departureDate
- **THEN** hệ thống trả 400 Bad Request

#### Scenario: Past date
- **WHEN** customer search với departureDate đã qua
- **THEN** hệ thống trả mảng rỗng (không lỗi)

### Requirement: Filter and sort search results

Hệ thống SHALL hỗ trợ filter theo operatorId (multi-select), vehicleType (`sleeper`/`limousine`/`seater`), priceMin/priceMax và sort theo departureTime, price hoặc duration.

#### Scenario: Filter by vehicle type and price
- **WHEN** customer search với vehicleType=limousine&priceMax=400000
- **THEN** hệ thống chỉ trả Trip có vehicle type = `limousine` và basePrice ≤ 400000

#### Scenario: Sort by price ascending
- **WHEN** customer search với sort=price:asc
- **THEN** hệ thống trả Trip sắp xếp theo basePrice tăng dần

### Requirement: Available seat count in search results

Mỗi Trip trong kết quả search SHALL kèm `availableSeats` = (totalSeats của vehicle - số seat đã book paid - số seat đang lock). Trip với availableSeats = 0 SHALL được đánh dấu `soldOut = true` nhưng vẫn xuất hiện trong kết quả.

#### Scenario: Sold-out trip shown with flag
- **WHEN** customer search và một Trip đã hết ghế
- **THEN** Trip vẫn xuất hiện với availableSeats = 0 và soldOut = true

### Requirement: Search performance

Hệ thống SHALL trả kết quả search trong < 500ms ở 95th percentile với database có ≥ 100k Trip. Database MUST có index trên `(fromStationId, toStationId, departureTime, status)`.

#### Scenario: P95 latency under load
- **WHEN** thực hiện 1000 request search đồng thời
- **THEN** 95% request hoàn tất trong < 500ms
