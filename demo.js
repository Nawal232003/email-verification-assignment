const { verifyEmail } = require('./index');

async function runDemo() {
  console.log("=== Email Verification Module Demo ===");

  const testEmails = [
    "test@gmail.com",       // Valid email (assuming gmail mx resolves)
    "user@gmial.com",       // Typo detection
    "invalid@@email..com",  // Syntax error
    "fakeuser123456789xyz@example.com" // Mailbox likely doesn't exist
  ];

  for (const email of testEmails) {
    console.log(`\nVerifying: ${email}`);
    console.log("-------------------------------------------------");
    const result = await verifyEmail(email);
    console.log(JSON.stringify(result, null, 2));
  }
}

runDemo();
