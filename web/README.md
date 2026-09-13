# Ombuddi web application

React, TypeScript, Vite, MUI, React Router, React Query, Zustand, and Auth0.
The repository-wide product and security context lives in `../docs/CONTEXT.md`.

## Local development

Prerequisites:

- Node.js 22.13 or newer;
- npm 10 or newer;
- Docker Desktop for the API and PostgreSQL services.

Install and start the frontend:

```sh
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and calls the local API at
`http://localhost:5002/api/v1`. Start that API from `../service` with:

```sh
docker compose up --build
```

Copy `../service/.env.example` to `../service/.env` and replace its placeholder
credentials and `NAME_SALT` first. Never change `NAME_SALT` after person records
exist unless a deliberate migration strategy has been implemented.

## Verification

```sh
npm test
npm run lint
npm run build
```

`npm run build` writes generated output to `dist`. Source changes belong under
`src`; do not commit regenerated `dist` files as part of ordinary feature work.

## Structure

- `src/pages` — route-level screens, loaded on demand through
  `src/routeComponents.ts`.
- `src/components` — product UI and shared feature components.
- `src/tools` — API helpers, hooks, encryption, date handling, and pure utilities.
- `src/libraries` — small Zustand stores for session-only state.
- `src/constants` — Auth0 configuration, IOA codes, and UI constants.
- `src/assets/images` — shipped raster artwork; use display-sized WebP assets.
- `src/types` — API and domain TypeScript types.

## Application version

`package.json` is the single source of truth. The account menu imports that
value through `versionNumber.ts`. For a local version bump without creating a
Git tag, use the appropriate npm version command with `--no-git-tag-version`.

## Security-sensitive conventions

- Auth0 `sub` is never a local Ombuddi UUID. The API resolves it to database IDs.
- Person names are looked up with a client hash; phrases are never stored alone.
- Notes and protected case text are encrypted in the browser before persistence.
- Session phrases and verified names remain session-only and are cleared when the
  authenticated identity changes.
- New endpoints and mutations must preserve tenant and author ownership rules.

See `../docs/LESSONS.md`, `../docs/DATA_MODEL.md`, and
`../docs/MULTI_TENANCY.md` before changing authentication, hashing, encryption,
or persistence behavior.
