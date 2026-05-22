# Email Verifier Module

A Node.js module and REST API that provides comprehensive email address verification. It validates syntax, catches common domain typos, resolves MX records, and actively checks for the mailbox's existence using the SMTP protocol.

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

## Features
- **Syntax Validation**: Ensures emails conform to the standard format.
- **Typo Detection**: Utilizes a custom Levenshtein distance algorithm to identify and suggest corrections for common domain typos (e.g., `gmial.com` to `gmail.com`).
- **DNS MX Lookup**: Verifies that the domain is configured to receive emails using Node's native `dns` module.
- **Active SMTP Checking**: Uses Node's native `net` TCP sockets to simulate an email dispatch (`EHLO`, `MAIL FROM`, `RCPT TO`) to confirm mailbox existence without sending a payload.
- **Robust Error Handling**: Identifies connection timeouts, temporary failures (like greylisting), and permanent rejections (e.g., 550 errors).

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
Run the comprehensive 16-case unit test suite using Jest. The test suite mocks the `net` and `dns` modules to simulate various server responses (250, 550, 450) without spamming external SMTP servers.

```bash
npm test
```
