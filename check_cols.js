const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('sih_page.html', 'utf8');
const $ = cheerio.load(html);

$('#dataTablePS tbody tr').slice(0, 5).each((i, el) => {
  const tds = $(el).find('> td');
  console.log(`\n--- ROW ${i + 1} ---`);
  tds.each((j, td) => {
    console.log(`Col ${j}: ${$(td).text().trim().replace(/\s+/g, ' ').substring(0, 80)}`);
  });
});
