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

## Workflow

- Plan and implementation work should start from `main`.
- Use `codex/<topic>` branches for focused changes.
- Keep docs, tests, and implementation changes in the same branch when they are part of the same product change.
- Open a PR when GitHub tooling is available, or push the branch and review through GitHub.
- Merge only after CI passes or after the failure is understood and documented.
- Avoid force-pushing `main`.

## Release Checklist

For every milestone release:

- Confirm `main` is clean.
- Confirm CI status.
- Update `CHANGELOG.md`.
- Update Xcode `MARKETING_VERSION`.
- Increment Xcode `CURRENT_PROJECT_VERSION`.
- Create an annotated tag:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

## Commit Style

Use concise imperative commit messages:

- `Bootstrap iOS journal app`
- `Add Memory Lane date matching tests`
- `Wire reminder cadence settings`

Prefer small commits that leave the project in a buildable state when working on macOS.
