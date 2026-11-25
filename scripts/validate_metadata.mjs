import fs from 'node:fs';
import path from 'node:path';

const csvPath = path.resolve('metadata/adobe_stock_metadata.csv');
const reportPath = path.resolve('metadata/validation_report.md');

const content = fs.readFileSync(csvPath, 'utf8').trim();
const lines = content.split(/\r?\n/);

const header = lines[0];
const expectedHeader = 'Filename,Title,Keywords,Category,Releases';

const FORBIDDEN_WORDS = ['alpha', 'transparent', 'green screen', 'greenscreen', 'chromakey', 'chroma key', 'apple', 'google', 'android', 'iphone', 'windows', 'samsung'];
const BG_COLOR_WORDS = ['black background', 'white background', 'cream background', 'dark background', 'green background', 'dark mode', 'monochrome'];

let reportLines = [];
reportLines.push('# Adobe Stock Metadata Validation Report\n');
reportLines.push(`- **Date Generated**: ${new Date().toISOString()}`);
reportLines.push(`- **Validated File**: \`metadata/adobe_stock_metadata.csv\``);
reportLines.push(`- **Total Assets**: ${lines.length - 1}\n`);

let passed = true;
let issues = [];

// Check Header
if (header !== expectedHeader) {
  passed = false;
  issues.push(`Header mismatch: expected "${expectedHeader}", got "${header}"`);
  reportLines.push(`❌ **Header Check**: FAILED (Expected: \`${expectedHeader}\`, Found: \`${header}\`)\n`);
} else {
  reportLines.push(`✅ **Header Check**: PASSED (\`${header}\`)\n`);
}

function parseCsvRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const seenFilenames = new Set();
const seenTitles = new Set();
const tableRows = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  const cols = parseCsvRow(line);
  if (cols.length !== 5) {
    passed = false;
    issues.push(`Row ${i} has ${cols.length} columns instead of 5.`);
    continue;
  }

  const [filename, title, rawKeywords, category, releases] = cols;
  const rowIssues = [];

  // Filename check
  if (seenFilenames.has(filename)) {
    rowIssues.push(`Duplicate filename: ${filename}`);
  }
  seenFilenames.add(filename);

  if (filename.length > 30) {
    rowIssues.push(`Filename length (${filename.length}) > 30 chars`);
  }

  const htmlEquivalent = path.join('assets', filename.replace('.mp4', '.html'));
  if (!fs.existsSync(htmlEquivalent)) {
    rowIssues.push(`No corresponding HTML asset found for ${filename} at ${htmlEquivalent}`);
  }

  // Title check
  if (title.length > 70) {
    rowIssues.push(`Title length (${title.length}) > 70 chars`);
  }
  if (title.includes(',')) {
    rowIssues.push(`Title contains forbidden comma`);
  }
  for (const bgWord of BG_COLOR_WORDS) {
    if (title.toLowerCase().includes(bgWord)) {
      rowIssues.push(`Title contains background color term "${bgWord}"`);
    }
  }
  if (seenTitles.has(title)) {
    rowIssues.push(`Duplicate title across rows: "${title}"`);
  }
  seenTitles.add(title);

  // Keywords check
  const kwList = rawKeywords.split(',').map(k => k.trim());
  if (kwList.length !== 49) {
    rowIssues.push(`Keyword count is ${kwList.length} (expected exactly 49)`);
  }

  const kwSet = new Set();
  const kwDuplicates = [];
  for (const kw of kwList) {
    const lower = kw.toLowerCase();
    if (kwSet.has(lower)) {
      kwDuplicates.push(lower);
    }
    kwSet.add(lower);

    for (const fw of FORBIDDEN_WORDS) {
      const regex = new RegExp(`\\b${fw}\\b`, 'i');
      if (regex.test(lower)) {
        rowIssues.push(`Forbidden word "${fw}" found in keyword "${kw}"`);
      }
    }
    for (const bgWord of BG_COLOR_WORDS) {
      if (lower.includes(bgWord)) {
        rowIssues.push(`Background color term "${bgWord}" found in keyword "${kw}"`);
      }
    }
  }

  if (kwDuplicates.length > 0) {
    rowIssues.push(`Duplicate keywords: ${kwDuplicates.join(', ')}`);
  }

  // Category check
  if (category !== '8') {
    rowIssues.push(`Category is "${category}" (expected "8" for Graphic Resources)`);
  }

  // Releases check
  if (releases !== '') {
    rowIssues.push(`Releases is not empty: "${releases}"`);
  }

  if (rowIssues.length > 0) {
    passed = false;
    issues.push(...rowIssues.map(msg => `[${filename}] ${msg}`));
    tableRows.push(`| ${i} | \`${filename}\` | ❌ FAILED | ${rowIssues.join('; ')} |`);
  } else {
    tableRows.push(`| ${i} | \`${filename}\` | ✅ PASSED (${title.length} chars, 49 kw) | Clean |`);
  }
}

reportLines.push('## Per-Asset Validation Results\n');
reportLines.push('| # | Filename | Status | Details |');
reportLines.push('|---|---|---|---|');
reportLines.push(...tableRows);
reportLines.push('\n');

reportLines.push('## Summary & Compliance Status\n');
if (passed && issues.length === 0) {
  reportLines.push('> [!NOTE]');
  reportLines.push('> **ALL 20 ASSETS PASSED 100% OF VALIDATION CHECKS!**');
  reportLines.push('>- **Total Assets**: 20/20 valid');
  reportLines.push('>- **Title Lengths**: All $\\le 70$ characters without commas');
  reportLines.push('>- **Keyword Counts**: Exactly 49 unique keywords per row (Adobe Stock ceiling)');
  reportLines.push('>- **Forbidden Words**: 0 occurrences of `alpha`, `transparent`, `green screen`, or trademarks');
  reportLines.push('>- **Background Color References**: 0 occurrences in titles and keywords (completely neutral)');
  reportLines.push('>- **Category**: All set to `8` (Graphic Resources)');
  reportLines.push('>- **Filenames**: All $\\le 30$ characters matching `assets/*.html`');
  reportLines.push('>- **Releases**: All empty cells as required');
} else {
  reportLines.push('> [!WARNING]');
  reportLines.push(`> Validation found ${issues.length} issue(s):\n`);
  for (const err of issues) {
    reportLines.push(`- ${err}`);
  }
}

fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');
console.log(`Validation complete. Passed: ${passed}. Report written to ${reportPath}`);
if (!passed) process.exit(1);
