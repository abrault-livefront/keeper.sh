# keeper.sh API

## Overview

The keeper.sh API is a Bun HTTP server using Next.js-style filesystem routing. It exposes two sets of endpoints:

- **Internal API** (`/api/**`) — used by the web dashboard, authenticated via session cookie (Better Auth).
- **Public API v1** (`/api/v1/**`) — intended for external integrations, authenticated via Bearer token.

---

## Authentication

### Session Auth (Internal API)

Most internal endpoints require a valid session cookie set by Better Auth after sign-in. Requests without a valid session return `401 Unauthorized`.

Two cookies are set on every successful sign-in:
- `better-auth.session_token` — HttpOnly, SameSite=Lax. The actual session credential used by the API.
- `keeper.has_session=1` — non-HttpOnly, SameSite=Lax. A JS-readable flag that indicates a session exists without exposing the token.

On sign-out (or when a session is found to be invalid), both cookies are cleared.

### Bearer Token Auth (Public API v1)

The v1 public API uses API tokens. Create a token via `POST /api/tokens` (requires session auth). The raw token is returned once at creation time — store it securely. Pass it as a standard Bearer token:

```
Authorization: Bearer <token>
```

---

## Auth Endpoints

Auth is handled by [Better Auth](https://www.better-auth.com/) at `/api/auth/**`. The exact endpoints available depend on how the server is configured.

#### `GET /api/auth/capabilities`

Returns the server's auth capabilities. Call this first to discover which sign-in methods are available.

**Response `200`**
```json
{
  "commercialMode": false,
  "credentialMode": "username",
  "requiresEmailVerification": false,
  "socialProviders": {
    "google": true,
    "microsoft": false
  },
  "supportsChangePassword": true,
  "supportsPasskeys": false,
  "supportsPasswordReset": false
}
```

| Field | Description |
|-------|-------------|
| `commercialMode` | When `true`, email/password auth is used instead of username/password |
| `credentialMode` | `"username"` (self-hosted) or `"email"` (commercial) |
| `requiresEmailVerification` | When `true`, email must be verified before the session is active |
| `socialProviders` | Which OAuth providers are enabled |
| `supportsPasskeys` | Whether WebAuthn passkey auth is available |
| `supportsPasswordReset` | Whether forgot-password flow is available |

---

### Username / Password (self-hosted mode)

Active when `commercialMode` is `false`.

#### `POST /api/auth/username-only/sign-up`

Creates a new account and starts a session.

**Request body**
```json
{
  "username": "string",
  "password": "string",
  "name": "string"
}
```

| Field | Required | Constraints |
|-------|----------|-------------|
| `username` | yes | 3–32 chars, `/^[a-zA-Z0-9._-]+$/` |
| `password` | yes | 8–128 chars |
| `name` | no | Display name; defaults to username |

**Response `200`**
```json
{
  "session": {
    "id": "string",
    "token": "string",
    "userId": "string",
    "expiresAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "user": {
    "id": "string",
    "username": "string",
    "name": "string",
    "email": "string",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

Sets `better-auth.session_token` and `keeper.has_session` cookies.

**Errors**
- `400` — `{ "message": "username already taken" }`

#### `POST /api/auth/username-only/sign-in`

Signs in with username and password.

**Request body**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response `200`** — same shape as sign-up response. Sets session cookies.

**Errors**
- `401` — `{ "message": "invalid username or password" }` (same message for all failure cases to prevent enumeration)

---

### Email / Password (commercial mode)

Active when `commercialMode` is `true`.

#### `POST /api/auth/sign-up/email`

Creates a new account. Sends a verification email — the session is not active until the email is verified.

**Request body**
```json
{
  "email": "string",
  "password": "string",
  "name": "string"
}
```

#### `POST /api/auth/sign-in/email`

Signs in with email and password.

**Request body**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response `200`** — session + user JSON. Sets session cookies.

#### `POST /api/auth/forget-password`

Sends a password reset email.

**Request body**
```json
{ "email": "string" }
```

#### `POST /api/auth/reset-password`

Resets the password using a token from the reset email.

**Request body**
```json
{
  "token": "string",
  "newPassword": "string"
}
```

---

### Social / OAuth Sign-In

Active when the relevant provider credentials are configured (check `socialProviders` in `/api/auth/capabilities`).

#### `POST /api/auth/sign-in/social`

Initiates an OAuth flow for a social provider.

**Request body**
```json
{
  "provider": "google",
  "callbackURL": "https://yourapp.com/dashboard"
}
```

**Response** — redirects to the provider's OAuth authorization URL.

After the OAuth flow completes, Better Auth handles the callback at:
- `GET /api/auth/callback/google`
- `GET /api/auth/callback/microsoft`

These set session cookies and redirect to the `callbackURL`.

---

### Session Management

All of the following require a valid `better-auth.session_token` cookie or `Authorization: Bearer <token>` header.

#### `GET /api/auth/get-session` `🔒 session`

Returns the current session and user, or `null` if no valid session exists. Clears stale cookies if the session is invalid.

**Response `200`**
```json
{
  "session": { /* Session object or null */ },
  "user": { /* User object or null */ }
}
```

#### `POST /api/auth/sign-out` `🔒 session`

Invalidates the current session and clears all session cookies.

#### `GET /api/auth/list-sessions` `🔒 session`

Lists all active sessions for the authenticated user.

#### `POST /api/auth/revoke-session` `🔒 session`

Revokes a specific session.

**Request body**
```json
{ "token": "string" }
```

#### `POST /api/auth/revoke-other-sessions` `🔒 session`

Revokes all sessions except the current one.

#### `POST /api/auth/change-password` `🔒 session`

**Request body**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

#### `POST /api/auth/delete-user` `🔒 session`

Permanently deletes the authenticated user and all associated data.

---

### Passkeys (commercial mode + passkey config)

Active when `supportsPasskeys` is `true` in capabilities.

#### `POST /api/auth/passkey/register` `🔒 session`

Registers a new passkey for the authenticated user.

#### `POST /api/auth/passkey/authenticate`

Authenticates with a passkey (no existing session required).

---

## Endpoints

### Health

#### `GET /api/health`

Returns service health status. No authentication required.

**Response `200`**
```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

### Entitlements

#### `GET /api/entitlements` `🔒 session`

Returns the authenticated user's plan limits and feature flags.

**Response `200`**
```json
{
  "accountCount": 2,
  "accountLimit": 3,
  "mappingCount": 5,
  "mappingLimit": 10,
  "plan": "free",
  "canUseEventFilters": false,
  "canCustomizeIcalFeed": false
}
```

---

### Accounts

#### `GET /api/accounts` `🔒 session`

Lists all calendar accounts for the authenticated user.

#### `GET /api/accounts/:id` `🔒 session`

Returns a single account. Returns `404` if not found or not owned.

#### `DELETE /api/accounts/:id` `🔒 session`

Deletes a calendar account and invalidates related calendars.

**Response `200`**
```json
{ "success": true }
```

---

### Sources

Sources are calendars configured as sync sources (read-only inputs to the sync pipeline).

#### `GET /api/sources` `🔒 session`

Lists all sources.

#### `GET /api/sources/:id` `🔒 session`

Returns a single source including event filter settings, destinations, and source-of-truth relationships.

#### `PATCH /api/sources/:id` `🔒 session`

Updates source settings. Pro plan required for event filter fields.

**Request body** (all fields optional)
```json
{
  "name": "string",
  "customEventName": "string",
  "excludeAllDayEvents": false,
  "excludeEventDescription": false,
  "excludeEventLocation": false,
  "excludeEventName": false,
  "excludeFocusTime": false,
  "excludeOutOfOffice": false,
  "includeInIcalFeed": true,
  "treatFullDayTimedEventsAsAllDay": false
}
```

#### `GET /api/sources/:id/destinations` `🔒 session`

Returns destination calendar IDs this source syncs to.

**Response `200`**
```json
{ "destinationIds": ["cal_abc", "cal_xyz"] }
```

#### `PUT /api/sources/:id/destinations` `🔒 session`

Replaces the full list of destination calendar IDs for a source.

**Request body**
```json
{ "calendarIds": ["cal_abc", "cal_xyz"] }
```

#### `GET /api/sources/:id/sources` `🔒 session`

Returns source calendar IDs mapped to a destination calendar.

**Response `200`**
```json
{ "sourceIds": ["cal_abc", "cal_xyz"] }
```

#### `PUT /api/sources/:id/sources` `🔒 session`

Replaces the full list of source calendar IDs for a destination.

**Request body**
```json
{ "calendarIds": ["cal_abc", "cal_xyz"] }
```

#### `GET /api/sources/authorize` `🔒 session`

Initiates an OAuth flow for a source provider. Redirects to the provider's authorization URL.

**Query params**
| Param | Required | Description |
|-------|----------|-------------|
| `provider` | yes | `google` or `outlook` |
| `credentialId` | no | Existing credential to re-use |

#### `GET /api/sources/callback/:provider`

OAuth callback endpoint. Exchanges the authorization code for tokens, imports the account's calendars, and redirects to the dashboard. Stateless — no session required (uses the `state` param).

#### `GET /api/sources/callback-state` `🔒 session`

Consumes a one-time callback state token and returns the stored state payload.

**Query params**
| Param | Required | Description |
|-------|----------|-------------|
| `token` | yes | One-time state token |

---

### Sources — Google

#### `GET /api/sources/google` `🔒 session`

Lists Google Calendar sources.

#### `POST /api/sources/google` `🔒 session`

Creates a new Google Calendar source. Returns `402` if the plan limit is reached, `409` on duplicate.

**Request body**
```json
{
  "externalCalendarId": "string",
  "name": "string",
  "oauthSourceCredentialId": "optional-string",
  "syncFocusTime": false,
  "syncOutOfOffice": false
}
```

#### `GET /api/sources/google/calendars` `🔒 session`

Lists available Google Calendars for a given credential or destination.

**Query params**: `destinationId` or `credentialId` (at least one required)

#### `GET /api/sources/google/:id/destinations` `🔒 session`

Returns destination IDs for a specific Google source.

---

### Sources — Outlook

#### `GET /api/sources/outlook` `🔒 session`

Lists Outlook Calendar sources.

#### `POST /api/sources/outlook` `🔒 session`

Creates a new Outlook Calendar source. Returns `402` / `409` on failure.

**Request body**
```json
{
  "externalCalendarId": "string",
  "name": "string",
  "oauthSourceCredentialId": "optional-string"
}
```

#### `GET /api/sources/outlook/calendars` `🔒 session`

Lists available Outlook Calendars for a given credential or destination.

#### `GET /api/sources/outlook/:id/destinations` `🔒 session`

Returns destination IDs for a specific Outlook source.

---

### Sources — CalDAV

#### `GET /api/sources/caldav` `🔒 session`

Lists CalDAV sources. Optionally filter by `provider` query param.

#### `POST /api/sources/caldav` `🔒 session`

Creates a new CalDAV source.

**Request body**
```json
{
  "serverUrl": "https://caldav.example.com",
  "username": "user@example.com",
  "password": "secret",
  "provider": "nextcloud"
}
```

#### `POST /api/sources/caldav/discover` `🔒 session`

Discovers available CalDAV calendars by connecting to a server.

**Request body**
```json
{
  "serverUrl": "https://caldav.example.com",
  "username": "user@example.com",
  "password": "secret"
}
```

**Response `200`**
```json
{
  "calendars": [ ... ],
  "authMethod": "basic"
}
```

---

### ICS Sources

ICS sources are external iCalendar URLs subscribed as read-only inputs.

#### `GET /api/ics` `🔒 session`

Lists ICS URL sources.

#### `POST /api/ics` `🔒 session`

Creates a new ICS source. Returns `402` if the plan limit is reached.

**Request body**
```json
{
  "name": "Public Holidays",
  "url": "https://example.com/calendar.ics"
}
```

#### `GET /api/ics/:id/destinations` `🔒 session`

Returns destination IDs for a specific ICS source.

---

### Destinations

Destinations are calendars that receive synced events.

#### `GET /api/destinations` `🔒 session`

Lists all destinations.

#### `DELETE /api/destinations/:id` `🔒 session`

Deletes a destination.

#### `GET /api/destinations/authorize` `🔒 session`

Initiates OAuth for a destination provider. Enforces account limits before redirecting.

**Query params**
| Param | Required | Description |
|-------|----------|-------------|
| `provider` | yes | `google` or `outlook` |
| `destinationId` | no | Existing destination to re-authorize |

#### `GET /api/destinations/callback/:provider`

OAuth callback for destination providers. Stateless — no session required.

#### `POST /api/destinations/caldav` `🔒 session`

Connects a new CalDAV destination.

**Request body**
```json
{
  "serverUrl": "https://caldav.example.com",
  "username": "user@example.com",
  "password": "secret",
  "calendarUrl": "https://caldav.example.com/calendars/work/",
  "provider": "nextcloud"
}
```

#### `POST /api/destinations/caldav/discover` `🔒 session`

Discovers CalDAV calendars on a server for use as a destination.

---

### Mappings

#### `GET /api/mappings` `🔒 session`

Lists all source→destination mappings.

**Response `200`**
```json
[
  {
    "id": "map_abc",
    "sourceCalendarId": "cal_src",
    "destinationCalendarId": "cal_dst",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "calendarType": "google"
  }
]
```

---

### Events (Internal)

#### `GET /api/events` `🔒 session`

Returns events in a date range.

**Query params**
| Param | Required | Description |
|-------|----------|-------------|
| `from` | yes | ISO 8601 date-time |
| `to` | yes | ISO 8601 date-time |

#### `GET /api/events/count` `🔒 session`

Returns the total event count for the user.

**Response `200`**
```json
{ "count": 142 }
```

---

### Sync Status

#### `GET /api/sync/status` `🔒 session`

Returns sync status for all destinations.

**Response `200`**
```json
{
  "destinations": [
    {
      "calendarId": "cal_abc",
      "inSync": true,
      "lastSyncedAt": "2024-01-01T00:00:00.000Z",
      "localEventCount": 10,
      "remoteEventCount": 10
    }
  ]
}
```

---

### iCal Feed

#### `GET /api/ical/token` `🔒 session`

Returns the user's iCal feed token and full feed URL.

**Response `200`**
```json
{
  "token": "tok_abc123",
  "icalUrl": "https://keeper.sh/api/cal/tok_abc123.ics"
}
```

#### `GET /api/ical/settings` `🔒 session`

Returns iCal feed display settings.

**Response `200`**
```json
{
  "includeEventName": false,
  "includeEventDescription": false,
  "includeEventLocation": false,
  "excludeAllDayEvents": false,
  "customEventName": "Busy"
}
```

#### `PATCH /api/ical/settings` `🔒 session` `💎 pro`

Updates iCal feed display settings. Requires Pro plan.

**Request body** (all fields optional)
```json
{
  "includeEventName": true,
  "includeEventDescription": false,
  "includeEventLocation": false,
  "excludeAllDayEvents": false,
  "customEventName": "Busy"
}
```

#### `GET /api/cal/:identifier.ics`

Serves the public iCal feed. No authentication cookie required — the token is embedded in the identifier path segment.

**Response `200`** — `text/calendar` iCalendar content.

---

### API Tokens

API tokens are used to authenticate requests to the public v1 API.

#### `GET /api/tokens` `🔒 session`

Lists API tokens. The raw token value is never returned here.

**Response `200`**
```json
[
  {
    "id": "tok_abc",
    "name": "My Integration",
    "prefix": "kp_abc",
    "lastUsedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### `POST /api/tokens` `🔒 session`

Creates a new API token. **The raw token is returned once only** — store it securely.

**Request body**
```json
{ "name": "My Integration" }
```

**Response `201`**
```json
{
  "id": "tok_abc",
  "name": "My Integration",
  "tokenPrefix": "kp_abc",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "token": "kp_abc...full-token..."
}
```

#### `DELETE /api/tokens/:id` `🔒 session`

Deletes an API token. Returns `204 No Content`.

---

### WebSocket

#### `GET /api/socket/token` `🔒 session`

Generates a short-lived token for authenticating a WebSocket connection.

**Response `200`**
```json
{ "token": "ws_abc123" }
```

#### `GET /api/socket/url` `🔒 session`

Returns the full WebSocket URL or path with a fresh short-lived token embedded.

**Response `200`**
```json
{ "socketUrl": "wss://keeper.sh/api/socket?token=ws_abc123" }
```

#### WebSocket `GET /api/socket?token=<token>`

Upgrades the HTTP connection to a WebSocket. Requires a valid short-lived token from `/api/socket/token`. On success, associates the connection with the user.

---

### Feedback

#### `POST /api/feedback` `🔒 session`

Submits user feedback or a bug report.

**Request body**
```json
{
  "message": "This feature is great!",
  "type": "feedback",
  "wantsFollowUp": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Required |
| `type` | `"feedback"` \| `"report"` | Required |
| `wantsFollowUp` | boolean | Optional |

**Response `200`**
```json
{ "success": true }
```

---

### Webhooks

#### `POST /api/webhook/polar`

Receives subscription lifecycle webhooks from [Polar.sh](https://polar.sh). Validated via HMAC signature — no user auth.

Handled events: `subscription.created`, `subscription.updated`, `subscription.canceled`.

---

## Public API v1

All v1 endpoints require a Bearer token:

```
Authorization: Bearer <your-api-token>
```

Create tokens via `POST /api/tokens`.

---

### v1 — Accounts

#### `GET /api/v1/accounts` `🔑 bearer`

Lists calendar accounts.

**Query params**
| Param | Required | Description |
|-------|----------|-------------|
| `provider` | no | Comma-separated list of providers to filter by |

---

### v1 — Calendars

#### `GET /api/v1/calendars` `🔑 bearer`

Lists all source calendars as simplified objects.

**Query params**
| Param | Required | Description |
|-------|----------|-------------|
| `provider` | no | Comma-separated list of providers to filter by |

**Response `200`**
```json
[
  {
    "id": "cal_abc",
    "name": "Work",
    "provider": "google",
    "account": { ... }
  }
]
```

#### `GET /api/v1/calendars/:calendarId/invites` `🔑 bearer`

Returns pending calendar invites for a specific calendar in a date range.

**Query params**
| Param | Required | Description |
|-------|----------|-------------|
| `from` | yes | ISO 8601 date-time |
| `to` | yes | ISO 8601 date-time |

**Response `200`**
```json
[
  {
    "sourceEventUid": "abc123",
    "title": "Team Standup",
    "description": null,
    "location": null,
    "startTime": "2024-01-01T09:00:00.000Z",
    "endTime": "2024-01-01T09:30:00.000Z",
    "isAllDay": false,
    "organizer": "manager@example.com",
    "calendarId": "cal_abc",
    "provider": "google"
  }
]
```

---

### v1 — Events

#### `GET /api/v1/events` `🔑 bearer`

Lists events in a date range.

**Query params**
| Param | Required | Description |
|-------|----------|-------------|
| `from` | yes | ISO 8601 date-time |
| `to` | yes | ISO 8601 date-time |
| `calendarId` | no | Comma-separated calendar IDs |
| `availability` | no | Comma-separated availability values (`busy`, `free`) |
| `isAllDay` | no | `true` or `false` |
| `count` | no | When `true`, returns `{ count: N }` instead of the event list |

#### `POST /api/v1/events` `🔑 bearer`

Creates a new calendar event.

**Request body**
```json
{
  "calendarId": "cal_abc",
  "title": "Team Standup",
  "description": "Daily standup",
  "location": "Conference Room A",
  "startTime": "2024-01-01T09:00:00.000Z",
  "endTime": "2024-01-01T09:30:00.000Z",
  "isAllDay": false,
  "availability": "busy",
  "timezone": "America/New_York"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `calendarId` | yes | Target calendar ID |
| `title` | yes | Event title |
| `startTime` | yes | ISO 8601 date-time |
| `endTime` | yes | ISO 8601 date-time |
| `description` | no | |
| `location` | no | |
| `isAllDay` | no | |
| `availability` | no | `"busy"` or `"free"` |
| `timezone` | no | IANA timezone string |

**Response `201`** — Created event object.

#### `GET /api/v1/events/:id` `🔑 bearer`

Returns a single event by ID. Returns `404` if not found.

#### `PATCH /api/v1/events/:id` `🔑 bearer`

Updates an event or sets an RSVP status. All fields optional.

**Request body**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "location": "Room B",
  "startTime": "2024-01-01T10:00:00.000Z",
  "endTime": "2024-01-01T10:30:00.000Z",
  "isAllDay": false,
  "availability": "free",
  "timezone": "America/New_York",
  "rsvpStatus": "accepted"
}
```

`rsvpStatus` values: `"accepted"`, `"declined"`, `"tentative"`

#### `DELETE /api/v1/events/:id` `🔑 bearer`

Deletes a calendar event. Returns `204 No Content`.

---

### v1 — iCal

#### `GET /api/v1/ical` `🔑 bearer`

Returns the user's iCal feed URL.

**Response `200`**
```json
{ "url": "https://keeper.sh/api/cal/tok_abc123.ics" }
```

---

## Common Response Patterns

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Resource created |
| `204` | Success, no content |
| `302` | Redirect (OAuth flows) |
| `400` | Bad request / validation error |
| `401` | Missing or invalid authentication |
| `402` | Plan limit reached or upgrade required |
| `404` | Resource not found |
| `409` | Conflict (e.g., duplicate source) |

---

## Data Types

### KeeperEvent

```typescript
{
  id: string
  eventStateId: string | null   // null for user-created events
  startTime: string             // ISO 8601
  endTime: string               // ISO 8601
  title: string | null
  description: string | null
  location: string | null
  calendarId: string
  calendarName: string
  calendarProvider: string
  calendarUrl: string | null
}
```

### KeeperSource

```typescript
{
  id: string
  name: string
  calendarType: string
  capabilities: string[]
  accountId: string
  provider: string
  displayName: string | null
  email: string | null
  accountIdentifier: string
  needsReauthentication: boolean
  includeInIcalFeed: boolean
  providerName: string
  providerIcon: string | null
  accountLabel: string
}
```

### KeeperDestination

```typescript
{
  id: string
  provider: string
  email: string | null
  needsReauthentication: boolean
}
```

### KeeperMapping

```typescript
{
  id: string
  sourceCalendarId: string
  destinationCalendarId: string
  createdAt: string   // ISO 8601
  calendarType: string
}
```

### KeeperSyncStatus

```typescript
{
  calendarId: string
  inSync: boolean
  lastSyncedAt: string | null   // ISO 8601
  localEventCount: number
  remoteEventCount: number
}
```
