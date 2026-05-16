# @bookee/api-client

Type-safe API client for FE apps. Generated from the NestJS OpenAPI spec via Orval.

## Outputs (committed)

```
packages/api-client/
├── openapi.yaml                       # snapshot from apps/backend
├── src/
│   ├── axios-instance.ts              # mutator (auth header, envelope unwrap)
│   ├── index.ts                       # public entry — hooks + axios
│   ├── zod-index.ts                   # public entry — zod schemas
│   └── generated/                     # ⚠️ DO NOT EDIT — regenerated
│       ├── bookeeAPI.schemas.ts       # interfaces + enums
│       └── <tag>/
│           ├── <tag>.ts               # React Query hooks
│           └── <tag>.zod.ts           # Zod schemas
└── orval.config.ts
```

## Workflow

```
NestJS controller change
  → bun run openapi:export   # apps/backend dumps openapi.yaml
  → bun run codegen          # orval regenerates src/generated
  → FE consumes              # via import { useXxx } from '@bookee/api-client'
```

Commit both `openapi.yaml` and `src/generated/**` so PR diffs show the contract change alongside FE impact.

## Conventions for backend authors

**Every controller method MUST have explicit `operationId`:**

| Verb pattern       | HTTP          | operationId     | Generated hook     |
| ------------------ | ------------- | --------------- | ------------------ |
| `get<Resource>`    | GET /x/:id    | `getBooking`    | `useGetBooking`    |
| `list<Resources>`  | GET /x        | `listBookings`  | `useListBookings`  |
| `create<Resource>` | POST /x       | `createBooking` | `useCreateBooking` |
| `update<Resource>` | PATCH /x/:id  | `updateBooking` | `useUpdateBooking` |
| `delete<Resource>` | DELETE /x/:id | `deleteBooking` | `useDeleteBooking` |
| `<verb><Resource>` | action        | `cancelBooking` | `useCancelBooking` |

Without an explicit operationId, Nest auto-generates ugly names like `useHealthControllerCheck`.

**DTO annotation:**

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-of-trip' })
  tripId!: string;

  @ApiPropertyOptional({ example: 'PROMO2026' })
  couponCode?: string;
}
```

Required fields MUST use `@ApiProperty()`. Optional MUST use `@ApiPropertyOptional()` (or `?` modifier + Swagger plugin). Otherwise FE types become unreliable.

**Controller tag** (file grouping):

```ts
@ApiTags('bookings')
@Controller('bookings')
export class BookingsController { ... }
```

Generated files land at `src/generated/bookings/bookings.ts`.

## Usage in FE

```tsx
import { useGetHealth, type HealthResponseDto } from '@bookee/api-client';

function StatusBadge() {
  const { data } = useGetHealth<HealthResponseDto>();
  return <span>{data?.status ?? 'loading'}</span>;
}
```

Runtime validation (optional):

```ts
import { getHealthResponse } from '@bookee/api-client/zod';
const parsed = getHealthResponse.parse(unknownData);
```

## Customizing requests

```ts
import { setAuthToken, setApiBaseUrl } from '@bookee/api-client';

setApiBaseUrl(import.meta.env.VITE_API_URL); // do once at bootstrap
setAuthToken(token); // call after login
setAuthToken(null); // call on logout
```

## Regenerating after merge conflicts

If two branches edit different endpoints, `openapi.yaml` may conflict. Resolve the conflict in `openapi.yaml` manually (or regenerate from your branch's backend code), then **always** run:

```bash
bun run codegen
```

Commit the resulting `src/generated/**` changes.
