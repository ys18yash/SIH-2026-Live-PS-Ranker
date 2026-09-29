const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cheerio = require('cheerio');

// In Vercel serverless, root fs is read-only, but /tmp is writable
const ROOT_CACHE_FILE = path.join(__dirname, 'data_cache.json');
const TMP_CACHE_FILE = path.join(os.tmpdir(), 'sih_data_cache.json');
const SIH_URL = 'https://sih.gov.in/sih2026PS';

// In-memory cache for fast serverless responses across warm invocations
let memoryCache = null;

// Load cached data
function loadCache() {
  if (memoryCache) return memoryCache;

  try {
    if (fs.existsSync(TMP_CACHE_FILE)) {
      memoryCache = JSON.parse(fs.readFileSync(TMP_CACHE_FILE, 'utf8'));
      return memoryCache;
    }
  } catch (e) {}

  try {
    if (fs.existsSync(ROOT_CACHE_FILE)) {
      memoryCache = JSON.parse(fs.readFileSync(ROOT_CACHE_FILE, 'utf8'));
      return memoryCache;
    }
  } catch (e) {}

  return null;
}

// Save cache
function saveCache(data) {
  memoryCache = data;
  try {
    fs.writeFileSync(TMP_CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}

  try {
    fs.writeFileSync(ROOT_CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

// Fetch raw HTML from SIH
function fetchHTML() {
  return new Promise((resolve, reject) => {
    const req = https.get(SIH_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      },
      timeout: 25000,
      rejectUnauthorized: false
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchHTMLUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`SIH responded with HTTP ${res.statusCode}`));
      }
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve(html));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('SIH connection timed out'));
    });
  });
}

function parseProblemStatements(html) {
  const $ = cheerio.load(html);
  const rows = $('#dataTablePS > tbody > tr');
  const items = [];

  rows.each((i, el) => {
    const tds = $(el).children('td');
    if (tds.length < 6) return;

    const sno = $(tds[0]).text().trim();
    const organization = $(tds[1]).text().trim();
    
    const titleTd = $(tds[2]);
    const titleLink = titleTd.find('a').first();
    const title = titleLink.text().trim() || titleTd.clone().children().remove().end().text().trim();
    
    // Extract modal info
    const modal = titleTd.find('.modal');
    let description = '';
    let youtubeLink = '';
    let datasetLink = '';
    let psIdModal = '';
    let domainBucket = '';

    if (modal.length > 0) {
      modal.find('tr').each((mi, mtr) => {
        const th = $(mtr).find('th').text().trim().toLowerCase();
        const td = $(mtr).find('td').text().trim();
        if (th.includes('description')) {
          description = td;
        } else if (th.includes('youtube') || th.includes('video')) {
          const link = $(mtr).find('td a').attr('href') || td;
          if (link && link.startsWith('http')) youtubeLink = link;
        } else if (th.includes('dataset') || th.includes('data')) {
          const link = $(mtr).find('td a').attr('href') || td;
          if (link && link.startsWith('http')) datasetLink = link;
        } else if (th.includes('domain') || th.includes('bucket')) {
          domainBucket = td;
        } else if (th.includes('problem statement id') || th.includes('ps id')) {
          psIdModal = td;
        }
      });
    }

    const category = $(tds[3]).text().trim();
    const psNumber = $(tds[4]).text().trim() || psIdModal;
    const submittedIdeasRaw = $(tds[5]).text().trim();
    
    let submittedCount = 0;
    let maxCapacity = 500;
    if (submittedIdeasRaw.includes('/')) {
      const parts = submittedIdeasRaw.split('/');
      submittedCount = parseInt(parts[0].trim(), 10) || 0;
      maxCapacity = parseInt(parts[1].trim(), 10) || 500;
    } else {
      submittedCount = parseInt(submittedIdeasRaw.replace(/[^0-9]/g, ''), 10) || 0;
    }

    const theme = $(tds[6]).text().trim();
    const deadline = tds.length > 7 ? $(tds[7]).text().trim() : '';

    items.push({
      sno: parseInt(sno, 10) || (i + 1),
      psNumber,
      title,
      organization,
      category,
      submittedCount,
      maxCapacity,
      submittedIdeasRaw,
      theme,
      deadline,
      domainBucket,
      description,
      youtubeLink,
      datasetLink
    });
  });

  return items;
}

async function scrapeSIH(forceRefresh = false) {
  let html = '';
  let fromCache = false;
  let error = null;

  try {
    console.log(`[Scraper] Fetching live data from ${SIH_URL}...`);
    html = await fetchHTML();
    console.log(`[Scraper] Successfully fetched ${html.length} bytes from SIH.`);
  } catch (err) {
    console.warn(`[Scraper] Live fetch failed (${err.message}). Checking cache/local snapshot...`);
    error = err.message;
    const snapshotPath = path.join(__dirname, 'sih_page.html');
    if (fs.existsSync(snapshotPath)) {
      html = fs.readFileSync(snapshotPath, 'utf8');
      fromCache = true;
    }
  }

  if (!html) {
    const cached = loadCache();
    if (cached) return cached;
    throw new Error('No data available from live server or local cache.');
  }

  const allPS = parseProblemStatements(html);
  
  // Track previous counts for deltas
  const prevCache = loadCache();
  const prevMap = new Map();
  if (prevCache && prevCache.problemStatements) {
    prevCache.problemStatements.forEach(p => {
      prevMap.set(p.psNumber, p);
    });
  }

  // Calculate ranks and deltas for Software problem statements
  const softwarePS = allPS
    .filter(p => p.category.toLowerCase().includes('software'))
    .sort((a, b) => a.submittedCount - b.submittedCount || a.psNumber.localeCompare(b.psNumber));

  softwarePS.forEach((p, idx) => {
    p.rank = idx + 1;
    const prev = prevMap.get(p.psNumber);
    if (prev) {
      p.prevCount = prev.submittedCount;
      p.countDelta = p.submittedCount - prev.submittedCount;
      p.prevRank = prev.rank || null;
      p.rankDelta = prev.rank ? prev.rank - p.rank : 0;
    } else {
      p.prevCount = p.submittedCount;
      p.countDelta = 0;
      p.prevRank = p.rank;
      p.rankDelta = 0;
    }

    // Assign competition category
    if (p.submittedCount >= p.maxCapacity) {
      p.competitionLevel = 'Capped (Maxed Out)';
      p.competitionBadge = 'danger';
    } else if (p.submittedCount < 100) {
      p.competitionLevel = 'Very Low Competition';
      p.competitionBadge = 'success';
    } else if (p.submittedCount < 250) {
      p.competitionLevel = 'Moderate Competition';
      p.competitionBadge = 'info';
    } else {
      p.competitionLevel = 'High Competition';
      p.competitionBadge = 'warning';
    }
  });

  const allRanked = allPS.map(p => {
    const softMatch = softwarePS.find(s => s.psNumber === p.psNumber);
    return softMatch || p;
  });

  const themes = [...new Set(softwarePS.map(p => p.theme).filter(Boolean))].sort();
  const organizations = [...new Set(softwarePS.map(p => p.organization).filter(Boolean))].sort();

  const totalSoftware = softwarePS.length;
  const totalSubmissions = softwarePS.reduce((acc, p) => acc + p.submittedCount, 0);
  const avgSubmissions = Math.round(totalSubmissions / (totalSoftware || 1));
  const minSubmissions = softwarePS.length > 0 ? softwarePS[0].submittedCount : 0;
  const maxedOutCount = softwarePS.filter(p => p.submittedCount >= p.maxCapacity).length;
  const lowCompCount = softwarePS.filter(p => p.submittedCount < 100).length;

  const result = {
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) + ' (IST)',
    fromCache,
    error: error ? `Live sync issue: ${error}` : null,
    stats: {
      totalSoftware,
      totalAll: allPS.length,
      hardwareCount: allPS.length - totalSoftware,
      avgSubmissions,
      minSubmissions,
      maxedOutCount,
      lowCompCount
    },
    themes,
    organizations,
    problemStatements: softwarePS,
    allProblemStatements: allRanked
  };

  saveCache(result);
  return result;
}

module.exports = {
  scrapeSIH,
  loadCache,
  saveCache
};
