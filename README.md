## open‑banking‑mock

This repository contains a lightweight mock of a Plaid‑like open banking API together with a minimal web client.  The goal of this project is to provide deterministic, local fixtures for demos and tests without any connection to real banks.  The API is implemented with [Fastify](https://www.fastify.io/) using TypeScript and exposes a handful of endpoints to simulate the account linking flow and to fetch account and transaction data.  A small React application demonstrates how to integrate with the mock API.

### Features

* **Deterministic fixtures** – account and transaction data is served from JSON files bundled in the repository.  Three personas are provided (`steady`, `seasonal`, `risky`) with different financial profiles.
* **JWT token exchange** – after selecting a persona the client calls a token exchange endpoint to obtain a signed JSON web token.  Subsequent requests to protected endpoints require this token.
* **Minimal dependencies** – the server uses Fastify and jsonwebtoken.  The client is built with Vite and React and does not rely on any CSS frameworks.
* **Comprehensive tests** – Jest and supertest are used to verify the behaviour of all endpoints including the token exchange and protected resource access.

### Getting started

The project is structured as a monorepo with a server and a web client.  The root `package.json` contains scripts to run each part individually during development.  You will need Node.js (v18 or newer) and npm installed locally.

```bash
git clone <repo>
cd open‑banking‑mock
npm install

# Start the API server on port 3000
npm run dev:server

# In a separate terminal start the Vite dev server on port 5173
npm run dev:web
```

Once both servers are running you can open your browser at [http://localhost:5173](http://localhost:5173).  Click the **Link** button, choose one of the personas in the modal, and observe the accounts and transactions being loaded from the API.

### API overview

All responses are JSON.  The API uses a bearer token (a JWT signed with a static secret) for protected routes.  A typical client flow is:

1. **Create a link token** – `POST /link/token/create` returns a static `link_token` and `expiration`.  The link token has no semantic meaning and is provided for parity with Plaid’s API.
2. **Exchange a public token** – `POST /item/public_token/exchange` accepts a `public_token` in the body (the name of one of the personas).  It returns an `access_token` (a signed JWT) and an `item_id`.
3. **Fetch accounts** – `GET /accounts` requires the `Authorization: Bearer <access_token>` header.  It returns the list of accounts for the persona encoded in the token.
4. **Fetch transactions** – `GET /transactions?start=YYYY‑MM‑DD&end=YYYY‑MM‑DD` also requires the bearer token.  It filters transactions from the persona’s fixture by the supplied date range.

An optional `POST /webhook` endpoint is provided to simulate asynchronous events.  When invoked it logs a `TRANSACTIONS_READY` message to the server console.

For more details, consult the [`server/index.ts`](server/index.ts) file.  The TypeScript types used by the API are defined in [`server/types.ts`](server/types.ts).

### Fixture overview

Fixtures live in `server/fixtures`.  Each persona JSON file contains two top‑level keys:

* `accounts` – an array of account objects with `id`, `name`, `type` and `balance` fields.
* `transactions` – an array of transactions with `id`, `account_id`, `date`, `name` and `amount`.  Dates are ISO formatted strings and amounts are numbers (positive for credits, negative for debits).

Feel free to add or edit fixtures to tailor the demo to your needs.  Because all data is loaded at startup, you must restart the server after making changes to the fixtures.

### Running tests

Unit and integration tests live in `tests/server.test.ts`.  Tests start the Fastify server in memory using supertest and exercise every endpoint.  To run the test suite:

```bash
npm test
```

All tests should pass.  The tests verify token creation, token exchange, account fetching, transaction filtering and invalid token handling.

### Folder structure

```
open‑banking‑mock/
  server/
    fixtures/            # persona data
      steady.json
      seasonal.json
      risky.json
    index.ts            # Fastify server definition
    types.ts            # API type definitions
  web/
    index.html          # HTML entry point
    src/
      App.tsx          # React application
      main.tsx         # Vite/React bootstrap
  jest.config.js        # Jest configuration for TS
  package.json          # top‑level package manifest
  tests/
    server.test.ts      # integration tests
```

### License

This project is provided under the MIT license.  See the [LICENSE](../LICENSE) file in the repository root for details.