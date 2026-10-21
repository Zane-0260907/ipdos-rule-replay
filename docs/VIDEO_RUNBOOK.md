# Proposed 4 minute 30 second tool demonstration

Status: preparation only. No video has been recorded in this task.

## Preparation

- Use the final reviewed commit and the source/evidence package. Run `npm ci --ignore-scripts`, `npm run prisma:generate`, `npm run build`, and `npm run demo` from the repository root.
- Open `http://127.0.0.1:3017/demo` in a fresh browser profile at approximately 1440px width and 100% zoom. Close unrelated tabs and notifications; avoid displaying any existing credentials, private paths or business data.
- Confirm `npm test -- --runInBand`, the baseline compatibility command and `npm run replay:evidence` pass. The scenario summary should read 10, 10/10, 9/10, 1.
- Prepare a terminal in the repository root with only the export-verification command visible. Browser downloads should go to a dedicated local demo folder. Have a screen recorder and microphone available; this task has not installed or configured a recorder.
- Record actual interaction and terminal execution. Do not fabricate a completed command, splice in a different result or narrate the seeded regression as historical. If a command fails, fix it before taking a fresh full recording.
- The interface is new and the data are synthetic. Keep those notices visible. The paper title is a candidate, not a submission claim. Recheck the venue's eventual video limits separately before recording the final submission version.

## Minimal timed script

| Time      | Actual action                                                                                                     | Suggested narration                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Show full interface and synthetic/new-demonstrator notices                                                        | “IPDOS provides reproducible checks for changes to decision-support rules. This new local workbench uses ten hand-authored synthetic scenarios and the existing backend rules registry.”                                                  |
| 0:30–1:10 | Keep `traffic-three` selected; expand fixed input and expected rules                                              | “This scenario freezes three traffic points and its evaluation time. Its explicit contract requires a low-resolution warning. We are checking software behavior, not predictive accuracy.”                                                |
| 1:10–1:55 | Expand policy versions; point to minTrafficPoints 8 versus 3 and trace table                                      | “The candidate deliberately lowers the minimum from eight to three. Both runs execute the same registry. The warning disappears, so the unchanged contract reports a regression. This is an injected example, not a production incident.” |
| 1:55–2:30 | Click Replay selected; show identical digests; run all scenarios                                                  | “The same frozen input and policy produce the same content identity on replay. The suite isolates one changed scenario: reference ten of ten, candidate nine of ten, thirty rule checks per policy.”                                      |
| 2:30–3:00 | Select menu-conflict; expand execution trace                                                                      | “The workbench also replays existing restock and menu-conflict checks. Traces include clear checks as well as full triggered RuleHit details.”                                                                                            |
| 3:00–3:35 | Return to traffic-three; choose registry-v1 as candidate, show 10/10 and zero changes; restore injected candidate | “Selecting the reference profile on both sides removes the difference. Restoring the intentionally weakened profile reproduces the failure.”                                                                                              |
| 3:35–4:10 | Export candidate JSON; show it and execute `npm run replay:verify -- <downloaded-file>`                           | “The export carries the synthetic snapshot, policy parameters, expectations, trace and content hashes. Verification re-executes the same implementation in a separate process. Verified replay can correctly retain a failed contract.”   |
| 4:10–4:30 | Return to interface or evidence summary                                                                           | “The artifact includes source, tests and reproduction instructions. These results are limited to synthetic rule contracts; they do not claim store benefits, causal identification, forecast accuracy or persistent auditing.”            |

For a short rehearsal without browser downloads, verify the checked-in actual export with `npm run replay:verify -- artifacts/seeded-regression.json`; clearly describe that file as the supplied export rather than a newly downloaded one.
