# ai-auto-projects

This repository is developed autonomously by a multi-agent Loop:

- **Issues** describe features to build.
- A local **Claude Code** worker implements them and opens Pull Requests.
- A **Hermes** review agent comments a verdict (`VERDICT: APPROVE` / `VERDICT: CHANGES_REQUESTED`).
- CI (pytest) is the quality gate: Hermes only reviews after CI is green.

## Layout
- `calculator.py` — a tiny example utility module.
- `tests/` — pytest suite.
- `.github/workflows/ci.yml` — CI that runs on every PR.

Open an Issue to request a feature and watch the Loop work.
