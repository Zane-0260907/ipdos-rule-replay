# Quick start

[Documentation index](README.md) · [Walkthrough](DEMO.md)

## Option 1 — run the prebuilt application

1. Install or use an existing **Node.js 24.x** installation. The accepted Windows build used Node 24.19.0.
2. [Download ipdos-v0.3.0-prebuilt.zip](https://github.com/Zane-0260907/ipdos-rule-replay/releases/download/v0.3.0/ipdos-v0.3.0-prebuilt.zip), and extract the entire ZIP to a writable directory.
3. Open a terminal in that extracted directory and run:

   ```sh
   node server/run.cjs
   ```

4. Open **http://127.0.0.1:3338/**. Select **Enter as demo manager (review and confirm)** to exercise the walkthrough.

No npm install, compiler, external database or Docker is required for this option. Node.js and a browser are not included in the ZIP. [Verify the download checksum](https://github.com/Zane-0260907/ipdos-rule-replay/releases/download/v0.3.0/SHA256SUMS.txt).

## Option 2 — run from a Git checkout

```sh
git clone https://github.com/Zane-0260907/ipdos-rule-replay.git
cd ipdos-rule-replay/approval-workbench
node server/run.cjs
```

The application source includes the accepted built frontend. The repository root also retains older backend projects; run the current workbench from **approval-workbench/**, not with the legacy root package scripts.

For the named [application source ZIP](https://github.com/Zane-0260907/ipdos-rule-replay/releases/download/v0.3.0/ipdos-v0.3.0-source.zip), extract it and run `node server/run.cjs` from its own root.

## Optional frontend rebuild

From `approval-workbench/` in a checkout, or the extracted application-source root:

```sh
cd frontend
npm ci
npm run build
```

Then return to the application root and start `node server/run.cjs`. The locked npm dependencies are needed only for rebuilding the frontend.

## Ports, state and roles

| Item | Behavior |
| --- | --- |
| Page | `http://127.0.0.1:3338/` |
| API | `http://127.0.0.1:3337/`; loopback only |
| Persistence | Synthetic SQLite files and current-fixture pointers under the application's `artifacts/` directory |
| Restart | Stop with Ctrl+C and run the same command again; retain `artifacts/` to retain fixture state and receipts |
| Fresh fixture | The UI starts a new synthetic fixture and keeps the previous database in its own directory |
| Manager | Can approve, confirm and apply synthetic source changes |
| Viewer | Can inspect and save procurement proposals; cannot approve, confirm or change source fixtures |

The role selector provides local demo access, not production authentication. Both workflow adapters create local simulated effects only.

## If startup fails

- Check `node --version`; use Node 24.x with its built-in SQLite support. A SQLite experimental-feature warning is distinct from a startup failure.
- Ensure ports 3337 and 3338 are free. Do not stop another application blindly; choose another machine or stop only a process you own and intend to stop.
- Extract all ZIP files and use a writable directory. Do not mix the v0.3.0 runtime with R2 dependency or database files.
- After a service restart, select a demo role again. For a clean comparison, use the UI's **Start fresh synthetic fixture** control.

Continue with the [illustrated workflow](DEMO.md), or inspect [the exact scope and limits](LIMITS.md).
