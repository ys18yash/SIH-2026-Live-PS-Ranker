const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('sih_page.html', 'utf8');
const $ = cheerio.load(html);

const problemStatements = [];

// The main table is #dataTablePS
$('#dataTablePS tbody tr').each((i, el) => {
  const tr = $(el);
  const tds = tr.find('> td');
  
  if (tds.length < 7) {
    return; // skip if nested or empty
  }

  const sno = $(tds[0]).text().trim();
  const organization = $(tds[1]).text().trim();
  
  // The 3rd column has problem statement title and modal
  const titleTd = $(tds[2]);
  const titleLink = titleTd.find('a').first();
  const title = titleLink.text().trim() || titleTd.text().trim();
  
  // Extract modal info
  const modal = titleTd.find('.modal');
  let description = '';
  let youtubeLink = '';
  let datasetLink = '';
  let contact = '';
  
  if (modal.length > 0) {
    modal.find('tr').each((mi, mtr) => {
      const th = $(mtr).find('th').text().trim();
      const td = $(mtr).find('td').text().trim();
      if (th.includes('Description')) {
        description = td;
      } else if (th.includes('YouTube') || th.includes('Video')) {
        const link = $(mtr).find('td a').attr('href') || td;
        youtubeLink = link;
      } else if (th.includes('Dataset') || th.includes('Data')) {
        const link = $(mtr).find('td a').attr('href') || td;
        datasetLink = link;
      }
    });
  }

  const category = $(tds[3]).text().trim();
  const psNumber = $(tds[4]).text().trim();
  const submittedIdeasCountText = $(tds[5]).text().trim();
  const submittedIdeasCount = parseInt(submittedIdeasCountText.replace(/[^0-9]/g, ''), 10) || 0;
  const theme = $(tds[6]).text().trim();
  const deadline = tds.length > 7 ? $(tds[7]).text().trim() : '';

  problemStatements.push({
    sno,
    psNumber,
    title,
    organization,
    category,
    submittedIdeasCount,
    theme,
    deadline,
    description,
    youtubeLink,
    datasetLink
  });
});

console.log(`Total problem statements found: ${problemStatements.length}`);
const softwarePS = problemStatements.filter(p => p.category.toLowerCase().includes('software'));
console.log(`Software problem statements count: ${softwarePS.length}`);
console.log(`Hardware problem statements count: ${problemStatements.filter(p => p.category.toLowerCase().includes('hardware')).length}`);

// Sort by submittedIdeasCount ascending
softwarePS.sort((a, b) => a.submittedIdeasCount - b.submittedIdeasCount);

console.log('\nTop 5 Software Problem Statements with LEAST submissions:');
softwarePS.slice(0, 5).forEach((p, idx) => {
  console.log(`#${idx + 1} [Rank ${idx + 1}] | PS: ${p.psNumber} | Submissions: ${p.submittedIdeasCount} | Org: ${p.organization} | Title: ${p.title}`);
});

console.log('\nBottom 5 Software Problem Statements with MOST submissions:');
softwarePS.slice(-5).forEach((p, idx) => {
  console.log(`#${softwarePS.length - 5 + idx + 1} | PS: ${p.psNumber} | Submissions: ${p.submittedIdeasCount} | Org: ${p.organization} | Title: ${p.title}`);
});
