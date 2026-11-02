# IPDOS public source revision replay

This independent local validation package replays 30 fixed first-parent source
transitions from Python's public `devguide` repository through the existing
DocumentRelease contract and four safe modes. The copied production core is
unmodified. All approval roles, signoffs and policies are explicitly fictional.
Only exact selected source sets/content and the conservative shared object
binding are protected; rendered Sphinx semantics and real approvals are outside
the experiment.

Read `REPORT.md` for results and limits, `PROTOCOL.md` for the frozen rules,
`STATUS.json` for the machine summary, and `source-freeze.json` for core hashes.
`data/window.json` freezes every selected commit/tree/parent/time.
`data/trees/` and `data/blob-catalog.json` contain complete tree identities,
source byte/Git hashes and public download sources. No commit author identities,
emails, messages, logins or raw source text are stored; the CC0 license is kept.

## Reproduce offline from the frozen evidence

Validated on Node 24.19.0 and Python 3.10.0 on Windows. Only built-in libraries
are used; there is no package installation, repository build, browser, account
or network requirement for replay. Run each command from this directory:

```powershell
node mapping.cjs
python tests/verify-source.py
node run-replay.cjs
node audit-replay.cjs
```

Each replay/audit creates a new result directory. Existing results are retained.
`results/latest.json` and `results/audit-latest.json` identify the selected run.
Paths in these recorded JSON files follow the validated Windows environment.

To refresh only the same frozen source bytes from anonymous public URLs, run
`python acquire.py`. Its existing `data/window.json` prevents window replacement;
it reuses verified caches. This acquisition is optional and needs network access.
The preserved initial TLS failure and successful bounded resume are described
in `REPORT.md`. No Git clone, setup script, hook or submodule is used.

`audit-replay.cjs` imports no production core or candidate mapper. It opens all
result databases read-only and reconstructs historical worlds from the complete
journal. The independent source checker imports no candidate mapping code.
The two existing manual full oracles are copied under `tests/`.

`make-report.py` rebuilds the report, content-hash list and evidence zip from the
selected successful run. The distributed package includes every trace and all
120 result databases, not only the successful or favorable commits. Nine
shared-binding transitions have zero selective-review gain and remain included.

Public `devguide` source is [CC0-1.0](https://github.com/python/devguide/blob/a4da55860a469b4e4453f7c3cb2553ce4e38d03f/LICENSE).
The copied local prototype's separate license is included as `LICENSE.prototype`.
This package performs local simulated effects only and provides no publication,
GitHub write or external delivery operation.
