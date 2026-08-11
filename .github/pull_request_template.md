# Summary

Describe what changed and why.

## Product Context

- Current web beta version:
- Surface changed: Homepage / Login / Onboarding / Today / Memories / Calendar / Insights / Settings / Supabase / iOS / Docs
- User value:
- Privacy or data impact:

## Verification

Run applicable checks and mark them:

- [ ] `cd web; npm.cmd run lint`
- [ ] `cd web; npm.cmd run typecheck`
- [ ] `cd web; npm.cmd test`
- [ ] `cd web; npm.cmd run build`
- [ ] `cd web; npm.cmd run test:e2e`
- [ ] iOS build/tests on macOS if native files changed
- [ ] Manual mobile pass
- [ ] Supabase/RLS check if database, auth, or Storage changed
- [ ] Touched a SPEC-numbered rule → `docs/SPEC.md`, the `spec/fixtures/` file, and both platforms' tests updated in this PR

## Screenshots / Notes

Add screenshots for UI work, especially mobile.

## Documentation

- [ ] README/docs updated if behavior changed
- [ ] Version updated if shipping a beta change
- [ ] QA checklist updated if new manual coverage is needed
