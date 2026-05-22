const express = require('express');
const cors = require('cors');
const { verifyEmail } = require('./index');

const app = express();
app.use(cors());
app.use(express.json());

// Main API Endpoint
app.get('/api/verify', async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ 
      error: 'Email parameter is required. Example: /api/verify?email=test@example.com' 
    });
  }

  try {
    const result = await verifyEmail(email);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root endpoint for health check
app.get('/', (req, res) => {
  res.send('Email Verification API is running. Use /api/verify?email=test@example.com');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // Export for Vercel serverless
