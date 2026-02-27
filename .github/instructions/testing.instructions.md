---
applyTo: '**/*.{test,spec}.{ts,tsx}'
---

# Test Review Instructions

## Framework

- Jest with React Native preset.
- Test files live in `src/__tests__/` or `src/api/__tests__/`.
- File naming: `*.test.tsx` or `*.spec.ts`.

## What to Check

### Coverage
- New public API methods should have corresponding tests.
- Edge cases: null/undefined inputs, empty arrays, missing optional parameters.
- Error paths: what happens when the native module rejects?

### Mocking
- The native module (`NativeTealiumPrismReactNative`) must be mocked in tests — it doesn't exist in the Jest environment.
- Verify mocks are reset between tests (`jest.clearAllMocks()` or `beforeEach` cleanup).
- Mock return values should match the actual TurboModule spec types.

### Test Quality
- Tests should verify behavior, not implementation details.
- Avoid testing private methods directly — test through the public API.
- Each test should be independent and not depend on execution order.
- Test names should describe the expected behavior: `it('returns null when key does not exist')`.

### Data Layer Tests
- Test type dispatch logic: string, number, boolean, arrays, objects all route to different native methods.
- Test that unsupported types produce console warnings.
- Test event subscription reference counting (add/remove listeners).
- Test transactional operations: pre-reads, put, remove, batching.
