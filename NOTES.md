# NOTES.md

## AI Utilization

I used AI to design the initial schema relationships, draft Next.js API endpoints, structure the styling layouts, and format the testing suite structures.

## AI Override / Correction

1. **Prisma Version Downgrade**: The AI-initialized project defaulted to Prisma 7.8.0. However, Prisma 7 removes support for declaring `url = env("DATABASE_URL")` directly inside `schema.prisma`, prompting a validation error (`P1012`) and demanding external TS files and custom database adapters. I overrode this setup and downgraded Prisma and `@prisma/client` to version 5.22.0. This restored standard connection string bindings, preventing database migration failures on local Docker and maintaining standard Next.js configurations.
2. **Next.js 14 Font Resolution**: The Shadcn CLI initialization automatically imported the `Geist` font from `next/font/google`. However, `Geist` was only introduced in Next.js 15, resulting in a build compilation crash under Next.js 14. I corrected this layout file config by replacing the `Geist` imports with the standard Google `Inter` font, resolving compile validation errors.

## Design Decisions

1. **CategoryEntitlement DB Table vs. TS Constants**: I chose to model category entitlements as a database table rather than a hardcoded TypeScript record object. This is more scalable, allows querying and validation via single-join SQL queries inside Prisma, makes entitlements auditable in the database next to all other tables, and simplifies super-admin editing capabilities in future feature cycles.
2. **Interactive Security Bypass Sandbox**: In the Admin Panel UI, I implemented a secondary "Exploit Sandbox". While the main admin user table restricts permissions checkbox options strictly to entitled features, the Exploit Sandbox lets any administrator select any system user and force a POST request containing any system feature (including locked/unentitled ones). This acts as a demo console showing the server-side rejection in action, yielding the exact `403 FEATURE_NOT_ENTITLED` error.
3. **Dual-Extraction Authorization Guard**: The `requireAuth` helper is designed to inspect both standard httpOnly cookies (`auth-token`) and the HTTP `Authorization: Bearer <token>` header. This supports standard browser session cookies during web navigation, while allowing unit tests to run cleanly by passing bearer headers without requiring mock cookie jars.
4. **Tailwind CSS v3 + Shadcn UI Architecture**: Migrated the entire styling layer from Vanilla HSL CSS variables to Tailwind CSS v3 and Shadcn UI primitives (`Card`, `Input`, `Label`, `Button`, `Table`, `Switch`). By pre-configuring the `components.json` settings, the Shadcn library initialized non-interactively without requiring runtime CLI prompts.
