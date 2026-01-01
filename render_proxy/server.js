const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Load environment variables (set in Render/Fly.io — NEVER in code)
const PROXY_SECRET = process.env.PROXY_SECRET_TOKEN;
const PAYSCRIBE_SECRET_KEY = process.env.PAYSCRIBE_SECRET_KEY;
const PAYSCRIBE_BASE_URL = process.env.PAYSCRIBE_BASE_URL || 'https://api.payscribe.ng/api/v1';

// Optional: Health check
app.get('/', (req, res) => {
  res.json({ status: '✅ Payscribe NG Proxy Running', timestamp: new Date().toISOString() });
});

// Endpoint to get outbound IP (for whitelisting)
app.get('/ip', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.ipify.org?format=json');
    res.json(data);
  } catch (err) {
    console.error('IP fetch failed:', err.message);
    res.status(500).json({ error: 'Could not retrieve IP' });
  }
});

// Main proxy endpoint: POST /payscribe
app.post('/payscribe', async (req, res) => {
  // 1. Authenticate the caller (your Supabase Edge Function)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${PROXY_SECRET}`) {
    console.warn('⚠️ Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Validate request body
  const { endpoint, payload } = req.body;
  if (!endpoint || typeof endpoint !== 'string' || !payload || typeof payload !== 'object') {
    return res.status(400).json({
      error: 'Invalid request. Expected: { "endpoint": "/path", "payload": { ... } }'
    });
  }

  // 3. Forward request to Payscribe.ng
  try {
    console.log(`→ Calling Payscribe.ng: ${endpoint}`);
    const response = await axios.post(
      `${PAYSCRIBE_BASE_URL}${endpoint}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAYSCRIBE_SECRET_KEY}`,
        },
        timeout: 10000,
      }
    );

    console.log(`← Payscribe.ng responded: ${response.status}`);
    return res.json(response.data);
  } catch (error) {
    console.error('Payscribe.ng API error:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Unknown error';

    return res.status(status).json({
      error: 'Payscribe request failed',
      details: message,
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy listening on port ${PORT}`);
});