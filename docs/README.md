# IPDOS documentation

[Back to the project](../README.md) · [Stable v0.3.0 release](https://github.com/Zane-0260907/ipdos-rule-replay/releases/tag/v0.3.0)

## Current approval workbench

| Start here | What it contains |
| --- | --- |
| [Quick start](QUICKSTART.md) | Run the prebuilt app or a source checkout; ports, roles and storage |
| [Illustrated walkthrough](DEMO.md) | Procurement, selected review, document release and receipt retry |
| [Screenshot gallery](SCREENSHOTS.md) | Nine complete original English application captures |
| [Architecture](ARCHITECTURE.md) | Shared components, workflow adapters and commit boundary |
| [Evaluation](EVALUATION.md) | Readable results, exact denominators and costs |
| [Reproduce and audit](REPRODUCING.md) | Commands, artifacts and independent oracles |
| [Scope and limits](LIMITS.md) | Supported rules, trust assumptions and evidence boundaries |
| [Release status](RELEASE_STATUS.md) | Current immutable release and historical publication record |

## Executable contracts and source

- [Approval dependency contract](../approval-workbench/study/CONTRACT.md)
- [DocumentRelease contract](../approval-workbench/study/DOCUMENT_CONTRACT.md)
- [Implementation notes and explicit renewal semantics](../approval-workbench/study/CONTRACT_IMPLEMENTATION_NOTES.md)
- [Formula differences from the old restaurant demo](../approval-workbench/study/LEGACY_DIFFERENCES.md)
- [Application source](../approval-workbench/) and [core modules](../approval-workbench/core/)
- [Setter correction and handled-error UI regression](../approval-workbench/study/UI_CORRECTION.md)

## Evidence and public-source replay

- [Machine-readable evaluation](../reproducibility/approval-workbench/study/report/EVALUATION.json)
- [Frozen evaluation report](../reproducibility/approval-workbench/study/report/REPORT.md) and [readable typography-normalized view](EVALUATION.md)
- [Archived raw records](../reproducibility/approval-workbench/study/results/) and [public derivation manifest](../reproducibility/approval-workbench/PUBLIC_EVIDENCE_DERIVATION.json)
- [Public-source replay guide](../public-source-replay/README.md), [frozen protocol](../public-source-replay/PROTOCOL.md), [results](../public-source-replay/REPORT.md) and [public packaging notes](../public-source-replay/PUBLICATION.md)
- [Publication checks](../verification/v0.3.0/PUBLICATION_REVIEW.json) and [release checksums](../verification/v0.3.0/SHA256SUMS.txt)

## Earlier versions, retained in full

The following documents describe earlier tools. Their tests, formulas, screenshots and recordings must not be presented as evidence for the current workbench.

| Earlier tool | Guide and evidence |
| --- | --- |
| Business Flow R2 | [Illustrated landing page](../README-business-r2.md), [developer guide](../business-demo/README.md), [source provenance](../business-demo/SOURCE_PROVENANCE.json), [runtime verification](../business-demo/verification/prebuilt-runtime-verification-r1.json), [release files](https://github.com/Zane-0260907/ipdos-rule-replay/releases/tag/v0.2.0-business-r2) |
| Initial rule replay | [Original README](../README-rule-replay.md), [mechanism and results](MECHANISM_AND_RESULTS.md), [reproducibility](REPRODUCIBILITY.md), [video plan](VIDEO_RUNBOOK.md) |

## License and credit

[Apache-2.0 project license](../LICENSE) · [Author record](../README-rule-replay.md#authors--maintainers) · [Frontend dependency legal texts](../approval-workbench/THIRD_PARTY_LICENSES/INVENTORY.json) · [Public-source attribution](../public-source-replay/README.md)
