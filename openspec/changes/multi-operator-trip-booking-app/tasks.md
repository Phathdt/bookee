## 1. Project Setup & Infrastructure

- [ ] 1.1 Khởi tạo monorepo (NestJS backend + Next.js customer + React operator portal)
- [ ] 1.2 Cấu hình TypeScript strict mode, ESLint, Prettier, Husky pre-commit
- [ ] 1.3 Setup PostgreSQL + Redis qua Docker Compose cho local dev
- [ ] 1.4 Cấu hình TypeORM (hoặc Prisma) với migration tooling
- [ ] 1.5 Khởi tạo CI pipeline (lint, test, build) trên GitHub Actions
- [ ] 1.6 Thiết lập biến môi trường (.env.example) cho DB, Redis, JWT secret, payment provider keys

## 2. Database Schema & Migrations

- [ ] 2.1 Migration: bảng `users` (id, name, phone, email, password_hash, role, operator_id nullable, created_at)
- [ ] 2.2 Migration: bảng `bus_companies` (id, name, hotline, logo, status)
- [ ] 2.3 Migration: bảng `stations` (id, name, address, lat, lng, city) + index theo city
- [ ] 2.4 Migration: bảng `routes` (id, company_id, from_station_id, to_station_id, distance_km, duration_minutes)
- [ ] 2.5 Migration: bảng `seat_layouts` (id, name, rows, cols)
- [ ] 2.6 Migration: bảng `seats` (id, layout_id, code, floor, row, col) + unique (layout_id, code)
- [ ] 2.7 Migration: bảng `vehicles` (id, company_id, plate_number unique, type, seat_layout_id, total_seats)
- [ ] 2.8 Migration: bảng `trips` (id, route_id, vehicle_id, departure_time, arrival_time, base_price, status) + index search
- [ ] 2.9 Migration: bảng `bookings` (id, user_id, trip_id, total_amount, status, booking_code unique, coupon_id nullable, created_at)
- [ ] 2.10 Migration: bảng `booking_seats` (id, booking_id, seat_id, price) + unique (trip_id, seat_id) khi paid
- [ ] 2.11 Migration: bảng `passengers` (id, booking_id, full_name, phone, id_card_encrypted)
- [ ] 2.12 Migration: bảng `payments` (id, booking_id, provider, amount, status, transaction_id unique)
- [ ] 2.13 Migration: bảng `coupons` (id, code unique upper, discount_type, value, max_value nullable, usage_limit, used_count, expired_at)
- [ ] 2.14 Migration: bảng `tickets` (id, booking_seat_id unique, qr_code, status, check_in_at nullable)
- [ ] 2.15 Seed data: stations chính (Mien Dong, Mien Tay, Da Lat, Can Tho…), 2-3 seat layout mẫu, admin user

## 3. Auth & User Management Module

- [ ] 3.1 Implement bcrypt password hashing utility
- [ ] 3.2 Endpoint POST /auth/register (customer self-register)
- [ ] 3.3 Endpoint POST /auth/login (phone|email + password)
- [ ] 3.4 Endpoint POST /auth/refresh token
- [ ] 3.5 JWT strategy + AuthGuard với role + operatorId claim
- [ ] 3.6 RoleGuard decorator (@Roles) cho từng endpoint
- [ ] 3.7 Rate limit guard cho login (5 fail / 15min lock)
- [ ] 3.8 Endpoint GET/PATCH /users/me
- [ ] 3.9 Unit test auth flow + role enforcement

## 4. Operator & Admin Modules

- [ ] 4.1 CRUD endpoint /operators (admin only) — POST/GET/PATCH/DELETE
- [ ] 4.2 Endpoint PATCH /operators/{id}/status để activate/suspend
- [ ] 4.3 Endpoint công khai GET /operators (chỉ active)
- [ ] 4.4 Endpoint admin gán user vào operator (POST /operators/{id}/staff)
- [ ] 4.5 OperatorScopeGuard — tự động filter dữ liệu theo operatorId của JWT
- [ ] 4.6 Unit test operator lifecycle + cross-operator isolation

## 5. Station & Route Modules

- [ ] 5.1 CRUD endpoint /stations (admin only cho mutation, public cho query)
- [ ] 5.2 Validate lat/lng range
- [ ] 5.3 Search station với normalize Vietnamese diacritics
- [ ] 5.4 Safeguard xoá station khi có route reference
- [ ] 5.5 CRUD endpoint /routes (operator scoped)
- [ ] 5.6 Validate from != to, distanceKm > 0, durationMinutes > 0
- [ ] 5.7 Cấm đổi fromStationId/toStationId qua PATCH
- [ ] 5.8 Unit test station + route

## 6. Seat Layout & Fleet Modules

- [ ] 6.1 Endpoint POST /seat-layouts (admin) — tạo layout + seats trong 1 transaction
- [ ] 6.2 Validate seat code unique trong layout
- [ ] 6.3 Endpoint GET /seat-layouts/{id} trả full seats
- [ ] 6.4 Safeguard sửa/xoá layout khi có vehicle reference
- [ ] 6.5 Endpoint CRUD /vehicles (operator scoped)
- [ ] 6.6 Validate totalSeats khớp với SeatLayout.seats.length
- [ ] 6.7 Validate plateNumber global unique
- [ ] 6.8 Safeguard xoá vehicle khi có trip active
- [ ] 6.9 Unit test layout + vehicle

## 7. Trip Scheduling Module

- [ ] 7.1 Endpoint POST /trips (operator scoped) — tạo Trip đơn
- [ ] 7.2 Validate routeId + vehicleId cùng operator
- [ ] 7.3 Validate departure < arrival
- [ ] 7.4 Vehicle conflict check (overlapping time windows trên cùng vehicle)
- [ ] 7.5 Endpoint POST /trips/bulk — sinh nhiều trip theo dateRange + dailyDepartureTime
- [ ] 7.6 Endpoint PATCH /trips/{id}/status với state machine enforcement
- [ ] 7.7 Endpoint GET /trips (operator dashboard list)
- [ ] 7.8 Unit test conflict prevention + status lifecycle

## 8. Trip Search Module (Public)

- [ ] 8.1 Endpoint GET /trips/search với from, to, date required
- [ ] 8.2 Filter theo operatorId (multi), vehicleType, priceMin, priceMax
- [ ] 8.3 Sort theo departureTime, price, duration
- [ ] 8.4 Tính availableSeats = totalSeats - paidSeats - lockedSeats
- [ ] 8.5 DB index (from_station_id, to_station_id, departure_time, status)
- [ ] 8.6 Performance test P95 < 500ms với 100k+ trip
- [ ] 8.7 Cache layer (Redis) cho query phổ biến với TTL ngắn

## 9. Seat Booking Module

- [ ] 9.1 SeatLockService với Redis: lock(tripId, seatIds, bookingId, ttl=600)
- [ ] 9.2 Atomic multi-seat lock (Lua script) để chống race condition
- [ ] 9.3 Endpoint POST /bookings — tạo Booking + lock seat + lưu Passenger
- [ ] 9.4 Generate bookingCode unique 8 ký tự (loại bỏ 0/O/I/1)
- [ ] 9.5 AES-256 encrypt idCard at-rest, mask trong response
- [ ] 9.6 Validate số Passenger = số seat
- [ ] 9.7 Endpoint GET /bookings/me (auth) + GET /bookings/lookup (guest với code+phone)
- [ ] 9.8 Endpoint POST /bookings/{id}/cancel (chỉ pending)
- [ ] 9.9 Background job: chuyển booking pending hết TTL sang expired + gỡ lock
- [ ] 9.10 Unit test concurrency với jest parallel + integration test với Redis thật

## 10. Payment Processing Module

- [ ] 10.1 Interface IPaymentProvider (createPayment, verifyWebhook, parseTransaction)
- [ ] 10.2 Implementation MomoProvider (HMAC signature)
- [ ] 10.3 Implementation VnpayProvider (sort query + hash)
- [ ] 10.4 Implementation ZalopayProvider
- [ ] 10.5 Implementation StripeProvider (webhook signing secret)
- [ ] 10.6 Endpoint POST /payments — tạo Payment + trả paymentUrl
- [ ] 10.7 Webhook endpoint cho mỗi provider với signature verify
- [ ] 10.8 Idempotency qua transactionId unique constraint
- [ ] 10.9 Transactional success handler: update Booking → paid, convert lock → BookingSeat, issue Ticket
- [ ] 10.10 Background job: timeout Payment sau 15 phút không có webhook
- [ ] 10.11 Integration test với mock webhook payload từng provider

## 11. Promotion & Coupon Module

- [ ] 11.1 CRUD endpoint /coupons (admin only)
- [ ] 11.2 Validate code unique uppercase, percent value 0-100, expiredAt future
- [ ] 11.3 Endpoint POST /bookings/{id}/apply-coupon — validate + tính discount
- [ ] 11.4 Tăng usedCount khi Booking → paid (hook trong payment success transaction)
- [ ] 11.5 Endpoint GET /coupons (admin) với filter status
- [ ] 11.6 Unit test coupon logic + edge cases (max value cap, exhausted, expired)

## 12. Ticket Issuance Module

- [ ] 12.1 Setup RS256 keypair + lưu private key trong KMS/secret manager
- [ ] 12.2 TicketService.issueTickets(booking) — chạy trong payment success transaction
- [ ] 12.3 Generate JWT QR payload với ticketId, bookingSeatId, tripId, seatCode, passengerName, expiresAt
- [ ] 12.4 Endpoint GET /bookings/{code}/tickets — trả QR PNG data URI
- [ ] 12.5 Endpoint POST /tickets/{id}/check-in (driver role) với trip ownership check
- [ ] 12.6 Idempotent ticket issuance qua bookingSeatId unique
- [ ] 12.7 Endpoint invalidate ticket khi Booking cancel sau khi paid
- [ ] 12.8 Public key endpoint hoặc bundled trong driver app cho offline verify
- [ ] 12.9 Unit test QR sign/verify + check-in flow

## 13. Customer Frontend (Next.js)

- [ ] 13.1 Setup Next.js project + Tailwind + auth provider
- [ ] 13.2 Trang search trip với form from/to/date + result list
- [ ] 13.3 Trang chi tiết trip với seat map (render từ SeatLayout)
- [ ] 13.4 Flow chọn ghế + nhập passenger info
- [ ] 13.5 Trang payment chọn provider + redirect
- [ ] 13.6 Trang my bookings + xem ticket QR
- [ ] 13.7 Auth pages (login/register) + profile page
- [ ] 13.8 i18n setup (tiếng Việt mặc định)

## 14. Operator Portal (React SPA)

- [ ] 14.1 Setup React + Vite + auth (operator/admin role)
- [ ] 14.2 Dashboard: hôm nay có bao nhiêu trip, doanh thu
- [ ] 14.3 CRUD UI: routes, vehicles, trips
- [ ] 14.4 Bulk trip generator UI (chọn route, vehicle, dateRange, time)
- [ ] 14.5 Booking list + status filter
- [ ] 14.6 Admin-only: operators, seat layouts, stations, coupons CRUD

## 15. Driver Mobile App (later phase placeholder)

- [ ] 15.1 Spec & wireframe driver app — scan QR + offline verify
- [ ] 15.2 Bundle public key trong app build
- [ ] 15.3 Offline check-in queue + sync logic

## 16. Security Hardening

- [ ] 16.1 Rate limit toàn cục theo IP cho public endpoints
- [ ] 16.2 Helmet + CORS + CSRF cho frontend
- [ ] 16.3 Audit log mọi truy cập passenger.idCard
- [ ] 16.4 Secrets management qua AWS Secrets Manager / Vault
- [ ] 16.5 Dependency scanning (npm audit, snyk) trong CI
- [ ] 16.6 Pen-test booking flow (race conditions, replay, IDOR)

## 17. Observability

- [ ] 17.1 Structured logging với requestId correlation
- [ ] 17.2 Metrics: booking success rate, payment success rate, seat lock contention
- [ ] 17.3 Alerts: Redis down, payment provider 5xx burst, expired booking spike
- [ ] 17.4 Distributed tracing (OpenTelemetry) cho booking → payment → ticket flow

## 18. Testing & QA

- [ ] 18.1 Unit test coverage ≥ 80% cho business logic services
- [ ] 18.2 Integration test full booking flow với DB + Redis
- [ ] 18.3 Load test trip search (1000 RPS) + booking endpoint (100 concurrent same trip)
- [ ] 18.4 E2E test (Playwright) customer happy path
- [ ] 18.5 Chaos test: kill Redis mid-booking, verify fail-safe behavior

## 19. Documentation

- [ ] 19.1 OpenAPI spec auto-generated từ NestJS controllers
- [ ] 19.2 Tài liệu onboarding operator (markdown trong /docs)
- [ ] 19.3 Tài liệu integration payment provider (sandbox keys, webhook URLs)
- [ ] 19.4 Sơ đồ ERD database
- [ ] 19.5 Sơ đồ sequence booking flow + payment webhook

## 20. Deployment & Launch

- [ ] 20.1 Dockerfile production cho backend + frontend
- [ ] 20.2 Kubernetes manifest (hoặc ECS) với separate service: api, worker, scheduler
- [ ] 20.3 Database backup hàng ngày + PITR 7 ngày
- [ ] 20.4 Staging environment với sandbox payment keys
- [ ] 20.5 Production env với real keys, secrets từ vault
- [ ] 20.6 Smoke test sau deploy production
- [ ] 20.7 Pilot với 1 operator nhỏ trước khi mở rộng
