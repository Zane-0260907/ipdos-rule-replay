# R2 business-flow source

This source corresponds to the verified isolated restaurant revision. The application, UI, rules, fixtures and tests are unchanged from R2. Publication-only changes are documentation, project license metadata and creation of browser/test output directories before reporter startup. See [SOURCE_PROVENANCE.json](SOURCE_PROVENANCE.json).

For review, use the [prebuilt release ZIP](https://github.com/Zane-0260907/ipdos-rule-replay/releases/tag/v0.2.0-business-r2). It contains compiled output and runtime dependencies, requires existing Node 24, and was validated with 24.19.0 / Windows x64. Node itself is not bundled. [New business video](https://www.youtube.com/watch?v=6EFWHdpDLiw).

## Optional source build

Requires Node 24 and npm. From this directory, in one terminal:

```powershell
cd backend
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm start
```

In another terminal, from this directory:

```powershell
cd frontend
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

Open http://127.0.0.1:3038/. Backend: 127.0.0.1:3037. The isolated entrypoint imports BusinessModule and ignores the legacy AppModule/Prisma configuration. No .env, PostgreSQL, external model or supplier is used. Source mode creates synthetic data in backend/local-data/simulation.sqlite. Never point BUSINESS_DATA_FILE at an existing business database.

## Tests

From backend, run `npm test`: this compiles and runs 14 core checks plus 12 real HTTP checks. Synthetic test databases and reports go to ignored artifacts/. HTTP tests use random loopback ports; a managed environment may require its normal execution approval.

With an already installed Chrome or Edge, run `node scripts/run-ui-suite.mjs` from this directory. It owns loopback services and fresh browser profiles, checks the main flow, restart and viewer restrictions, and stops its services. It does not use a personal browser profile.

## Boundaries

Rice demand 50 kg, stock 25 kg and suggestion 30 kg are explicit fixtures. The stale plan uses a manual 31.5 kg quantity. After stock becomes 20 kg, the suggestion is 35 kg and the human-confirmed example is 36.5 kg. These are synthetic contracts, not business measurements.

Review binds immutable content and actor, not a global GUI edit revision. An older matching reviewed proposal is not globally revoked. Selected calculation/registry modules are hashed on load/startup. Local SQLite transactions and persisted request associations support same-plan/request retries, not unconditional exactly-once execution.

Viewer can compute, edit and save proposals. Review, confirmation and stock changes require manager. The existing read-only login label overstates that restriction. Role selection is deliberately accessible, not production authentication. Other navigation entries are unconnected.

No model accuracy, causal attribution, supplier execution, real-store A/B study or economic benefit is established. DOCX content is checked, while Word layout has not been visually validated.

## Provenance and licensing

The owner's restaurant frontend and the backend's existing rules registry are reused. Backend upstream history remains at the repository root. Workstation paths, secrets, databases and recording profiles are omitted from this public source subset.

Project metadata follows the existing root Apache-2.0 LICENSE under the owner's confirmed instruction. Third-party dependencies retain their own licenses and notices. The release ZIP contains unchanged R2 compilation artifacts, production dependencies and a fresh synthetic database. [packaging/](packaging/) contains its exact launcher. Source checkouts omit node_modules, populated databases and release binaries.
