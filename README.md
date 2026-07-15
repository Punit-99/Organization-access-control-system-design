# Org Access Console

A Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL + Zod application that enforces role-based permissions based on organization category entitlements.

## Core Rule

$$\text{user.grants} \subseteq \text{org.category.entitlements}$$

1. **Entitlement layer** (Org-level, category-driven, DB-seeded): Determines what features an organization's category can ever use.
2. **Grant layer** (User-level, admin-editable): Tracks the features granted to a specific user, validated server-side against the entitlement layer.

A user can never hold a permission that their organization is not entitled to. The server enforces this restriction at write time (rejecting any out-of-entitlement requests with `403 FEATURE_NOT_ENTITLED`).

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)

### Running the Application

1. **Start the PostgreSQL database container**:
   ```bash
   docker compose up -d
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Apply database migrations**:
   ```bash
   npx prisma migrate dev
   ```

4. **Seed the database**:
   ```bash
   npx prisma db seed
   ```

5. **Start the Next.js development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the console in your browser.

---

## Running Tests

To verify that the entitlement rule, cross-org guards, and idempotency logic are fully enforced:
```bash
npm test
```

---

## Seed Accounts (Password: `Passw0rd!`)

| Email | Org Category | Admin? | Seed-Granted Features |
|---|---|---|---|
| `admin@aerobroker.com` | **BROKER** | Yes | VIEW_TRANSACTIONS, CREATE_TRANSACTION, MANAGE_USERS |
| `agent@aerobroker.com` | **BROKER** | No | VIEW_TRANSACTIONS |
| `admin@skyops.com` | **OPERATOR** | Yes | VIEW_TRANSACTIONS, CONFIGURE_ROUTING, MANAGE_USERS |
| `dispatcher@skyops.com` | **OPERATOR** | No | CONFIGURE_ROUTING |
| `admin@harborfbo.com` | **FBO** | Yes | VIEW_TRANSACTIONS, CONFIGURE_ROUTING |
| `clerk@harborfbo.com` | **FBO** | No | VIEW_TRANSACTIONS |

---

## Entitlement Matrix

| Feature | BROKER | OPERATOR | FBO |
|---|---|---|---|
| `VIEW_TRANSACTIONS` | ✅ | ✅ | ✅ |
| `CREATE_TRANSACTION` | ✅ | ❌ | ❌ |
| `MANAGE_USERS` | ✅ | ✅ | ❌ |
| `CONFIGURE_ROUTING` | ❌ | ✅ | ✅ |

---

## Highlights & Implementation Details

- **Server-side Entitlement Check**: Validated inside `POST /api/admin/users/[userId]/permissions` against the `CategoryEntitlement` table, independent of client-side restrictions.
- **Cross-Organization Guard**: Administrators can only edit permissions for users belonging to their own organization. Any cross-org modification attempts trigger a `403 CROSS_ORG_GUARD_TRIGGERED` error.
- **Security Bypass Sandbox**: The Admin UI features an "Exploit Sandbox" console allowing you to issue raw requests to force-grant unentitled features to test database and API security boundaries interactively.
- **Dual Auth Extraction**: Supports session tokens in HTTP cookies for standard browser routing, and Bearer headers for automated testing.
