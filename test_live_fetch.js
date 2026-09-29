const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');

async function fetchSIH() {
  console.log('Fetching live from SIH...');
  const agent = new https.Agent({  
    rejectUnauthorized: false
  });

  const response = await axios.get('https://sih.gov.in/sih2026PS', {
    httpsAgent: agent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    },
    timeout: 30000
  });

  console.log('Status:', response.status);
  console.log('Data length:', response.data.length);
  const $ = cheerio.load(response.data);
  const rowCount = $('#dataTablePS > tbody > tr').length;
  console.log('Row count:', rowCount);
}

fetchSIH().catch(err => console.error('Fetch error:', err.message));
