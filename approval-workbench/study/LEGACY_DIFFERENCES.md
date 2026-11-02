# Distinct prototype contract and legacy demonstration

This prototype is a new isolated implementation. It does not replace the English conservative application, its submitted paper, its recording, or the earlier 420-trial weak-mechanism study. Those earlier results are not validation data for the new dependency interpreter or document adapter. The four new comparators are self-implemented against the same new contract; the whole-revision arm is not an unchanged execution of the old Nest service.

## Actual legacy calculation

Read from `ipdos-english/backend/src/business/domain.ts`: demand is in kg; safety multiplier is 1.10; target and suggested quantities use the helper `Math.round((value + Number.EPSILON) * 100) / 100`. Suggested purchase is rounded `max(0, targetStock - currentStock)`. The synthetic rice demand is 50 kg, stock starts at 25 kg, and the computed suggestion is 30 kg. The old demonstration's 31.5 kg reviewed amount is a human adjustment above that suggestion. At stock 20 kg, the old computed suggestion is 35 kg; 36.5 kg is again an explicit adjusted proposal. Neither 31.5 nor 36.5 alone proves the old formula.

## Frozen new procurement calculation and fixture

Quantities are safe integer grams. The frozen matrix fixture has `bufferBp = 11300` (13% buffer), deliberately selected before the first matrix run to retain the two familiar numerical endpoints in the new walkthrough. This changes the rule parameter and the meaning of the two endpoints. `targetG = ceil(demandG * bufferBp / 10000)`. Active, eligible reserve grams reduce availability: `suggestedG = max(0, targetG - max(0, onHandG - activeReserveG))`. Exact declared arithmetic rejects invalid or overflowing intermediates. This is not the old round-to-two-decimal kg rule.

At 50000 g demand, 25000 g stock and zero active reserve grams, the new suggestion is 31500 g. At 20000 g stock it is 36500 g. Initial proposals are independently stored as rice 31500 g, chicken 25000 g and greens 0 g; they need not equal suggestions. Thus the new chicken suggestion is 25900 g while its initial proposal remains 25000 g. Changing rice stock alone does not silently change any proposal. The browser walkthrough explicitly saves rice 36500 g, then reviews all shared-budget decisions before confirming.

New additional protected evidence includes reserve member identity and joined reason versions, prices and a shared budget. Unit prices are rice 200, chicken 300 and greens 100 cents per kg. `lineCostCents = ceil(proposedG * centsPerKg / 1000)`; total cost is the exact sum. The three-line fixture's budget is 30000 cents, and its initial proposed cost is 13800 cents (6300 + 7500 + 0). Changing rice to 36500 g makes that 14800 cents. Other committed budget uses are protected members; this is not a real purchasing cost/benefit observation.

The first eight development checks used a 11000-bp fixture. The pre-matrix change to 11300 and the opaque-condition correction are recorded in `DEVELOPMENT_NOTES.md`. All 44-scenario comparison traces use the frozen 11300-bp fixture, shared across all four modes. The document workflow uses its separate frozen content/signature/audience contract. Source digests identify each study version; no claim is made that old and new hashes or functions are unchanged.

Paper authors should describe and cite the new records as a separate local synthetic capability evaluation. They should not use old screenshots, old 420-trial counts, or the matching 31.5/36.5 kg endpoints as evidence for the new contract.
