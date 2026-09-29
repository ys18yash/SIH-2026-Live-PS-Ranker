const express = require('express');
const cors = require('cors');
const path = require('path');
const { scrapeSIH, loadCache } = require('../scraper');

const app = express();

app.use(cors());
app.use(express.json());

// In-memory state
let currentData = loadCache();
let isSyncing = false;

// Helper to ensure data is loaded
async function ensureData() {
  if (!currentData) {
    currentData = loadCache();
  }
  if (!currentData) {
    try {
      isSyncing = true;
      currentData = await scrapeSIH();
    } catch (e) {
      console.error('ensureData error:', e);
    } finally {
      isSyncing = false;
    }
  }
  return currentData;
}

// 1. GET /api/problem-statements
app.get('/api/problem-statements', async (req, res) => {
  const data = await ensureData();
  
  if (!data) {
    return res.status(503).json({
      error: 'Data is currently being fetched. Please try again in a few seconds.',
      isSyncing: true
    });
  }

  const {
    category = 'software',
    search = '',
    theme = '',
    organization = '',
    competition = '',
    sortBy = 'submittedCount',
    sortOrder = 'asc'
  } = req.query;

  let list = category === 'all' 
    ? (data.allProblemStatements || data.problemStatements)
    : (category === 'hardware' 
        ? (data.allProblemStatements || []).filter(p => p.category.toLowerCase().includes('hardware'))
        : (data.problemStatements || []));

  // Search filter
  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    list = list.filter(p => 
      p.psNumber.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.organization.toLowerCase().includes(q) ||
      p.theme.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

  // Theme filter
  if (theme && theme !== 'all') {
    list = list.filter(p => p.theme.toLowerCase() === theme.toLowerCase());
  }

  // Organization filter
  if (organization && organization !== 'all') {
    list = list.filter(p => p.organization.toLowerCase() === organization.toLowerCase());
  }

  // Competition level filter
  if (competition && competition !== 'all') {
    list = list.filter(p => {
      if (competition === 'very-low') return p.submittedCount < 100;
      if (competition === 'moderate') return p.submittedCount >= 100 && p.submittedCount < 250;
      if (competition === 'high') return p.submittedCount >= 250 && p.submittedCount < p.maxCapacity;
      if (competition === 'capped') return p.submittedCount >= p.maxCapacity;
      return true;
    });
  }

  // Sorting
  list = [...list].sort((a, b) => {
    if (sortBy === 'submittedCount' || sortBy === 'rank') {
      const diff = a.submittedCount - b.submittedCount;
      return sortOrder === 'desc' ? -diff : diff;
    }
    if (sortBy === 'submittedCountDesc') {
      return b.submittedCount - a.submittedCount;
    }
    if (sortBy === 'psNumber') {
      return sortOrder === 'desc' ? b.psNumber.localeCompare(a.psNumber) : a.psNumber.localeCompare(b.psNumber);
    }
    if (sortBy === 'title') {
      return sortOrder === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title);
    }
    if (sortBy === 'organization') {
      return sortOrder === 'desc' ? b.organization.localeCompare(a.organization) : a.organization.localeCompare(b.organization);
    }
    return a.submittedCount - b.submittedCount;
  });

  res.json({
    success: true,
    totalReturned: list.length,
    totalSoftware: data.stats ? data.stats.totalSoftware : 182,
    lastUpdated: data.lastUpdated,
    timestamp: data.timestamp,
    isSyncing,
    fromCache: data.fromCache,
    error: data.error,
    stats: data.stats,
    themes: data.themes,
    organizations: data.organizations,
    data: list
  });
});

// 2. POST /api/refresh
app.all(['/api/refresh', '/api/sync'], async (req, res) => {
  try {
    isSyncing = true;
    currentData = await scrapeSIH(true);
    res.json({
      success: true,
      message: 'Successfully synced live data from SIH.',
      data: currentData
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      data: currentData
    });
  } finally {
    isSyncing = false;
  }
});

// 3. GET /api/stats
app.get('/api/stats', async (req, res) => {
  const data = await ensureData();
  if (!data || !data.problemStatements) {
    return res.status(503).json({ error: 'Data not ready yet.' });
  }

  const software = data.problemStatements;
  const themeCounts = {};
  software.forEach(p => {
    themeCounts[p.theme] = (themeCounts[p.theme] || 0) + 1;
  });

  const orgCounts = {};
  software.forEach(p => {
    orgCounts[p.organization] = (orgCounts[p.organization] || 0) + 1;
  });

  const topLeastSubmitted = [...software]
    .sort((a, b) => a.submittedCount - b.submittedCount)
    .slice(0, 10);

  const competitionBuckets = {
    'Very Low (<100)': software.filter(p => p.submittedCount < 100).length,
    'Moderate (100-249)': software.filter(p => p.submittedCount >= 100 && p.submittedCount < 250).length,
    'High (250-499)': software.filter(p => p.submittedCount >= 250 && p.submittedCount < p.maxCapacity).length,
    'Capped (500/500)': software.filter(p => p.submittedCount >= p.maxCapacity).length
  };

  res.json({
    success: true,
    stats: data.stats,
    themeCounts,
    orgCounts,
    topLeastSubmitted,
    competitionBuckets,
    lastUpdated: data.lastUpdated
  });
});

// 4. GET /api/export/csv
app.get('/api/export/csv', async (req, res) => {
  const data = await ensureData();
  if (!data || !data.problemStatements) {
    return res.status(503).send('Data not ready.');
  }

  const software = data.problemStatements;
  const headers = ['Rank', 'PS Number', 'Submitted Ideas', 'Max Capacity', 'Organization', 'Category', 'Theme', 'Title', 'Deadline', 'YouTube Link', 'Dataset Link'];
  
  const csvRows = [headers.join(',')];

  software.forEach(p => {
    const row = [
      p.rank,
      `"${(p.psNumber || '').replace(/"/g, '""')}"`,
      p.submittedCount,
      p.maxCapacity,
      `"${(p.organization || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${(p.theme || '').replace(/"/g, '""')}"`,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.deadline || '').replace(/"/g, '""')}"`,
      `"${(p.youtubeLink || '').replace(/"/g, '""')}"`,
      `"${(p.datasetLink || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sih2026_software_ps_ranked.csv"');
  res.send(csvRows.join('\r\n'));
});

module.exports = app;
