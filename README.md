# Email Verifier Module

A Node.js module that provides comprehensive email address verification. It validates syntax, catches common domain typos, resolves MX records, and actively checks for the mailbox's existence using the SMTP protocol.

## Features

- **Syntax Validation**: Ensures emails conform to the standard format.
- **Typo Detection**: Utilizes the Levenshtein distance algorithm to identify and suggest corrections for common domain typos (e.g., `gmial.com` to `gmail.com`).
- **DNS MX Lookup**: Verifies that the domain is configured to receive emails.
- **Active SMTP Checking**: Connects to the target MX server and simulates an email dispatch (`HELO`, `MAIL FROM`, `RCPT TO`) to confirm if the specific user mailbox exists without actually sending an email.
- **Robust Error Handling**: Identifies connection timeouts, temporary failures (like greylisting), and permanent rejections (e.g., 550 errors).

## Installation

Clone the repository and install the dev dependencies (Jest) to run tests:

```bash
npm install
```

## Usage

```javascript
const { verifyEmail, getDidYouMean } = require('./index');

(async () => {
  // Full verification
  const result = await verifyEmail('user@example.com');
  console.log(result);

  // Example output for valid email:
  // {
  //   email: 'user@example.com',
  //   result: 'valid', // 'valid', 'invalid', or 'unknown'
  //   resultcode: 1,   // 1=valid, 6=invalid, 3=unknown
  //   subresult: 'mailbox_exists',
  //   domain: 'example.com',
  //   mxRecords: ['mx1.example.com'],
  //   executiontime: 0.15,
  //   error: null,
  //   timestamp: '2026-05-22T12:00:00.000Z'
  // }

  // Just checking for typos
  const suggestion = getDidYouMean('user@gmial.com');
  console.log(suggestion); // Output: 'user@gmail.com'
})();
```

## Testing

Run the comprehensive unit test suite using Jest:

```bash
npm test
```

## How It Works

1. **Syntax Check**: Quick regex evaluation.
2. **Typo Check**: Checks domain against a list of common providers.
3. **DNS**: Uses Node's `dns` module to retrieve and sort MX records.
4. **SMTP**: Uses Node's `net` module to establish a TCP connection to port 25 of the MX record.
