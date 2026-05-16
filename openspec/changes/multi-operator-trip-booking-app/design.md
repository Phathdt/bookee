## Context

Đây là greenfield project — chưa có codebase, chưa có dependency. Domain là đặt vé xe khách liên tỉnh đa nhà xe (multi-operator intercity bus booking) tại thị trường Việt Nam.

Hai đặc trưng định hình toàn bộ kiến trúc:
1. **Đa nhà xe (multi-tenant soft)**: Cùng platform phục vụ nhiều nhà xe (Futa, Thành Bưởi, Kumho…). Mỗi nhà xe quản lý đội xe, tuyến, chuyến riêng nhưng dùng chung station catalog và seat layout catalog.
2. **Concurrency cao tại booking**: Cùng một ghế chỉ được bán một lần — bottleneck rõ ràng tại bước chọn ghế trên các trip hot (lễ, Tết). Cần locking layer.

Stakeholders: customer (mobile/web), operator staff (admin portal), driver (mobile app check-in), platform admin (ops dashboard).

## Goals / Non-Goals

**Goals:**
- Domain model 14 entity tách bạch rõ giữa template (Route, SeatLayout) và instance (Trip, Vehicle, Seat assignment).
- Backend API thống nhất phục vụ cả customer app, operator portal, driver app.
- Chống double-booking ghế trong điều kiện concurrency cao.
- Plug-in được nhiều cổng thanh toán (Momo, ZaloPay, VNPay, Stripe) qua interface thống nhất.
- Vé điện tử QR check-in được offline tại bến.

**Non-Goals:**
- Không xây hệ thống GPS tracking xe real-time trong scope này.
- Không làm loyalty/membership tier system — chỉ có coupon đơn giản.
- Không hỗ trợ đặt xe hợp đồng/charter — chỉ vé lẻ theo trip có lịch cố định.
- Không xử lý hoàn tiền tự động — refund làm thủ công bởi operator staff.
- Không tích hợp với hệ thống bán vé nội bộ hiện có của các nhà xe — họ phải dùng portal của platform.

## Decisions

### 1. Stack: NestJS + PostgreSQL + Redis + React/Next.js

**Quyết định**: Backend dùng NestJS (TypeScript), DB chính là PostgreSQL, Redis cho cache + seat lock, frontend customer dùng Next.js, operator portal dùng React SPA.

**Lý do**:
- NestJS có sẵn module/DI/guards phù hợp multi-role API; team đã có nestjs-expert agent.
- PostgreSQL hỗ trợ transaction mạnh, JSONB cho metadata payment, indexing tốt cho tìm kiếm trip.
- Redis cần thiết để giữ ghế tạm (TTL lock) trong quá trình thanh toán.

**Phương án thay thế**: 
- MongoDB → loại vì cần ACID transaction cho booking flow.
- Go/Fastify → loại vì team productivity với TypeScript cao hơn.

### 2. Route vs Trip — template/instance split

**Quyết định**: `Route` là template tuyến (SG → Đà Lạt) gắn với operator. `Trip` là instance thực tế (8PM 20/5, xe 51B-12345). Lịch chạy hàng ngày sinh Trip từ Route qua job định kỳ (hoặc operator tạo tay).

**Lý do**: Một Route có thể có hàng ngàn Trip theo năm. Tách giúp:
- Operator quản lý lịch chạy độc lập với mô tả tuyến.
- Tìm kiếm trip theo ngày chỉ query bảng Trip với index `(fromStationId, toStationId, departureTime)`.
- Giá có thể override theo Trip (dịp lễ) thông qua `Trip.basePrice`.

### 3. SeatLayout tái sử dụng — không nhúng vào Vehicle

**Quyết định**: `Seat` thuộc về `SeatLayout`, không thuộc `Vehicle`. Một SeatLayout (ví dụ "Limousine 22 ghế 3 hàng") dùng chung cho nhiều vehicle cùng loại. `BookingSeat` reference đến `Seat.id` (trong layout) — kết hợp với `Trip.vehicleId` để biết xe nào.

**Lý do**: Nhà xe có hàng chục xe cùng layout — không lý do gì tạo 30 bản copy của cùng sơ đồ ghế. Cập nhật layout (đổi tên ghế, đổi sơ đồ) chỉ phải sửa một chỗ.

**Trade-off**: Khi cần "ghế A01 trên xe X cho trip Y", phải join 3 bảng (Trip → Vehicle → SeatLayout → Seat). Chấp nhận được vì có index.

### 4. Seat locking strategy — Redis distributed lock với TTL

**Quyết định**: Khi user bấm "Chọn ghế" → backend ghi vào Redis key `seat-lock:{tripId}:{seatId}` với value = `bookingId`, TTL 10 phút. Khi thanh toán xong, lock được xoá và `BookingSeat` được persist permanent vào DB. Nếu user bỏ ngang hoặc quá TTL, lock tự hết hạn, ghế trở lại available.

**Lý do**: 
- DB-level pessimistic lock trên row không scale tốt khi nhiều người cùng vào một trip hot.
- Redis SET với NX + EX là atomic, đủ mạnh cho use case này.

**Phương án thay thế**:
- DB row lock với `SELECT FOR UPDATE`: dễ cài, nhưng tạo contention nặng trên trip hot.
- Optimistic concurrency với version column: phải retry — UX kém khi user vừa chọn lại bị mất ghế.

**Risk**: Redis fail → fallback policy: từ chối booking mới với thông báo lỗi, không cho phép bypass locking (better safe than double-booked).

### 5. Payment provider abstraction — Strategy pattern

**Quyết định**: Interface `IPaymentProvider` với 4 implementation (Momo, ZaloPay, VNPay, Stripe). Mỗi provider tự xử lý: tạo payment URL, verify callback signature, parse webhook. Booking service chỉ gọi qua interface.

**Lý do**: Mỗi cổng có flow rất khác (Momo dùng signature HMAC, VNPay dùng query string sort + hash, Stripe dùng webhook signing secret). Strategy pattern cô lập đặc thù từng provider.

**Webhook security**: Mọi webhook endpoint phải verify signature trước khi update booking status. Idempotent theo `Payment.transactionId`.

### 6. Multi-role auth — JWT với role claim

**Quyết định**: JWT chứa `userId` + `role` (customer/operator/driver/admin) + `operatorId` (nullable, áp dụng cho operator staff và driver). NestJS guard kiểm tra role tại từng endpoint. Operator staff chỉ thấy dữ liệu thuộc `operatorId` của họ qua row-level filter trong service layer.

**Lý do**: Đơn giản, không cần OAuth provider bên ngoài giai đoạn đầu. Có thể thêm Google/Facebook OAuth cho customer sau.

### 7. Ticket QR — signed payload, offline verifiable

**Quyết định**: QR chứa JWT payload signed bởi platform private key, gồm `bookingSeatId`, `tripId`, `seatCode`, `passengerName`, `expiresAt`. Driver app có public key để verify offline. Khi check-in, app gọi API mark `Ticket.status = used` (nếu online) hoặc cache local rồi sync sau (nếu offline).

**Lý do**: Bến xe có thể mất sóng — vé phải verify được offline. JWT-signed QR giải quyết bài toán này; nguy cơ duplicate scan được handle ở tầng app + sync.

### 8. Passenger ≠ User

**Quyết định**: `Passenger` là entity riêng, không reference đến `User.id`. Một user có thể đặt vé cho người khác (gia đình, đồng nghiệp). Passenger.idCard lưu để xuất vé và xác minh tại bến (yêu cầu pháp lý ở VN với một số tuyến).

**Compliance**: idCard là dữ liệu nhạy cảm theo Nghị định 13/2023 — phải mã hoá at-rest, log truy cập, có cơ chế xoá theo yêu cầu.

## Risks / Trade-offs

- **[Double booking khi Redis fail]** → Mitigation: Circuit breaker chuyển sang "maintenance mode" từ chối booking mới; KHÔNG fallback sang DB lock vì gây nghẽn.
- **[Payment webhook bị replay]** → Mitigation: Verify signature + idempotent theo `transactionId` (unique index); ignore nếu booking đã ở trạng thái `paid`.
- **[idCard rò rỉ]** → Mitigation: Mã hoá AES-256 at-rest với key trong KMS; log mọi truy cập; chỉ trả mã ẩn (`***1234`) trong API response trừ khi có permission `view_passenger_full`.
- **[Trip hot bị flood request]** → Mitigation: Rate limit theo IP + userId tại booking endpoint; queue request nếu cần.
- **[Operator nhập sai lịch trùng giờ cùng xe]** → Mitigation: Validation trong service tạo Trip — không cho 2 Trip cùng `vehicleId` có khoảng thời gian overlap.
- **[Migration sau này thêm operator mới]** → Mitigation: Operator onboarding qua admin approval, không tự động; có sandbox env để test trước khi go-live.
- **[Schema thay đổi khi scale]** → Mitigation: Dùng migration tool (TypeORM/Prisma); version API endpoint từ đầu (`/api/v1`).

## Migration Plan

Không có hệ thống cũ — deploy lần đầu. Thứ tự rollout đề xuất:
1. Phase 1: Core entities + auth + operator portal (operator tự nhập route/vehicle/trip).
2. Phase 2: Customer search + booking flow + Momo/VNPay (cổng VN trước).
3. Phase 3: QR ticket + driver app check-in.
4. Phase 4: Coupon + thêm cổng thanh toán còn lại + analytics.

Rollback: Vì greenfield, rollback = scale down deploy. Database backup hàng ngày + PITR cho 7 ngày.

## Open Questions

- Cần xác định: Platform có thu phí giao dịch từ operator không? Nếu có → cần entity `Settlement` để tính toán payout cho operator (chưa có trong scope hiện tại).
- Cơ chế hoàn vé: ai chịu phí (operator/platform/customer)? Quy định hoàn vé theo thời gian (>24h: hoàn 90%, etc.)?
- Có cần i18n không (English UI cho khách nước ngoài)? Hiện tại assume Vietnamese only.
- Số điện thoại có cần OTP verify khi đăng ký không? Đề xuất: có, nhưng có thể defer sang phase 2.
