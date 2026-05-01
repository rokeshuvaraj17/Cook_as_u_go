# Coverage and Mutation Quality Gate

This document defines the quality gate for automated testing.

## Target Gate

- **Line coverage:** 100%
- **Branch coverage:** 100%
- **Mutation score:** 100%

## Practical Note

For real-world projects, 100% mutation score can require substantial refactoring and test hardening. Treat this as a strict target gate for critical modules first, then expand scope.

## Recommended Rollout

1. Start with critical code paths:
   - Auth flows
   - Pantry CRUD
   - Receipt scan proxy and error handling
   - Bill save/revert behavior
2. Enforce 100/100/100 on those modules.
3. Gradually expand to all modules.

## Implemented Tooling (this repo)

- **Coverage:** Jest with strict global thresholds (100/100/100/100)
- **Mutation:** StrykerJS with break/high/low thresholds all set to 100
- **Current target module:** `Backend/src/config/scanUpstream.js`

## Suggested Commands (example)

```bash
cd Test
npm install

# unit tests + strict coverage gate
npm run test:coverage

# mutation gate
npm run test:mutation
```

## Pass/Fail Criteria

- Build fails if any configured threshold is below target.
- Any duplicated tests should be removed when they validate the exact same behavior and assertion path.

## Non-duplication Rule

A test is considered duplicate if all three are identical:
- same preconditions,
- same action,
- same expected output.

If only data values differ but behavior class is the same, use parameterized tests instead of separate duplicate tests.
