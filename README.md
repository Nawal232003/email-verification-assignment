# Email Verifier Module

A robust Node.js module and REST API for comprehensive email address verification.

## Assignment Fulfillment

### Part 1: Core Email Verification Function
- **Syntax Validation:** Handles format checking, string length, and multiple/missing `@` constraints.
- **DNS MX Lookup:** Uses Node's native `dns` module to resolve mail servers and sorts them by priority.
- **SMTP Verification:** Connects to the target MX server via native `net` TCP sockets. Simulates the `EHLO`, `MAIL FROM`, and `RCPT TO` sequence to verify mailbox existence. Returns the required structured JSON output with appropriate error codes (1=valid, 3=unknown, 6=invalid) and execution times.

### Part 2: "Did You Mean?" Typo Detection
- Custom implementation of the **Levenshtein distance algorithm**.
- Fuzzy matches domains against a common list (`gmail.com`, `yahoo.com`, `hotmail.com`, `outlook.com`) with an edit distance of ≤ 2.
- Automatically flags typos as `invalid` and appends the corrected domain to the `didyoumean` key.

### Part 3: Unit Tests
- Test-driven suite implemented using **Jest**.
- **16 distinct test cases** covering all assignment requirements:
  - Syntax valid/invalid formats.
  - SMTP mock simulation handling `250`, `550`, and `450` codes.
  - Connection timeouts via mocked TCP sockets.
  - Edge cases (null, empty strings, max length violations, multi-symbol checks).

---

## Live API Demo
The API is currently deployed on Vercel. You can test it by passing an email address as a query parameter:

**Endpoint:**
```
https://email-verification-assignment.vercel.app/api/verify?email=test@example.com
```

### ⚠️ Important Note Regarding Live Deployment (Port 25)
When testing the live Vercel URL, you may notice the response returns a `"connection_timeout"`. This is **expected behavior** for cloud deployments. 
Vercel, AWS, and most cloud providers **block outbound traffic on Port 25 (SMTP)** to prevent spam abuse on their networks. The application successfully resolves the MX records but is blocked by the cloud provider's firewall from completing the final SMTP handshake. 

To see the full SMTP verification succeed, please run the application or the test suite **locally**.

---

## Installation & Local Usage

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Run the quick local demo to see it in action:
```bash
node demo.js
```

3. Or, start the local Express API server:
```bash
npm start
```
*Then visit: `http://localhost:3000/api/verify?email=test@example.com`*

## Testing
Run the comprehensive 16-case unit test suite:
```bash
npm test
```
