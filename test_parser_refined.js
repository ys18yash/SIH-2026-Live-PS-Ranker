const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('sih_page.html', 'utf8');
const $ = cheerio.load(html);

const rows = $('#dataTablePS > tbody > tr');
console.log('Top level rows count:', rows.length);

const items = [];
rows.each((i, el) => {
  const tds = $(el).children('td');
  if (tds.length < 6) return;

  const sno = $(tds[0]).text().trim();
  const organization = $(tds[1]).text().trim();
  
  const titleTd = $(tds[2]);
  const title = titleTd.find('a').first().text().trim() || titleTd.clone().children().remove().end().text().trim();
  
  // Extract all details from modal inside titleTd
  const modal = titleTd.find('.modal');
  let description = '';
  let youtubeLink = '';
  let datasetLink = '';
  let contact = '';
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
        youtubeLink = link;
      } else if (th.includes('dataset') || th.includes('data')) {
        const link = $(mtr).find('td a').attr('href') || td;
        datasetLink = link;
      } else if (th.includes('domain') || th.includes('bucket')) {
        domainBucket = td;
      } else if (th.includes('problem statement id') || th.includes('ps id')) {
        psIdModal = td;
      }
    });
  }

  const category = $(tds[3]).text().trim();
  const psNumber = $(tds[4]).text().trim();
  const submittedIdeasRaw = $(tds[5]).text().trim(); // e.g. "46/500" or "500/500" or "0"
  
  // Parse submitted idea count and max capacity if present
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
    psNumber: psNumber || psIdModal,
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

console.log('Parsed items:', items.length);
const software = items.filter(x => x.category.toLowerCase().includes('software'));
console.log('Software items count:', software.length);

// Sort ascending by submittedCount
software.sort((a, b) => a.submittedCount - b.submittedCount);

console.log('\n--- TOP 10 LEAST SUBMISSIONS (Lowest Competition) ---');
software.slice(0, 10).forEach((x, idx) => {
  console.log(`#${idx + 1} | [${x.submittedCount}/${x.maxCapacity}] | PS: ${x.psNumber} | Theme: ${x.theme} | Org: ${x.organization}`);
  console.log(`     Title: ${x.title}`);
});

console.log('\n--- BOTTOM 5 MOST SUBMISSIONS (Highest Competition) ---');
software.slice(-5).forEach((x, idx) => {
  console.log(`#${software.length - 5 + idx + 1} | [${x.submittedCount}/${x.maxCapacity}] | PS: ${x.psNumber} | Theme: ${x.theme} | Org: ${x.organization}`);
  console.log(`     Title: ${x.title}`);
});
