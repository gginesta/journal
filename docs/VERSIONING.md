# Versioning

This project uses semantic versioning once releases begin.

## Version Format

- `0.x.y`: pre-launch development.
- `1.0.0`: first production-ready App Store release.
- Patch versions fix bugs without changing user-facing scope.
- Minor versions add features or meaningful UX improvements.
- Major versions are reserved for major data model, compatibility, or product changes.

## Source Of Truth

For each release:

- Update `MARKETING_VERSION` in the Xcode project.
- Update `CURRENT_PROJECT_VERSION` for the build number.
- Update `CHANGELOG.md`.
- Tag the release as `vX.Y.Z`.

## Branches

- `main`: stable trunk.
- `codex/<topic>`: implementation branches owned by Codex.
- `release/<version>`: optional stabilization branch for App Store release candidates.

## Commit Style

Use concise imperative commit messages:

- `Bootstrap iOS journal app`
- `Add Memory Lane date matching tests`
- `Wire reminder cadence settings`

Prefer small commits that leave the project in a buildable state when working on macOS.
