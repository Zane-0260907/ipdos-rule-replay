# Diet System / IPDOS Rule Replay

Derived from [Juggle-ops/dietsystem](https://github.com/Juggle-ops/dietsystem), public baseline commit `a52137f904f78eaebd546d9808503b26e3b10549`. This branch preserves that history and adds the rule replay workbench described below.

NestJS/TypeScript service for restaurant workflow prototypes. The new **local rule replay demonstrator** runs fixed, explicitly synthetic snapshots through the existing rules registry. It compares immutable policy profiles, checks explicit expected rule IDs, shows every evaluated rule, and exports reproducible JSON bundles.

This artifact implements reproducible regression checks for decision rules. It does not implement the old manuscript's Prophet forecasting, Shapley/SHAP explanations, Kalman filtering, causal identification, or real-store A/B evaluation. No forecasting model is trained or executed by this demo. Existing forecast snapshots and MAPE/RMSE fields in the seed/fixtures are illustrative constants, not measured predictive performance. The replay suite contains one **deliberately injected** policy regression, not a historical production incident. No field study, causal identification, or store-level A/B benefit is claimed.

## Authors & Maintainers

- Zhai Slim
- Chao-Hsien Hsieh

## License

Licensed under [Apache-2.0](LICENSE), as confirmed by the maintainer. The original LICENSE and copyright attributions are retained; README and package metadata are aligned to that existing license.

## Run the standalone demo (no database)

Requirements: Node.js >=20 (validated on Node 24.19.0) and npm. Run commands from the repository root.

Clone the published revision, preserving its upstream history:

```sh
git clone --branch demo/reproducible-rule-replay https://github.com/Zane-0260907/ipdos-rule-replay.git
cd ipdos-rule-replay
```

```sh
npm ci --ignore-scripts
npm run prisma:generate
npm run build
npm run demo
```

Open **http://127.0.0.1:3017/demo**. The server binds to loopback only. Select a scenario, inspect the reference/candidate checks, replay it, and export the complete candidate JSON. Both profiles can be selected in either position. Comparing `registry-v1` with itself produces no differences.

`REPLAY_PORT` optionally changes the port. This separate NestJS module does not load the business backend, connect to a database, or invoke paid models. Its interface is newly developed for this demonstrator; it is not an old production screenshot. No external frontend package, CDN, or font download is required.

## Reproduce the software checks

```sh
npm test -- --runInBand
npx --no-install ts-node scripts/baseline-compatibility.ts
npm run replay:evidence
npm run replay:verify -- artifacts/seeded-regression.json
```

The baseline compatibility command checks the SHA-256 of the bundled public registry source from commit `a52137f904f78eaebd546d9808503b26e3b10549`, then compares default outputs on the ten scenarios. It works in an extracted source package without Git history.

With the demo running, use an installed Chromium browser for interaction checks and screenshots:

```sh
npm run test:ui
```

Set `CHROME_PATH` if Chrome/Edge/Chromium is not in a standard path; set `REPLAY_URL` when changing the demo port. The browser uses a new workspace profile, never an existing user profile. The command fails clearly if no supported browser is available; it does not auto-install one.

See [docs/REPRODUCIBILITY.md](docs/REPRODUCIBILITY.md) for the exact scenario contracts, export semantics, evidence, and limitations.

## Run the original backend with synthetic fixtures

Copy `.env.example` to `.env` (`cp .env.example .env` on Unix; `Copy-Item .env.example .env` in PowerShell), then run the install/generate/build steps above and:

```sh
npm run start:prod
```

The template explicitly selects `DATABASE_URL=fixture://local`. The original backend serves on port 3002 and exposes `/health`; business responses retain the `{ data, meta, error }` envelope. The standalone replay API uses direct JSON responses and is served by `npm run demo` separately. Existing fixture data are prototypes and are separate from the frozen replay inputs.

## Initialize a separate local PostgreSQL database

Use a new empty development database. Do not point these commands at a production database. A baseline migration and environment template are now included.

An optional Docker configuration provisions a local database:

```sh
docker compose -f compose.demo.yml up -d --wait
```

Change `.env` to the following **local demo only** URL (or use your own new local PostgreSQL database):

```dotenv
DATABASE_URL=postgresql://diet_demo:local_demo_only@127.0.0.1:55432/diet_demo?schema=public
```

Then initialize and start the original backend:

```sh
npm run prisma:deploy
npm run prisma:seed
npm run start:prod
```

The seed uses synthetic/example records and stable IDs; rerunning it updates those example records. `prisma:migrate` remains the interactive command for authoring subsequent development migrations. Existing databases created without migration history need a maintainer-reviewed baseline procedure; do not blindly apply the new initial migration to them.

## Environment

| Variable           | Purpose                                                                      | Template/default        |
| ------------------ | ---------------------------------------------------------------------------- | ----------------------- |
| `DATABASE_URL`     | Backend datasource; fixture mode avoids a database                           | `fixture://local`       |
| `APP_NAME`         | Structured log identifier                                                    | `diet-backend`          |
| `APP_HOST`         | Optional original backend bind address; omitted retains its existing default | `127.0.0.1`             |
| `APP_PORT`         | Original backend port                                                        | `3002`                  |
| `NODE_ENV`         | Backend runtime environment                                                  | `development`           |
| `LOG_LEVEL`        | Pino log level                                                               | `info`                  |
| `CORS_ORIGINS`     | Backend allowed origins; empty uses local development defaults               | `http://localhost:5173` |
| `PRISMA_LOG_LEVEL` | Prisma logging                                                               | `warn`                  |
| `DEMO_AUTH_TOKEN`  | Optional existing backend demo guard                                         | empty                   |
| `REPLAY_PORT`      | Standalone, loopback-only replay port                                        | `3017`                  |

Keep `.env` files out of Git. `npm run lint` is the original auto-fixing repository-wide lint command; use targeted ESLint checks when reviewing this branch to avoid changing unrelated legacy files.

## Relevant paths

- `src/replay/`: fixed synthetic catalog, replay engine, HTTP API, standalone entry point and tests
- `src/rules/`: existing rule definitions plus default-preserving policy parameters and full evaluation trace
- `public/replay.html`: new minimal, dependency-free local interface
- `scripts/`: evidence generation, exported-bundle verification, base compatibility and browser checks
- `artifacts/`: actual generated synthetic results and screenshots; local databases/browser profiles/caches stay ignored under `artifacts/local/`
- `prisma/`: schema, initial migration and synthetic/example seed

For paper-ready mechanism details, exact oracle sources and bounded results, see [docs/MECHANISM_AND_RESULTS.md](docs/MECHANISM_AND_RESULTS.md). The 4:30 demonstration walkthrough is [docs/VIDEO_RUNBOOK.md](docs/VIDEO_RUNBOOK.md).
