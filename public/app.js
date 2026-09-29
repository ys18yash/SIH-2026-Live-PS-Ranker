// State Management
const state = {
  category: 'software', // 'software' by default
  search: '',
  theme: 'all',
  organization: 'all',
  competition: 'all',
  sortBy: 'submittedCount',
  sortOrder: 'asc',
  currentView: 'table', // 'table' | 'grid'
  quickFilter: null,
  starred: JSON.parse(localStorage.getItem('sih_starred_ps') || '[]'),
  data: [],
  allData: [],
  stats: null,
  isSyncing: false,
  lastSyncTime: null
};

// DOM Elements
const elements = {
  // Stats
  statRank1PS: document.getElementById('statRank1PS'),
  statRank1Desc: document.getElementById('statRank1Desc'),
  statLowComp: document.getElementById('statLowComp'),
  statTotalSoftware: document.getElementById('statTotalSoftware'),
  statAvgSubmissions: document.getElementById('statAvgSubmissions'),
  statCappedCount: document.getElementById('statCappedCount'),
  catSoftCount: document.getElementById('catSoftCount'),
  catHardCount: document.getElementById('catHardCount'),
  
  // Sync
  refreshBtn: document.getElementById('refreshBtn'),
  refreshIcon: document.getElementById('refreshIcon'),
  liveDot: document.getElementById('liveDot'),
  lastUpdatedTime: document.getElementById('lastUpdatedTime'),
  syncLabel: document.getElementById('syncLabel'),

  // Filters & Controls
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  categoryButtons: document.querySelectorAll('.cat-toggle'),
  themeSelect: document.getElementById('themeSelect'),
  orgSelect: document.getElementById('orgSelect'),
  competitionSelect: document.getElementById('competitionSelect'),
  sortSelect: document.getElementById('sortSelect'),
  quickTags: document.querySelectorAll('.quick-tag'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  resultsCountLabel: document.getElementById('resultsCountLabel'),
  
  // Views
  tableViewBtn: document.getElementById('tableViewBtn'),
  gridViewBtn: document.getElementById('gridViewBtn'),
  tableView: document.getElementById('tableView'),
  gridView: document.getElementById('gridView'),
  psTableBody: document.getElementById('psTableBody'),
  psCardsGrid: document.getElementById('psCardsGrid'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  
  // Modal
  detailModal: document.getElementById('detailModal'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  modalRank: document.getElementById('modalRank'),
  modalPSNumber: document.getElementById('modalPSNumber'),
  modalCategory: document.getElementById('modalCategory'),
  modalCompetition: document.getElementById('modalCompetition'),
  modalTitle: document.getElementById('modalTitle'),
  modalSubmissionCount: document.getElementById('modalSubmissionCount'),
  modalMaxCapacity: document.getElementById('modalMaxCapacity'),
  modalCapacityPercent: document.getElementById('modalCapacityPercent'),
  modalProgressBar: document.getElementById('modalProgressBar'),
  modalOrganization: document.getElementById('modalOrganization'),
  modalTheme: document.getElementById('modalTheme'),
  modalDeadline: document.getElementById('modalDeadline'),
  modalDomain: document.getElementById('modalDomain'),
  modalDomainBox: document.getElementById('modalDomainBox'),
  modalDescription: document.getElementById('modalDescription'),
  modalLinksGrid: document.getElementById('modalLinksGrid'),
  modalCopyPsBtn: document.getElementById('modalCopyPsBtn'),
  modalStarBtn: document.getElementById('modalStarBtn'),

  // Starred / Shortlist Drawer
  openShortlistBtn: document.getElementById('openShortlistBtn'),
  shortlistCount: document.getElementById('shortlistCount'),
  shortlistDrawer: document.getElementById('shortlistDrawer'),
  drawerCloseBtn: document.getElementById('drawerCloseBtn'),
  drawerShortlistCount: document.getElementById('drawerShortlistCount'),
  shortlistItemsContainer: document.getElementById('shortlistItemsContainer'),
  clearShortlistBtn: document.getElementById('clearShortlistBtn'),
  exportShortlistCsvBtn: document.getElementById('exportShortlistCsvBtn'),

  // Export
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  toastContainer: document.getElementById('toastContainer')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateShortlistBadges();
  fetchProblemStatements();

  // Auto-sync polling every 60 seconds
  setInterval(() => {
    fetchProblemStatements(true);
  }, 60000);
});

// Event Listeners
function setupEventListeners() {
  // Refresh / Sync button
  elements.refreshBtn.addEventListener('click', () => {
    syncWithSIH();
  });

  // Search input
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.clearSearchBtn.style.display = val ? 'block' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.search = val;
      renderCurrentData();
    }, 200);
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    state.search = '';
    renderCurrentData();
  });

  // Category buttons
  elements.categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = btn.getAttribute('data-category');
      fetchProblemStatements();
    });
  });

  // Select Filters
  elements.themeSelect.addEventListener('change', (e) => {
    state.theme = e.target.value;
    renderCurrentData();
  });

  elements.orgSelect.addEventListener('change', (e) => {
    state.organization = e.target.value;
    renderCurrentData();
  });

  elements.competitionSelect.addEventListener('change', (e) => {
    state.competition = e.target.value;
    renderCurrentData();
  });

  elements.sortSelect.addEventListener('change', (e) => {
    const [sortBy, sortOrder] = e.target.value.split('-');
    state.sortBy = sortBy;
    state.sortOrder = sortOrder;
    renderCurrentData();
  });

  // Quick Tags
  elements.quickTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const action = tag.getAttribute('data-action');
      if (!action) return;

      if (tag.classList.contains('active')) {
        tag.classList.remove('active');
        state.quickFilter = null;
      } else {
        elements.quickTags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        state.quickFilter = action;
      }
      renderCurrentData();
    });
  });

  elements.resetFiltersBtn.addEventListener('click', () => {
    window.resetAllFilters();
  });

  // View Switchers
  elements.tableViewBtn.addEventListener('click', () => {
    setView('table');
  });

  elements.gridViewBtn.addEventListener('click', () => {
    setView('grid');
  });

  // Shortlist Drawer
  elements.openShortlistBtn.addEventListener('click', () => {
    openShortlistDrawer();
  });

  elements.drawerCloseBtn.addEventListener('click', () => {
    closeShortlistDrawer();
  });

  elements.shortlistDrawer.addEventListener('click', (e) => {
    if (e.target === elements.shortlistDrawer) {
      closeShortlistDrawer();
    }
  });

  elements.clearShortlistBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all shortlisted problem statements?')) {
      state.starred = [];
      saveStarred();
      updateShortlistBadges();
      renderShortlistDrawer();
      renderCurrentData();
      showToast('Cleared all starred statements');
    }
  });

  elements.exportShortlistCsvBtn.addEventListener('click', () => {
    exportStarredCsv();
  });

  // Modal
  elements.modalCloseBtn.addEventListener('click', closeModal);
  elements.detailModal.addEventListener('click', (e) => {
    if (e.target === elements.detailModal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeShortlistDrawer();
    }
  });

  // Export CSV
  elements.exportCsvBtn.addEventListener('click', () => {
    window.location.href = '/api/export/csv';
  });
}

// Fetch Problem Statements from API
async function fetchProblemStatements(isBackground = false) {
  if (!isBackground) {
    elements.loadingState.style.display = 'flex';
    elements.tableView.style.display = 'none';
    elements.gridView.style.display = 'none';
    elements.emptyState.style.display = 'none';
  }

  try {
    const res = await fetch(`/api/problem-statements?category=${state.category}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    state.allData = json.data || [];
    state.stats = json.stats;
    state.lastSyncTime = json.lastUpdated;

    updateStatsBar(json.stats, json.data);
    populateDropdowns(json.themes, json.organizations);
    updateSyncStatus(json.lastUpdated, json.isSyncing, json.fromCache, json.error);
    
    renderCurrentData();
  } catch (err) {
    console.error('Error fetching data:', err);
    if (!isBackground) {
      showToast(`Error: ${err.message}`, 'error');
    }
  } finally {
    if (!isBackground) {
      elements.loadingState.style.display = 'none';
    }
  }
}

// Trigger Live Sync with SIH
async function syncWithSIH() {
  elements.refreshBtn.classList.add('spinning');
  elements.liveDot.classList.add('syncing');
  elements.syncLabel.textContent = 'Fetching SIH 2026 Portal...';
  showToast('Connecting to SIH portal for latest submission counts...');

  try {
    const res = await fetch('/api/refresh', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast('🎉 Rankings successfully updated with latest SIH counts!', 'success');
      await fetchProblemStatements();
    } else {
      showToast(`Sync warning: ${json.error || 'Using cached snapshot'}`, 'warning');
      await fetchProblemStatements();
    }
  } catch (err) {
    console.error('Sync failed:', err);
    showToast(`Sync issue: ${err.message}`, 'error');
  } finally {
    elements.refreshBtn.classList.remove('spinning');
    elements.liveDot.classList.remove('syncing');
  }
}

// Update Top Metric Cards
function updateStatsBar(stats, data) {
  if (!stats) return;

  elements.statTotalSoftware.textContent = stats.totalSoftware;
  elements.statAvgSubmissions.textContent = stats.avgSubmissions;
  elements.statCappedCount.textContent = stats.maxedOutCount;
  elements.statLowComp.textContent = stats.lowCompCount;

  if (elements.catSoftCount) elements.catSoftCount.textContent = stats.totalSoftware;
  if (elements.catHardCount) elements.catHardCount.textContent = stats.hardwareCount;

  // Rank 1 PS
  if (data && data.length > 0) {
    const top = data[0];
    elements.statRank1PS.textContent = top.psNumber;
    elements.statRank1Desc.textContent = `${top.submittedCount} / ${top.maxCapacity} ideas (${top.organization})`;
    
    document.getElementById('cardRank1').style.cursor = 'pointer';
    document.getElementById('cardRank1').onclick = () => openDetailModal(top);
  }
}

// Populate Theme & Organization Dropdowns
function populateDropdowns(themes, orgs) {
  if (themes && elements.themeSelect.options.length <= 1) {
    themes.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      elements.themeSelect.appendChild(opt);
    });
  }

  if (orgs && elements.orgSelect.options.length <= 1) {
    orgs.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      elements.orgSelect.appendChild(opt);
    });
  }
}

// Update Sync Status Bar
function updateSyncStatus(lastUpdated, isSyncing, fromCache, error) {
  if (isSyncing) {
    elements.liveDot.className = 'live-indicator syncing';
    elements.syncLabel.textContent = 'Syncing Live SIH Data...';
  } else if (error) {
    elements.liveDot.className = 'live-indicator error';
    elements.syncLabel.textContent = 'SIH Live Data (Offline/Fallback)';
  } else {
    elements.liveDot.className = 'live-indicator';
    elements.syncLabel.textContent = 'SIH.gov.in Live Connected';
  }
  elements.lastUpdatedTime.textContent = lastUpdated ? `Updated: ${lastUpdated}` : 'Live';
}

// Render Current Filtered Data
function renderCurrentData() {
  let list = [...state.allData];

  // 1. Search Query
  if (state.search) {
    const q = state.search.toLowerCase().trim();
    list = list.filter(p => 
      p.psNumber.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.organization.toLowerCase().includes(q) ||
      p.theme.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

  // 2. Theme Filter
  if (state.theme !== 'all') {
    list = list.filter(p => p.theme.toLowerCase() === state.theme.toLowerCase());
  }

  // 3. Organization Filter
  if (state.organization !== 'all') {
    list = list.filter(p => p.organization.toLowerCase() === state.organization.toLowerCase());
  }

  // 4. Competition Filter
  if (state.competition !== 'all') {
    list = list.filter(p => {
      if (state.competition === 'very-low') return p.submittedCount < 100;
      if (state.competition === 'moderate') return p.submittedCount >= 100 && p.submittedCount < 250;
      if (state.competition === 'high') return p.submittedCount >= 250 && p.submittedCount < p.maxCapacity;
      if (state.competition === 'capped') return p.submittedCount >= p.maxCapacity;
      return true;
    });
  }

  // 5. Quick Filter Actions
  if (state.quickFilter) {
    if (state.quickFilter === 'top20') {
      list = list.slice(0, 20);
    } else if (state.quickFilter === 'under100') {
      list = list.filter(p => p.submittedCount < 100);
    } else if (state.quickFilter === 'starred') {
      list = list.filter(p => state.starred.includes(p.psNumber));
    } else if (state.quickFilter === 'withMedia') {
      list = list.filter(p => p.youtubeLink || p.datasetLink);
    }
  }

  // 6. Sorting
  list.sort((a, b) => {
    if (state.sortBy === 'submittedCount' || state.sortBy === 'rank') {
      const diff = a.submittedCount - b.submittedCount;
      return state.sortOrder === 'desc' ? -diff : diff;
    }
    if (state.sortBy === 'psNumber') {
      return state.sortOrder === 'desc' ? b.psNumber.localeCompare(a.psNumber) : a.psNumber.localeCompare(b.psNumber);
    }
    if (state.sortBy === 'title') {
      return state.sortOrder === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title);
    }
    if (state.sortBy === 'organization') {
      return state.sortOrder === 'desc' ? b.organization.localeCompare(a.organization) : a.organization.localeCompare(b.organization);
    }
    return a.submittedCount - b.submittedCount;
  });

  state.data = list;
  elements.resultsCountLabel.textContent = `Showing ${list.length} problem statements`;

  if (list.length === 0) {
    elements.tableView.style.display = 'none';
    elements.gridView.style.display = 'none';
    elements.emptyState.style.display = 'flex';
  } else {
    elements.emptyState.style.display = 'none';
    if (state.currentView === 'table') {
      elements.tableView.style.display = 'block';
      elements.gridView.style.display = 'none';
      renderTable(list);
    } else {
      elements.tableView.style.display = 'none';
      elements.gridView.style.display = 'block';
      renderGrid(list);
    }
  }
}

// Render Table View
function renderTable(items) {
  elements.psTableBody.innerHTML = '';

  items.forEach((p, idx) => {
    const tr = document.createElement('tr');
    const isStarred = state.starred.includes(p.psNumber);
    const capacityPct = Math.min(100, Math.round((p.submittedCount / (p.maxCapacity || 500)) * 100));

    // Rank class
    let rankBadgeClass = 'rank-badge';
    if (p.rank === 1) {
      rankBadgeClass += ' rank-1';
      tr.classList.add('row-gold');
    } else if (p.rank === 2) {
      rankBadgeClass += ' rank-2';
    } else if (p.rank === 3) {
      rankBadgeClass += ' rank-3';
    } else if (p.rank <= 10) {
      rankBadgeClass += ' rank-top10';
    }

    if (isStarred) tr.classList.add('row-starred');

    // Tier class
    let tierClass = 'tier-info';
    let tierName = 'Moderate';
    if (p.submittedCount >= p.maxCapacity) {
      tierClass = 'tier-danger';
      tierName = 'Capped (500/500)';
    } else if (p.submittedCount < 100) {
      tierClass = 'tier-success';
      tierName = 'Very Low Competition';
    } else if (p.submittedCount >= 250) {
      tierClass = 'tier-warning';
      tierName = 'High Competition';
    }

    tr.innerHTML = `
      <td class="text-center">
        <div class="${rankBadgeClass}">#${p.rank}</div>
      </td>
      <td>
        <div class="ps-code-wrap">
          <span class="ps-code" onclick="window.copyToClipboard('${p.psNumber}')" title="Click to copy PS ID">${p.psNumber}</span>
          <button class="copy-mini-btn" onclick="window.copyToClipboard('${p.psNumber}')" title="Copy ID">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      </td>
      <td>
        <div class="competition-cell">
          <div class="comp-header">
            <div>
              <span class="count-number">${p.submittedCount}</span>
              <span class="count-total">/ ${p.maxCapacity}</span>
            </div>
            <span class="comp-tier-badge ${tierClass}">${tierName}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${tierClass}" style="width: ${capacityPct}%;"></div>
          </div>
        </div>
      </td>
      <td>
        <div class="title-cell">
          <div class="ps-title-link" onclick="window.openDetailByPs('${p.psNumber}')">${escapeHtml(p.title)}</div>
          ${p.description ? `<div class="ps-snippet">${escapeHtml(p.description)}</div>` : ''}
          <div class="ps-badges-row">
            ${p.youtubeLink ? `<span class="mini-pill media-pill-yt"><i class="fa-brands fa-youtube"></i> Video</span>` : ''}
            ${p.datasetLink ? `<span class="mini-pill media-pill-data"><i class="fa-solid fa-database"></i> Dataset</span>` : ''}
            ${p.deadline ? `<span class="mini-pill"><i class="fa-regular fa-calendar"></i> ${escapeHtml(p.deadline)}</span>` : ''}
          </div>
        </div>
      </td>
      <td>
        <div class="org-cell">${escapeHtml(p.organization)}</div>
      </td>
      <td>
        <span class="theme-pill">${escapeHtml(p.theme)}</span>
      </td>
      <td>
        <div class="actions-cell">
          <button class="action-btn view-btn" onclick="window.openDetailByPs('${p.psNumber}')" title="View Full Problem Statement Details">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </button>
          <button class="action-btn star-btn ${isStarred ? 'star-active' : ''}" onclick="window.toggleStar('${p.psNumber}')" title="${isStarred ? 'Remove from shortlist' : 'Star / Shortlist'}">
            <i class="${isStarred ? 'fa-solid' : 'fa-regular'} fa-star"></i>
          </button>
        </div>
      </td>
    `;

    elements.psTableBody.appendChild(tr);
  });
}

// Render Card Grid View
function renderGrid(items) {
  elements.psCardsGrid.innerHTML = '';

  items.forEach(p => {
    const card = document.createElement('div');
    const isStarred = state.starred.includes(p.psNumber);
    const capacityPct = Math.min(100, Math.round((p.submittedCount / (p.maxCapacity || 500)) * 100));

    card.className = `ps-card ${p.rank === 1 ? 'card-gold' : ''}`;

    let tierClass = 'tier-info';
    let tierName = 'Moderate';
    if (p.submittedCount >= p.maxCapacity) {
      tierClass = 'tier-danger';
      tierName = 'Capped (500)';
    } else if (p.submittedCount < 100) {
      tierClass = 'tier-success';
      tierName = 'Very Low Competition';
    } else if (p.submittedCount >= 250) {
      tierClass = 'tier-warning';
      tierName = 'High Competition';
    }

    card.innerHTML = `
      <div class="card-top">
        <div class="card-rank-wrap">
          <span class="rank-badge ${p.rank === 1 ? 'rank-1' : p.rank === 2 ? 'rank-2' : p.rank === 3 ? 'rank-3' : ''}">#${p.rank}</span>
          <span class="ps-code" onclick="window.copyToClipboard('${p.psNumber}')">${p.psNumber}</span>
        </div>
        <button class="action-btn star-btn ${isStarred ? 'star-active' : ''}" onclick="window.toggleStar('${p.psNumber}')" title="Star PS">
          <i class="${isStarred ? 'fa-solid' : 'fa-regular'} fa-star"></i>
        </button>
      </div>

      <div class="card-title" onclick="window.openDetailByPs('${p.psNumber}')">${escapeHtml(p.title)}</div>
      
      <div class="card-org">
        <i class="fa-solid fa-building-columns"></i>
        <span>${escapeHtml(p.organization)}</span>
      </div>

      <div class="competition-cell">
        <div class="comp-header">
          <div>
            <span class="count-number">${p.submittedCount}</span>
            <span class="count-total">/ ${p.maxCapacity} ideas</span>
          </div>
          <span class="comp-tier-badge ${tierClass}">${tierName}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${tierClass}" style="width: ${capacityPct}%;"></div>
        </div>
      </div>

      ${p.description ? `<div class="card-desc">${escapeHtml(p.description)}</div>` : ''}

      <div class="card-footer">
        <span class="theme-pill">${escapeHtml(p.theme)}</span>
        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem;" onclick="window.openDetailByPs('${p.psNumber}')">
          Details <i class="fa-solid fa-angle-right"></i>
        </button>
      </div>
    `;

    elements.psCardsGrid.appendChild(card);
  });
}

// Switch between Table and Grid view
function setView(view) {
  state.currentView = view;
  if (view === 'table') {
    elements.tableViewBtn.classList.add('active');
    elements.gridViewBtn.classList.remove('active');
  } else {
    elements.gridViewBtn.classList.add('active');
    elements.tableViewBtn.classList.remove('active');
  }
  renderCurrentData();
}

// Open Detail Modal
function openDetailModal(ps) {
  elements.modalRank.textContent = `Rank #${ps.rank}`;
  elements.modalPSNumber.textContent = ps.psNumber;
  elements.modalCategory.textContent = ps.category;
  elements.modalTitle.textContent = ps.title;
  elements.modalOrganization.textContent = ps.organization;
  elements.modalTheme.textContent = ps.theme;
  elements.modalDeadline.textContent = ps.deadline || '30 September 2026';
  
  if (ps.domainBucket) {
    elements.modalDomainBox.style.display = 'flex';
    elements.modalDomain.textContent = ps.domainBucket;
  } else {
    elements.modalDomainBox.style.display = 'none';
  }

  elements.modalDescription.textContent = ps.description || 'No detailed description text provided in the official listing.';

  // Submission Bar
  elements.modalSubmissionCount.textContent = ps.submittedCount;
  elements.modalMaxCapacity.textContent = ps.maxCapacity;
  const pct = Math.min(100, Math.round((ps.submittedCount / (ps.maxCapacity || 500)) * 100));
  elements.modalCapacityPercent.textContent = `${pct}%`;
  elements.modalProgressBar.style.width = `${pct}%`;

  let compLabel = 'Very Low Competition';
  let compBg = '#10b981';
  if (ps.submittedCount >= ps.maxCapacity) {
    compLabel = 'Capped (500/500 Maxed)';
    compBg = '#ef4444';
  } else if (ps.submittedCount < 100) {
    compLabel = 'Very Low Competition (Golden Chance)';
    compBg = '#10b981';
  } else if (ps.submittedCount < 250) {
    compLabel = 'Moderate Competition';
    compBg = '#38bdf8';
  } else {
    compLabel = 'High Competition';
    compBg = '#f59e0b';
  }
  elements.modalCompetition.textContent = compLabel;

  // External Links Grid
  elements.modalLinksGrid.innerHTML = '';
  if (ps.youtubeLink) {
    const a = document.createElement('a');
    a.href = ps.youtubeLink;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'modal-link-btn modal-link-yt';
    a.innerHTML = '<i class="fa-brands fa-youtube"></i> Watch Explanation Video';
    elements.modalLinksGrid.appendChild(a);
  }

  if (ps.datasetLink) {
    const a = document.createElement('a');
    a.href = ps.datasetLink;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'modal-link-btn modal-link-data';
    a.innerHTML = '<i class="fa-solid fa-database"></i> Download Dataset / Resource';
    elements.modalLinksGrid.appendChild(a);
  }

  const sihLink = document.createElement('a');
  sihLink.href = 'https://sih.gov.in/sih2026PS';
  sihLink.target = '_blank';
  sihLink.className = 'modal-link-btn btn-outline';
  sihLink.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Open Official SIH Page';
  elements.modalLinksGrid.appendChild(sihLink);

  // Copy button
  elements.modalCopyPsBtn.onclick = () => window.copyToClipboard(ps.psNumber);

  // Star button in modal
  const isStarred = state.starred.includes(ps.psNumber);
  elements.modalStarBtn.innerHTML = isStarred ? '<i class="fa-solid fa-star text-amber"></i> Starred' : '<i class="fa-regular fa-star"></i> Star / Shortlist';
  elements.modalStarBtn.onclick = () => {
    window.toggleStar(ps.psNumber);
    const updatedStarred = state.starred.includes(ps.psNumber);
    elements.modalStarBtn.innerHTML = updatedStarred ? '<i class="fa-solid fa-star text-amber"></i> Starred' : '<i class="fa-regular fa-star"></i> Star / Shortlist';
  };

  elements.detailModal.classList.add('active');
}

function closeModal() {
  elements.detailModal.classList.remove('active');
}

// Global window helpers for inline HTML event handlers
window.openDetailByPs = function(psNumber) {
  const ps = state.allData.find(p => p.psNumber === psNumber);
  if (ps) openDetailModal(ps);
};

window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied "${text}" to clipboard!`, 'success');
  }).catch(() => {
    showToast(`Copied "${text}"`, 'info');
  });
};

window.toggleStar = function(psNumber) {
  const idx = state.starred.indexOf(psNumber);
  if (idx === -1) {
    state.starred.push(psNumber);
    showToast(`Added ${psNumber} to starred list!`, 'success');
  } else {
    state.starred.splice(idx, 1);
    showToast(`Removed ${psNumber} from starred list`, 'info');
  }
  saveStarred();
  updateShortlistBadges();
  renderCurrentData();
  renderShortlistDrawer();
};

function saveStarred() {
  localStorage.setItem('sih_starred_ps', JSON.stringify(state.starred));
}

function updateShortlistBadges() {
  const count = state.starred.length;
  elements.shortlistCount.textContent = count;
  elements.drawerShortlistCount.textContent = count;
}

// Shortlist Drawer
function openShortlistDrawer() {
  renderShortlistDrawer();
  elements.shortlistDrawer.classList.add('active');
}

function closeShortlistDrawer() {
  elements.shortlistDrawer.classList.remove('active');
}

function renderShortlistDrawer() {
  elements.shortlistItemsContainer.innerHTML = '';
  const starredItems = state.allData.filter(p => state.starred.includes(p.psNumber));

  if (starredItems.length === 0) {
    elements.shortlistItemsContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i class="fa-regular fa-star" style="font-size: 2.5rem; margin-bottom: 12px; display: block;"></i>
        <p>No problem statements starred yet.</p>
        <p style="font-size: 0.8rem; margin-top: 6px;">Click the star icon on any problem statement to shortlist it for your team.</p>
      </div>
    `;
    return;
  }

  starredItems.forEach(p => {
    const item = document.createElement('div');
    item.className = 'drawer-item';
    item.innerHTML = `
      <div class="drawer-item-header">
        <span class="ps-code" onclick="window.copyToClipboard('${p.psNumber}')">${p.psNumber} (Rank #${p.rank})</span>
        <button class="copy-mini-btn" style="color: var(--gold);" onclick="window.toggleStar('${p.psNumber}')" title="Remove star">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
      <div class="drawer-item-title" onclick="window.openDetailByPs('${p.psNumber}')" style="cursor: pointer;">
        ${escapeHtml(p.title)}
      </div>
      <div class="drawer-item-footer">
        <span><strong>${p.submittedCount}</strong> / ${p.maxCapacity} ideas</span>
        <span>${escapeHtml(p.organization)}</span>
      </div>
    `;
    elements.shortlistItemsContainer.appendChild(item);
  });
}

function exportStarredCsv() {
  const starredItems = state.allData.filter(p => state.starred.includes(p.psNumber));
  if (starredItems.length === 0) {
    showToast('No problem statements in shortlist to export.', 'warning');
    return;
  }

  const headers = ['Rank', 'PS Number', 'Submitted Ideas', 'Max Capacity', 'Organization', 'Category', 'Theme', 'Title'];
  const rows = [headers.join(',')];
  starredItems.forEach(p => {
    rows.push([
      p.rank,
      `"${p.psNumber}"`,
      p.submittedCount,
      p.maxCapacity,
      `"${p.organization.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.theme.replace(/"/g, '""')}"`,
      `"${p.title.replace(/"/g, '""')}"`
    ].join(','));
  });

  const blob = new Blob([rows.join('\r\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sih2026_team_shortlist_${Date.now()}.csv`;
  a.click();
  showToast('Exported team shortlist to CSV!', 'success');
}

// Reset All Filters
window.resetAllFilters = function() {
  state.search = '';
  state.theme = 'all';
  state.organization = 'all';
  state.competition = 'all';
  state.sortBy = 'submittedCount';
  state.sortOrder = 'asc';
  state.quickFilter = null;

  elements.searchInput.value = '';
  elements.clearSearchBtn.style.display = 'none';
  elements.themeSelect.value = 'all';
  elements.orgSelect.value = 'all';
  elements.competitionSelect.value = 'all';
  elements.sortSelect.value = 'submittedCount-asc';
  elements.quickTags.forEach(t => t.classList.remove('active'));

  renderCurrentData();
  showToast('Filters reset to default (Rank #1 Least Submitted)');
};

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';

  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-circle-check text-emerald';
  if (type === 'error') icon = 'fa-circle-exclamation text-rose';
  if (type === 'warning') icon = 'fa-triangle-exclamation text-amber';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
