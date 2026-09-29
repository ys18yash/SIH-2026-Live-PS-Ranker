const fs = require('fs');
const html = fs.readFileSync('sih_page.html', 'utf8');

// Look for the main table
// Find table headers of the main table
const matches = html.match(/<table[^>]*class="[^"]*dataTable[^"]*"[^>]*>[\s\S]*?<\/thead>/i) 
  || html.match(/<table[^>]*>[\s\S]*?<\/thead>/i);

console.log('Main table header match:', matches ? matches[0] : 'None');

// Let's search for "Submitted Idea" in the raw html
const idx = html.indexOf('Submitted Idea');
if (idx !== -1) {
  console.log('Context around Submitted Idea:\n', html.substring(Math.max(0, idx - 400), Math.min(html.length, idx + 800)));
} else {
  console.log('Submitted Idea text not found directly');
}
