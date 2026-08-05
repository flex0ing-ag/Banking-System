# Backend Ledger Documentation

## Overview

This document describes the `Backend-ledger` backend service, including folder structure, key files, API routes, request/response details, authentication flow, and model behavior. It is intended to help frontend developers understand how to integrate with the backend.

## Project Structure

```
Backend-ledger/
├── .env
├── package.json
├── package-lock.json
├── server.js
├── BACKEND_DOCUMENTATION.md
└── src/
    ├── app.js
    ├── config/
    │   └── db.js
    ├── controllers/
    │   ├── account.controller.js
    │   ├── auth.controller.js
    │   └── transaction.controller.js
    ├── middleware/
    │   └── auth.middleware.js
    ├── models/
    │   ├── account.model.js
    │   ├── blackList.model.js
    │   ├── ledger.model.js
    │   ├── transaction.model.js
    │   └── user.model.js
    ├── routes/
    │   ├── account.routes.js
    │   ├── auth.routes.js
    │   └── transaction.routes.js
    └── services/
        └── email.service.js
```

## Entry Points

- `server.js` — loads environment variables, connects to MongoDB, and starts the Express server on port `3000`.
- `src/app.js` — configures middleware, root health route, and mounts route handlers.

## Environment Variables

The backend expects these environment variables in `.env`:

- `MONGODB_URI` — MongoDB connection string.
- `JWT_SECRET` — secret used to sign JWT tokens.
- `EMAIL_USER` — Gmail user address for Nodemailer.
- `CLIENT_ID` — Gmail OAuth2 client ID.
- `CLIENT_SECRET` — Gmail OAuth2 client secret.
- `REFRESH_TOKEN` — Gmail OAuth2 refresh token.

## Authentication

The backend uses JSON Web Tokens (JWT) for authentication.

- Tokens are created in `POST /api/auth/register` and `POST /api/auth/login`.
- Tokens are returned in the JSON response and also stored in an HTTP cookie named `token`.
- Protected routes require either:
  - `Authorization: Bearer <token>` header or
  - `token` cookie.
- Logout blacklists token for up to 3 days using `src/models/blackList.model.js`.

### Auth Middleware

- `authMiddleware.authMiddleware` — protects normal user routes.
- `authMiddleware.authSystemUserMiddleware` — protects system-only routes and enforces `user.systemUser === true`.

## API Endpoints

### Root

- `GET /`
  - Response: `Ledger Service is up and running`

### Auth

Base path: `/api/auth`

#### Register

- `POST /api/auth/register`
- Request body:
  - `email` (string)
  - `password` (string)
  - `name` (string)
- Response:
  - `201 Created`
  - JSON:
    ```json
    {
      "user": {
        "_id": "...",
        "email": "...",
        "name": "..."
      },
      "token": "..."
    }
    ```
- Notes:
  - Creates a new user.
  - Sends a registration email via `src/services/email.service.js`.
  - Password is hashed before saving.

#### Login

- `POST /api/auth/login`
- Request body:
  - `email` (string)
  - `password` (string)
- Response:
  - `200 OK`
  - JSON:
    ```json
    {
      "user": {
        "_id": "...",
        "email": "...",
        "name": "..."
      },
      "token": "..."
    }
    ```
- Notes:
  - Returns the same response shape as register.
  - Uses `user.comparePassword()` to verify credentials.

#### Logout

- `POST /api/auth/logout`
- Request headers/cookie:
  - `Authorization: Bearer <token>` or `token` cookie.
- Response:
  - `200 OK`
  - JSON:
    ```json
    {
      "message": "User logged out successfully"
    }
    ```
- Notes:
  - Blacklists the provided token in MongoDB.
  - Clears the `token` cookie.

### Account Management

Base path: `/api/accounts`

All account routes require authentication.

#### Create an Account

- `POST /api/accounts/`
- Protected: yes.
- Request body: none.
- Response:
  - `201 Created`
  - JSON:
    ```json
    {
      "account": {
        "_id": "...",
        "user": "...",
        "status": "ACTIVE",
        "currency": "INR",
        "createdAt": "...",
        "updatedAt": "..."
      }
    }
    ```
- Notes:
  - Creates a new `account` document linked to the authenticated user.

#### Get User Accounts

- `GET /api/accounts/`
- Protected: yes.
- Response:
  - `200 OK`
  - JSON:
    ```json
    {
      "accounts": [ ... ]
    }
    ```
- Notes:
  - Returns all accounts belonging to the logged-in user.

#### Get Account Balance

- `GET /api/accounts/balance/:accountId`
- Protected: yes.
- Response:
  - `200 OK`
  - JSON:
    ```json
    {
      "accountId": "...",
      "balance": 12345
    }
    ```
- Notes:
  - Uses `account.getBalance()` to aggregate ledger entries.
  - Returns 404 if the account does not belong to the user or does not exist.

### Transactions

Base path: `/api/transactions`

#### Create Transaction

- `POST /api/transactions/`
- Protected: yes.
- Request body:
  - `fromAccount` (string, account ID)
  - `toAccount` (string, account ID)
  - `amount` (number)
  - `idempotencyKey` (string)
- Response:
  - `201 Created`
  - JSON:
    ```json
    {
      "message": "Transaction completed successfully",
      "transaction": {
        "_id": "...",
        "fromAccount": "...",
        "toAccount": "...",
        "amount": 100,
        "idempotencyKey": "...",
        "status": "COMPLETED",
        "createdAt": "...",
        "updatedAt": "..."
      }
    }
    ```
- Notes:
  - Validates account IDs and active status.
  - Prevents duplicate processing using `idempotencyKey`.
  - Creates ledger entries for debit/credit and updates transaction status.
  - Sends transaction confirmation email.

#### Create Initial Funds Transaction

- `POST /api/transactions/system/initial-funds`
- Protected: system user only.
- Request body:
  - `toAccount` (string, account ID)
  - `amount` (number)
  - `idempotencyKey` (string)
- Response:
  - `201 Created`
  - JSON:
    ```json
    {
      "message": "Initial funds transaction completed successfully",
      "transaction": { ... }
    }
    ```
- Notes:
  - Intended for a special system user account.
  - Creates debit entry from a system account and credit entry to the target account.

## Data Models

### User

Defined in `src/models/user.model.js`

Fields:
- `email` — unique email address
- `name` — user name
- `password` — hashed password
- `systemUser` — boolean flag for system-only actions

Important behavior:
- `password` is hashed before save.
- `comparePassword(password)` compares plaintext password against hashed password.

### Account

Defined in `src/models/account.model.js`

Fields:
- `user` — reference to `user` document
- `status` — `ACTIVE`, `FROZEN`, or `CLOSED`
- `currency` — default `INR`

Important behavior:
- `getBalance()` aggregates related ledger entries:
  - credits add value
  - debits subtract value

### Transaction

Defined in `src/models/transaction.model.js`

Fields:
- `fromAccount` — reference to account
- `toAccount` — reference to account
- `status` — `PENDING`, `COMPLETED`, `FAILED`, `REVERSED`
- `amount` — numeric amount
- `idempotencyKey` — unique string to prevent duplicate transactions

### Ledger Entry

Defined in `src/models/ledger.model.js`

Fields:
- `account` — account reference
- `amount` — numeric amount
- `transaction` — reference to transaction
- `type` — `CREDIT` or `DEBIT`

Important behavior:
- Ledger entries are immutable and cannot be updated or deleted once created.

### Token Blacklist

Defined in `src/models/blackList.model.js`

Fields:
- `token` — JWT string blacklisted after logout

Important behavior:
- Tokens expire from the blacklist after 3 days.

## How the Frontend Should Use the API

### Authentication Flow

1. Call `POST /api/auth/register` or `POST /api/auth/login`.
2. Store the returned `token` client-side if needed.
3. Send the token on protected requests with `Authorization: Bearer <token>`.
4. For logout, call `POST /api/auth/logout`.

### Account Flow

1. Create an account with `POST /api/accounts/`.
2. Load user accounts with `GET /api/accounts/`.
3. Display account balances with `GET /api/accounts/balance/:accountId`.

### Transaction Flow

1. Submit transfers with `POST /api/transactions/`.
2. Use a unique `idempotencyKey` for each transfer submission.
3. For system fund loading, use `POST /api/transactions/system/initial-funds` if a system user account is available.

## Notes for Frontend Integration

- All protected routes require a valid JWT token.
- The backend uses JSON bodies for requests, so set `Content-Type: application/json`.
- The account balance endpoint returns the live balance by summing ledger transactions.
- The transaction API may return existing transaction status if the same `idempotencyKey` is reused.
- The email service is only used for registration and transaction confirmation.

## Useful Backend Files

- `server.js` — startup and DB connection
- `src/app.js` — Express app configuration
- `src/routes/*.js` — route definitions
- `src/controllers/*.js` — request handling logic
- `src/models/*.js` — MongoDB schema definitions
- `src/middleware/auth.middleware.js` — authentication enforcement
- `src/services/email.service.js` — email notification logic
- `src/config/db.js` — database connection handling
