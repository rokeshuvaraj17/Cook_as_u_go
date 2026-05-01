# Cook As U Go - App Functional Test Cases

This suite is intentionally de-duplicated: each test validates one distinct behavior path.

## Scope

- Mobile app (`Mobile_ui`)
- Backend API (`Backend`)
- Scan service (`ScanAndSave`)

## Legend

- **Priority**: P0 (critical), P1 (high), P2 (medium)
- **Type**: Positive / Negative / Edge

---

## Authentication

### TC-AUTH-001 (P0, Positive) - Register new user
- **Precondition:** User email does not exist.
- **Steps:** Open app -> Sign Up -> enter valid email/password/name -> submit.
- **Expected:** Account is created; user is redirected/logged in.

### TC-AUTH-002 (P0, Negative) - Register duplicate email
- **Precondition:** Email already exists.
- **Steps:** Attempt sign-up with existing email.
- **Expected:** Error message indicates account already exists.

### TC-AUTH-003 (P0, Positive) - Login success
- **Precondition:** Valid account exists.
- **Steps:** Login with correct credentials.
- **Expected:** Auth token received; pantry screen loads.

### TC-AUTH-004 (P0, Negative) - Login invalid credentials
- **Precondition:** Valid account exists.
- **Steps:** Login with wrong password.
- **Expected:** Login fails with clear invalid-credentials error.

### TC-AUTH-005 (P1, Positive) - Change password
- **Precondition:** Logged in user.
- **Steps:** Open change-password -> enter current + new valid password.
- **Expected:** Password update success; old password no longer works.

---

## Pantry Management

### TC-PANTRY-001 (P0, Positive) - Add pantry item
- **Precondition:** Logged in.
- **Steps:** Add item with valid name/amount/unit.
- **Expected:** Item appears in pantry list with saved values.

### TC-PANTRY-002 (P1, Positive) - Edit pantry item
- **Precondition:** Existing item.
- **Steps:** Edit amount/unit/note.
- **Expected:** Updated values persist after refresh.

### TC-PANTRY-003 (P1, Positive) - Delete pantry item
- **Precondition:** Existing item.
- **Steps:** Delete item.
- **Expected:** Item removed from list and backend.

### TC-PANTRY-004 (P2, Edge) - Decimal amount handling
- **Precondition:** Logged in.
- **Steps:** Add amount like `1.25`.
- **Expected:** UI and backend preserve numeric precision.

---

## Receipt Scan Flow

### TC-SCAN-001 (P0, Positive) - Scan receipt from camera
- **Precondition:** Camera permission granted; API key configured.
- **Steps:** Tap Scan Bill -> Take photo -> complete.
- **Expected:** Preview dialog shows merchant/date/items.

### TC-SCAN-002 (P0, Positive) - Scan receipt from gallery
- **Precondition:** Photo permission granted; API key configured.
- **Steps:** Tap Scan Bill -> Photo library -> select image.
- **Expected:** Preview loads parsed receipt data.

### TC-SCAN-003 (P0, Negative) - Missing API key
- **Precondition:** No default API key configured.
- **Steps:** Attempt receipt scan.
- **Expected:** Clear guidance to configure API settings.

### TC-SCAN-004 (P0, Negative) - Upstream rate limited (429)
- **Precondition:** Simulate/trigger provider 429.
- **Steps:** Run scan request.
- **Expected:** User sees rate-limit error; logs include status and debug metadata.

### TC-SCAN-005 (P1, Negative) - Scan service unavailable
- **Precondition:** Stop scan service or set invalid `SCAN_API_URL`.
- **Steps:** Run scan request.
- **Expected:** UI shows “receipt scan unavailable” style infra error.

---

## Bills

### TC-BILL-001 (P0, Positive) - Save scanned bill and add pantry
- **Precondition:** Successful receipt preview.
- **Steps:** Confirm save.
- **Expected:** Bill appears in bills list; pantry updates correctly.

### TC-BILL-002 (P1, Positive) - Edit bill
- **Precondition:** Existing bill.
- **Steps:** Update merchant/date/totals.
- **Expected:** Changes persist in detail/list screens.

### TC-BILL-003 (P1, Positive) - Delete bill
- **Precondition:** Existing bill.
- **Steps:** Delete bill.
- **Expected:** Bill removed and not returned by list endpoint.

### TC-BILL-004 (P1, Positive) - Revert latest bill
- **Precondition:** At least one saved bill.
- **Steps:** Trigger revert latest.
- **Expected:** Latest bill removed; pantry quantity rollback applied.

---

## API Settings

### TC-API-001 (P0, Positive) - Create API setting and set default
- **Precondition:** Logged in.
- **Steps:** Add provider/model/key and set default.
- **Expected:** Default setting is saved and returned by list API.

### TC-API-002 (P1, Positive) - Update API key
- **Precondition:** Existing API setting.
- **Steps:** Edit key/model.
- **Expected:** Setting updates and scan uses updated credentials.

### TC-API-003 (P1, Positive) - Delete API setting
- **Precondition:** Existing non-required setting.
- **Steps:** Delete setting.
- **Expected:** Removed from list; default behavior updated if needed.

---

## Reliability / Regression

### TC-REL-001 (P1, Edge) - Token expiry handling
- **Precondition:** Expired/invalid token.
- **Steps:** Perform protected action (load pantry/scan).
- **Expected:** User prompted to re-authenticate; no silent crash.

### TC-REL-002 (P2, Edge) - App restart persistence
- **Precondition:** Logged in with data loaded.
- **Steps:** Force close app -> reopen.
- **Expected:** Session state and key screens recover correctly.

---

## Execution Notes

- Run P0 tests on every release candidate.
- Run full suite before store submission.
- Attach evidence per test: screenshot/log/API response.
