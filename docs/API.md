# ASTRA App - Backend API Routes

All endpoints use JSON payloads and return standardized responses. In this skeleton version, endpoints return hardcoded placeholder structures or HTTP 501 Not Implemented stubs.

| Method | Path                        | Description                                        | Access / Role     | Implementation Status            |
| :----- | :-------------------------- | :------------------------------------------------- | :---------------- | :------------------------------- |
| `GET`  | `/health`                   | Service health status check                        | Public            | Implemented (`{ status: "ok" }`) |
| `POST` | `/auth/login`               | Login with credentials or token                    | Public            | Stub (TODO: AI/Backend)          |
| `GET`  | `/auth/me`                  | Fetch authenticated member profile                 | Authenticated     | Stub (TODO: AI/Backend)          |
| `GET`  | `/members/me/id`            | Get digital ID data and QR token                   | Authenticated     | Stub (TODO: AI/Backend)          |
| `GET`  | `/verify/:token`            | Validate digital ID QR token                       | Officer / Partner | Stub (TODO: AI/Backend)          |
| `GET`  | `/points/me`                | Get member current points balance                  | Authenticated     | Stub (TODO: AI/Backend)          |
| `GET`  | `/points/me/history`        | Get member points transaction history              | Authenticated     | Stub (TODO: AI/Backend)          |
| `POST` | `/points/grant`             | Grant points to a member                           | Officer           | Stub (TODO: AI/Backend)          |
| `GET`  | `/events`                   | List upcoming and past events                      | Authenticated     | Stub (TODO: AI/Backend)          |
| `POST` | `/events/:id/checkin`       | Check in member to an event                        | Authenticated     | Stub (TODO: AI/Backend)          |
| `GET`  | `/perks`                    | List available partner perks                       | Authenticated     | Stub (TODO: AI/Backend)          |
| `POST` | `/perks/:id/redeem`         | Redeem points for partner voucher                  | Authenticated     | Stub (TODO: AI/Backend)          |
| `GET`  | `/vouchers/me`              | List vouchers claimed by current member            | Authenticated     | Stub (TODO: AI/Backend)          |
| `GET`  | `/vouchers/:id`             | Get details and status of voucher                  | Authenticated     | Stub (TODO: AI/Backend)          |
| `GET`  | `/astrascend/opportunities` | List active ASTRAscend service opportunities       | Public            | Stub (TODO: AI/Backend)          |
| `POST` | `/attendance/checkin`       | Officer check-in: record attendance + award points | Officer / Admin   | **Implemented**                  |
| `GET`  | `/attendance/:eventId`      | Get all check-in records for an event              | Officer / Admin   | **Implemented**                  |
| `POST` | `/partner/validate`         | Validate a voucher code for a partner              | Partner / Admin   | **Implemented**                  |
| `POST` | `/partner/apply`            | Apply (mark used) a validated voucher              | Partner / Admin   | **Implemented**                  |

---

## Attendance Check-In Endpoints

### `POST /attendance/checkin`

Records a member's attendance at an event and awards attendance points.

**Required Role:** `officer` or `admin`

**Request Body:**

```json
{
  "srCode": "S1001",
  "eventId": "EVT-001",
  "points": 10
}
```

| Field     | Type     | Required | Description                                                                      |
| :-------- | :------- | :------- | :------------------------------------------------------------------------------- |
| `srCode`  | `string` | ✅       | Student / SR code (trimmed and uppercased automatically)                         |
| `eventId` | `string` | ✅       | Event identifier                                                                 |
| `points`  | `number` | ❌       | Override points to award (defaults to `ATTENDANCE_POINTS` env var, default `10`) |

**Response (HTTP 200 — always, even on business failure):**

```json
{ "awarded": true, "points": 10, "newBalance": 25 }
```

```json
{ "awarded": false, "reason": "already_checked_in" }
```

```json
{ "awarded": false, "reason": "invalid_member" }
```

```json
{ "awarded": false, "reason": "points_error" }
```

| `reason` value       | Meaning                                                |
| :------------------- | :----------------------------------------------------- |
| `already_checked_in` | Member already has an attendance record for this event |
| `invalid_member`     | No member found with the given SR code                 |
| `points_error`       | Points write failed; attendance row was rolled back    |

**Error Responses:**

| Status | Condition                                                       |
| :----- | :-------------------------------------------------------------- |
| `400`  | `srCode` or `eventId` missing / empty                           |
| `401`  | No valid auth token (when auth middleware is fully implemented) |
| `403`  | Insufficient role (when auth middleware is fully implemented)   |

---

### `GET /attendance/:eventId`

Retrieves all check-in records for a specific event.

**Required Role:** `officer` or `admin`

**URL Parameters:**

| Parameter | Type     | Description      |
| :-------- | :------- | :--------------- |
| `eventId` | `string` | Event identifier |

**Response (HTTP 200):**

```json
{
  "attendance": [
    {
      "id": "att-123",
      "srCode": "S1001",
      "fullName": "Jane Doe",
      "checkedInAt": "2026-11-09T13:00:00.000Z"
    }
  ]
}
```

---

## Partner Redemption Endpoints

### `POST /partner/validate`

Validates a voucher code without consuming it. Used by partner staff to preview the reward before applying.

**Required Role:** `partner` or `admin`

**Request Body:**

```json
{
  "code": "NEXCAFE-001",
  "partner": "NexCafe"
}
```

| Field     | Type     | Required | Description                              |
| :-------- | :------- | :------- | :--------------------------------------- |
| `code`    | `string` | ✅       | Voucher code (case-insensitive)          |
| `partner` | `string` | ✅       | Partner name as registered in the system |

**Response (HTTP 200 — always, even on business failure):**

```json
{
  "valid": true,
  "reason": "ok",
  "reward": "Free Latte",
  "expiresAt": "2027-12-31T23:59:59.000Z"
}
```

```json
{ "valid": false, "reason": "not_found" }
```

```json
{ "valid": false, "reason": "wrong_partner" }
```

```json
{ "valid": false, "reason": "expired" }
```

```json
{ "valid": false, "reason": "already_used" }
```

| `reason` value  | Meaning                                                              |
| :-------------- | :------------------------------------------------------------------- |
| `ok`            | Voucher is active, unexpired, and belongs to this partner            |
| `not_found`     | No voucher with this code exists                                     |
| `wrong_partner` | Code exists but belongs to a different partner                       |
| `expired`       | Code is past its `expiresAt` timestamp (even if `status = 'active'`) |
| `already_used`  | Voucher has already been redeemed (`status = 'used'`)                |

> [!NOTE] The validate response **never** includes member personal data (name, email, studentId).

**Error Responses:**

| Status | Condition                           |
| :----- | :---------------------------------- |
| `400`  | `code` or `partner` missing / empty |
| `401`  | No valid auth token                 |
| `403`  | Insufficient role                   |

---

### `POST /partner/apply`

Marks a voucher as used. Should be called only after `validate` confirms `{ valid: true }`.

**Required Role:** `partner` or `admin`

**Request Body:** Same as `/partner/validate`

```json
{
  "code": "NEXCAFE-001",
  "partner": "NexCafe"
}
```

**Response (HTTP 200):**

```json
{ "applied": true, "reason": "ok", "reward": "Free Latte" }
```

```json
{ "applied": false, "reason": "already_used" }
```

```json
{ "applied": false, "reason": "not_found" }
```

```json
{ "applied": false, "reason": "wrong_partner" }
```

```json
{ "applied": false, "reason": "expired" }
```

> [!IMPORTANT] The apply operation re-validates all conditions atomically. A voucher that becomes expired or is used by a concurrent request between validate and apply will return `{ applied: false }`. In production, this uses a PostgreSQL conditional UPDATE to guarantee exactly-once semantics.

**Seeded test vouchers (for development/testing):**

| Code          | Partner  | Status  |
| :------------ | :------- | :------ |
| `NEXCAFE-001` | NexCafe  | Active  |
| `BEANB-001`   | BeanBrew | Active  |
| `USED-001`    | NexCafe  | Used    |
| `EXP-001`     | NexCafe  | Expired |
