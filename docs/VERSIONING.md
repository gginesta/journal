# Versioning

This project uses semantic versioning once releases begin.

## Version Format

- `0.x.y`: pre-launch development.
- `1.0.0`: first production-ready App Store release.
- Patch versions fix bugs without changing user-facing scope.
- Minor versions add features or meaningful UX improvements.
- Major versions are reserved for major data model, compatibility, or product changes.

## Source Of Truth

For native iOS releases:

- Update `MARKETING_VERSION` in the Xcode project.
- Update `CURRENT_PROJECT_VERSION` for the build number.
- Update `CHANGELOG.md`.
- Tag the release as `vX.Y.Z`.

For web beta releases:

- Update `web/package.json`.
- Let `web/package-lock.json` carry the same package version.
- Confirm Settings > Beta shows the package version in the running app.
- Update the milestone docs and QA notes with the tested version.

Current web beta version: `0.2.9`.

## TestFlight Builds

- Bundle id: `com.guill.PhotoGratitudeJournal`.
- iCloud container: `iCloud.com.guill.PhotoGratitudeJournal`.
- Keep `MARKETING_VERSION` aligned to the planned milestone.
- Increment `CURRENT_PROJECT_VERSION` for every uploaded TestFlight build, even if the marketing version is unchanged.
- Record the uploaded build number in tester notes and QA results.
- Do not tag every internal TestFlight upload; tag only named milestone releases or release candidates.

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
