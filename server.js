const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const apiApp = require('./api/index');
const { scrapeSIH } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mount API routes
app.use(apiApp);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Cron job for local server
cron.schedule('*/15 * * * *', async () => {
  console.log('[Cron] Scheduled sync triggered...');
  try {
    await scrapeSIH(true);
    console.log('[Cron] Scheduled sync completed.');
  } catch (err) {
    console.error('[Cron] Sync error:', err.message);
  }
});

// Fallback to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 SIH 2026 PS Live Ranker Server running on http://localhost:${PORT}`);
  console.log(`✨ Primary URL: https://sih.gov.in/sih2026PS`);
  console.log(`📊 Category: "Software" (Lowest Ideas First)`);
  console.log(`===================================================`);
});
