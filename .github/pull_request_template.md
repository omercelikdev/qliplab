## Summary

<!-- Brief description of changes -->

## Checklist

- [ ] `npx tsc --noEmit` passes (zero errors)
- [ ] `npx vitest run` passes (all tests green)
- [ ] New/changed functions in `src/lib/` have unit tests
- [ ] All UI strings use `t('key')` — translations added to all 15 locales
- [ ] Logical CSS properties used (`ps-`/`pe-`, `ms-`/`me-`, `text-start`/`text-end`)
- [ ] Cross-platform: works on macOS, Windows, and Linux
- [ ] No `any` types in `src/` (except `as any` in tests)
- [ ] No `console.log` in production code
