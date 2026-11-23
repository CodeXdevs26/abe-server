# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Backend for "Discount Me", a multi-role marketplace with delivery: customers, vendors, riders, brokers and admins. Built with Express 4, TypeScript, Mongoose 8 (MongoDB Atlas), Stripe (Checkout, Subscriptions and Connect payouts), S3 uploads and Socket.IO chat. CommonJS output.

## Commands

```bash
npm run dev        # ts-node-dev with --respawn --poll --transpile-only (no type checking)
npx tsc --noEmit   # type-check; dev mode skips this, so run it before committing
npm run build      # tsc -> dist/
npm run start:prod # node dist/server.js
npm run seed       # run DB seeders standalone (seed:prod uses dist/)
```

- **Tests:** there are none. `npm test` is a placeholder that exits 1. Verify changes with `npx tsc --noEmit` plus targeted scripts run through `node -r ts-node/register/transpile-only <file>`.
- **Lint:** `npm run lint` currently fails because there is no ESLint flat config in the repo.
- **Package manager:** npm only, using `package-lock.json`. Don't add other lockfiles.
- **Docker:** the multi-stage `Dockerfile` has targets `dev` (hot reload) and `prod` (the default: compiled `dist/`, prod deps only, non-root `node` user, healthcheck).
  - Dev: `docker compose up --build` (source mounted; add `--profile local-db` for an optional local Mongo).
  - Prod: `docker compose -f docker-compose.prod.yml up -d --build`.
  - `.env` is excluded from the image and passed at runtime via `env_file`. Compose forces `IP_ADDRESS=0.0.0.0` inside the container.
  - The prod image must include `src/app/emailTemplates/`, because services read the templates from `./src/app/emailTemplates/*.html` relative to the working directory.

## Architecture

**Startup:** `src/server.ts` connects Mongo, starts HTTP and Socket.IO, then calls `runSeeders()`. If the port is busy it exits with an `EADDRINUSE` message. Seeders live in `src/app/seeders/` and are registered in `seeders/index.ts`. They are idempotent and also run standalone via `npm run seed` (entry point `src/seed.ts`). The admin seeder creates `admin@gmail.com` only when it's missing, with the password from `ADMIN_PASSWORD` (minimum 12 characters; seeding is skipped if that's unset).

**Module pattern:** each feature in `src/app/modules/<name>/` has the same files: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.model.ts`, `*.validation.ts` (Zod v4) and `*.interface.ts`. All routers mount under `/api/v1` in `src/app/routes/index.ts`.
- **Controllers** are wrapped in `utils/handleAsyncRequest` and respond via `utils/successResponse`.
- **Services** hold all business logic and export a default object of functions.
- **Errors:** throw `classes/appError.AppError(status, msg)`. `middlewares/globalErrorHandler.ts` formats Zod, Mongoose, duplicate-key and JWT errors.

**Route middleware order:** `authVerify([...roles])`, then `requireActiveSubscription([...roles])`, then `uploadWithMulter` (`utils/awss3.ts`, multer-s3), then `validate(schema, { formData })`.
- `validate` with `formData: true` expects multipart requests to carry a JSON string in the `data` field. It replaces `req.body` with the parsed result.
- Without `formData`, `validate` checks the body but leaves `req.body` unchanged.

**Identity model:** there are two layers.
- `AuthModel` (`modules/auth/auth.model.ts`) is the single credential record: email, password hash, `role` (`user | vendor | rider | broker | admin`), approval, block and delete flags, OTP state and `free_trial_end_date`.
- Each role also has its own profile collection (`UserModel`, `VendorModel`, `RiderModel`, `BrokerModel`, `AdminModel`). The two layers are linked by **email**, not ObjectId.
- `authVerify` decodes the JWT, re-loads `AuthModel` by email and puts `{ email, role, ... }` on `req.user`. Services then look up the role profile by `req.user.email`.
- Vendors own a `Store`. Products and orders are scoped by `store`.

**Paid features:** vendors, riders and brokers need an active Stripe subscription or a free trial to use gated routes (`requireActiveSubscription`).

**Money flow:**
1. **Checkout:** `payment.service` creates the Stripe Checkout session.
2. **Order creation:** the Stripe webhook `checkout.session.completed` creates the orders and calls `settlementServices.createSettlementsForOrders`. Commission percentages come from env through `config`.
3. **Vendor payout:** the vendor's share goes out as a Stripe Connect transfer (`transferVendorSettlements`).
4. **Rider payout:** the rider's share is transferred when the pickup request completes (`pickup-request.service` calls `transferRiderSettlementByOrder`).
5. **Transfer status:** `transfer.*` and `account.updated` webhook events sync transfer and Connect status.
6. **Subscriptions:** `subscription.service` has its own webhook for subscriptions and invoices.

Both webhooks are mounted in `src/app.ts` with `express.raw` **before** `express.json()`. They require `STRIPE_WEBHOOK_SECRET` and reject unsigned events.

**Other details:**
- **Transactions:** many multi-document writes use `mongoose.startSession()` transactions, which require a replica set (Atlas works; a standalone local Mongo does not).
- **Listing endpoints:** these use `classes/queryBuilder.ts` (`.search().filter().sort().paginate().selectFields()`). `filter()` drops `$`-prefixed keys and object values from query params on purpose, as protection against NoSQL injection.
- **Realtime:** Socket.IO chat lives in `src/app/socket/chat.socket.ts`; connections are JWT-authenticated. Socket CORS is set separately from the Express CORS in `app.ts`.
- **Email:** `utils/sendEmail.ts` fills `{{placeholders}}` in the HTML templates in `src/app/emailTemplates/`, then POSTs to the external `SEND_EMAIL_URL` service via `axios`. `axios` is only a transitive dependency of `@googlemaps/google-maps-services-js`, so add it to `package.json` before relying on it elsewhere.
- **Config:** all env access goes through `src/app/config/index.ts`, except for `GOOGLE_MAPS_API_KEY` and `ADMIN_PASSWORD`. Those two are read from `process.env` at call time, because `app` is imported before dotenv loads in `server.ts`.
- **Stale build output:** `dist/` may contain stale modules that no longer exist in `src`, e.g. `delivery-chat`; `src/app/modules/delivery-chat/` is an empty folder.

## Security notes (incident 2026-11-23)

`origin/main` was once force-pushed with a forged malware commit. It added a hidden loader in an `init` file, prefixed npm scripts with `node init`, and hid a blockchain-fetched `new Function(...)` payload behind whitespace padding on one line of `src/server.ts`. The repo has since been restored. Local tag `malware-evidence-2940f65` keeps the bad commit for reference.

**Before pulling or merging remote changes:**
1. Check the `git fetch` output for `(forced update)`.
2. Diff the incoming changes.
3. Look for: very long or whitespace-padded lines; new npm script prefixes; `eval`, `new Function`, `atob`, `child_process`; base64-encoded URLs; changes that remove `.env` from `.gitignore`.

Known open issues from the audit (not yet fixed):
- Checkout trusts amounts sent by the client.
- Product update and delete have no ownership check.
- `validate` skips validation for formData requests that lack a `data` field, which allows mass assignment.
- Some read and cart endpoints don't check ownership (IDOR).
