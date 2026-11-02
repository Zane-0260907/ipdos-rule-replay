# UI correction after independent video audit

The first workbench recording and prebuilt v1 contained a real handled runtime error, `setPreview is not a function` (minified receiver `o`/`n`). The ApprovalProvider context omitted its preview setter; fresh-fixture reset and quantity-save handlers called that missing setter. Backend mutations had already run before the handler failed. A previous video QA checked uncaught browser exceptions, codec/timing and selected frames, but missed this caught exception displayed as a red alert. Its prior pass is withdrawn.

Confirmed old footage: opening visible at 0 through about 7 seconds (scrolling hides it, state persists until the next action at 17); quantity save around 135.30–135.50 seconds; document fresh-fixture reset around 190.96–193.03 seconds. Raw capture and old deliverables are retained. No pixels were covered, edited or cropped.

## Exact product-source change

Only frontend/src/components/ApprovalWorkbench.tsx changed: expose existing setPreview and setPending through Flow.Provider; clear selected preview and pending confirmation state when resetting a synthetic fixture, then retain the real reload; use workflow-neutral copy, “Equal decision values do not make changed evidence reusable.” No permissions, calculations, rules, fixtures or core/server code changed.

## Regression and replacement

The isolated browser client now observes actual error alerts across page reloads using a nonvisual MutationObserver/CDP console channel and checks their DOM text after actions. The old prebuilt is a negative control: the new checker fails on its actual missing-setter alert. Drivers wait for a new navigation time origin after reset, avoiding a stale DOM readiness race. Procurement and document end-to-end flows run against a fresh extraction of corrected prebuilt v2, with zero UI alerts and uncaught exceptions. The frozen 26-action video is then rehearsed and fully re-recorded continuously for 270 seconds. The original new-workbench narration/timeline is reused; no footage from the erroneous take or legacy restaurant demo is reused.

All nine core source hashes match the frozen 592-procurement/276-document study environment. Original research raw data, SQLite archives and timing are unchanged and are not rerun for this UI-only correction. New frontend/build/package/video hashes are reported separately. Old UI pass records remain historical, superseded by prebuilt-acceptance-v2.json. The video correction is authoritative only after its new recording and QA succeed; pending status is recorded in PROGRESS.json until then.
