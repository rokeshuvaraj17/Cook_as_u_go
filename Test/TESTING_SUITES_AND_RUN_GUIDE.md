# Testing Suites and Run Guide

This document explains exactly which test suites are configured now, which test cases are implemented, and how to run and inspect results.

## Testing suites used

- `Jest` for deterministic automated unit tests.
- `Jest + Istanbul coverage` for strict code coverage gates.
- `Stryker` for mutation testing (test-quality verification).
- `Manual functional suite document` for end-to-end app behavior validation:
  - `Test/APP_FUNCTIONAL_TEST_CASES.md`

## Automated suites currently implemented

### Suite: Backend scan upstream config

- **Target module:** `Test/mutation-targets/scanUpstream.js`
- **Mirrors production logic in:** `Backend/src/config/scanUpstream.js`
- **Automated test file:** `Test/test-cases/backend/scanUpstream.test.js`

Implemented test cases in this suite:

- Defaults to `http://127.0.0.1:8000` when `SCAN_API_URL` is unset.
- Trims trailing slash from `SCAN_API_URL`.
- Flags `127.0.0.1` as misconfigured for cloud proxy health.
- Flags `localhost` as misconfigured for cloud proxy health.
- Flags IPv6 loopback as misconfigured for cloud proxy health.
- Flags `0.0.0.0` as misconfigured for cloud proxy health.
- Accepts public HTTPS host as valid.
- Returns safe fallback metadata for invalid URL values.

## Coverage and mutation gates

- Coverage thresholds are strict 100%:
  - lines: `100`
  - statements: `100`
  - branches: `100`
  - functions: `100`
- Mutation threshold is strict 100%:
  - break/high/low: `100`

Current status after latest run:

- Coverage: `100%` (all gates pass)
- Mutation score: `100%` (gate passes)

## How to run tests

From project root:

```bash
cd Test
npm install
```

Run base test suite:

```bash
npm test
```

Run strict coverage gate:

```bash
npm run test:coverage
```

Run mutation gate:

```bash
npm run test:mutation
```

Run both quality gates in sequence:

```bash
npm run test:coverage && npm run test:mutation
```

## How to see test results

- **Terminal output:** immediate pass/fail and per-test details after each command.
- **Coverage artifacts:** generated in `Test/coverage`.
  - Open `Test/coverage/lcov-report/index.html` in a browser for detailed line/branch views.
- **Mutation artifacts:** generated in `Test/reports/mutation`.
  - Open `Test/reports/mutation/index.html` for killed/survived mutant details.

## Related files

- `Test/package.json`
- `Test/jest.config.cjs`
- `Test/jest.mutation.config.cjs`
- `Test/stryker.config.json`
- `Test/test-cases/backend/scanUpstream.test.js`
- `Test/mutation-targets/scanUpstream.js`
- `Backend/src/config/scanUpstream.js`
