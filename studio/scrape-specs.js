// scrape-specs.js
//
// Henter tekniske spesifikasjoner fra motorbasen.no og auto-data.net
// og oppdaterer egenskaper-varebil.csv.
//
// Bruk:
//   Alle biler:         node scrape-specs.js
//   Bestemte rader:     node scrape-specs.js --rows 47,48,49,50
//   Fra rad til rad:    node scrape-specs.js --rows 47-50
//
// Forutsetninger: playwright installert i /studio-mappen
//   npm install playwright
//   npx playwright install chromium

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');


const CSV_PATH = path.join(__dirname, 'egenskaper-varebil.csv');

// ─── FELTMAPPING: CSV-kolonne → søkestreng på kildeside ───────────────────────
//
// Motorbasen bruker "Label: verdi" i tabellceller
// Auto-data bruker spørsmålsformulerte labels i tabellrader
//
const MOTORBASEN_MAP = {
  fuel:               'Drivstoff:',
  body:               'Karosseri:',
  drive:              'Hjuldrift:',
  doors:              'Dører:',
  seats:              'Seter:',
  performancehk:      'HK:',
  performancewatt:    'KiloWatt:',
  torque:             'Dreiemoment:',
  range:              'Rekkevidde:',
  grossbattery:       'Brutto batteri:',
  netbattery:         'Netto batteri:',
  chargingdc:         'Ladefart DC:',
  maxhomechargeac:    'Max hjemmelading (AC):',
  onephasehomechargeac: '1-fas hjemmelading (AC):',
  chargingspeed:      'Lading 0/10–80%:',
  powerusage:         'Strømforbruk:',
  batterywarranty:    'Batterigaranti:',
  numberofengines:    'Antall elmotorer:',
  cotwoemission:      'CO₂ utslipp:',
  gear:               'Girkasse:',
  numberofgears:      'Antall gir:',
  warranty:           'Garanti:',
  warrantypaint:      'Lakkgaranti:',
  warrantyrust:       'Rustgaranti:',
  allowedtotalweight: 'Totalvekt:',
  kerbweight:         'Egenvekt med fører:',
  kerbweightexdriver: 'Nyttelast uten fører:',
  payloadincdriver:   'Nyttelast med fører (75kg):',
  maxroofload:        'Taklast:',
  trailerwbreak:      'Henger med brems:',
  trailerwobreak:     'Henger uten brems:',
  maxbootcapacity:    'Bagasjerom max:',
  minbootcapacity:    'Bagasjerom min:',
  length:             'Lengde bil:',
  widthwomirrors:     'Bredde uten speil:',
  widthwmirrors:      'Bredde inkl speiler:',
  height:             'Høyde:',
  wheelbase:          'Akselavstand:',
  turningcircle:      'Snudiameter:',
};

const AUTODATA_MAP = {
  body:               ['Karosserityper'],
  doors:              ['Antall dører'],
  seats:              ['Antall seter'],
  fuel:               ['Type drivstoff'],
  performancehk:      ['Motoreffekt', 'Systemkraft'],
  performancewatt:    ['Systemkraft'],
  torque:             ['Dreiemoment'],
  kerbweight:         ['Vekt'],
  allowedtotalweight: ['Maksimalt tillatt vekt'],
  kerbweightexdriver: ['Maksimal lastekapasitet'],
  maxbootcapacity:    ['Minimalt volum av bagasjerommet'],
  maxroofload:        ['Tillatt taklast'],
  trailerwbreak:      ['Tillatt tilhengervekt ved 12% stigning'],
  trailerwobreak:     ['Tillatt tilhengervekt uten bremser'],
  length:             ['Lengde'],
  widthwomirrors:     ['Bredde'],
  widthwmirrors:      ['Bredde inkl. speil'],
  height:             ['Høyde'],
  wheelbase:          ['Akselavstand'],
  turningcircle:      ['Minimal snu diamenter'],
  cotwoemission:      ['CO2-utslipp (WLTP)', 'CO2-utslipp'],
  drive:              ['Hjultrekk'],
  gear:               ['Antall gir og type girkasse'],
  numberofgears:      ['Antall gir og type girkasse'],
  grossbattery:       ['Brutto batterikapasitet'],
  netbattery:         ['Netto (brukbar) batterikapasitet'],
  range:              ['Elektrisk rekkevidde (WLTP)'],
  powerusage:         ['Energiforbruk (WLTP)'],
};

// ─── CSV PARSING ───────────────────────────────────────────────────────────────

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  }).filter(Boolean);
  return { headers, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function serializeCSV(headers, rows) {
  const escape = val => {
    const s = String(val || '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.map(escape).join(',')];
  rows.forEach(row => {
    lines.push(headers.map(h => escape(row[h] || '')).join(','));
  });
  return lines.join('\n');
}

// ─── SCRAPING: MOTORBASEN ──────────────────────────────────────────────────────

async function scrapeMotorbasen(page, url) {
  console.log(`    Henter motorbasen: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Motorbasen bruker <p><strong>Label:</strong> verdi</p>
  const allPairs = await page.$$eval('p', ps =>
    ps.map(p => {
      const strong = p.querySelector('strong');
      if (!strong) return null;
      const label = strong.innerText.trim().replace(/:$/, '');
      const full = p.innerText.trim();
      const value = full.slice(strong.innerText.trim().length).replace(/^\s*:?\s*/, '').trim();
      return [label, value];
    }).filter(Boolean)
  );

  const result = {};
  for (const [field, label] of Object.entries(MOTORBASEN_MAP)) {
    const labelClean = label.replace(/:$/, '').trim().toLowerCase();
    for (const [pLabel, pValue] of allPairs) {
      if (pLabel.toLowerCase() === labelClean) {
        const val = cleanValue(field, pValue);
        if (val) result[field] = val;
        break;
      }
    }
  }
  return result;
}

// ─── SCRAPING: AUTO-DATA ───────────────────────────────────────────────────────

async function scrapeAutodata(page, url) {
  console.log(`    Henter auto-data: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // auto-data.net: data i table med class "cardetailsout car2"
  // Henter alle tr-rader fra alle tabeller på siden
  const allRows = await page.$$eval('tr', trs =>
    trs.map(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th'));
      if (cells.length < 2) return null;
      // Første celle = label (kan inneholde <a> eller <span>)
      const label = cells[0].innerText.trim();
      // Andre celle = verdi — ta første linje hvis det er flere
      const value = cells[1].innerText.trim().split('\n')[0].trim();
      return [label, value];
    }).filter(Boolean)
  );

  const result = {};
  for (const [field, labels] of Object.entries(AUTODATA_MAP)) {
    for (const [rowLabel, rowValue] of allRows) {
      const rowLower = rowLabel.toLowerCase();
      if (labels.some(l => rowLower === l.toLowerCase() || rowLower.startsWith(l.toLowerCase()))) {
        const val = cleanValue(field, rowValue);
        if (val) { result[field] = val; break; }
      }
    }
  }
  return result;
}

// ─── VALUE CLEANING ────────────────────────────────────────────────────────────

function cleanValue(field, raw) {
  if (!raw) return '';
  
  // Take only first line (auto-data often has multiple units on separate lines)
  let val = raw.split('\n')[0].trim();
  
  // Fields that should be numbers only
  const numericFields = [
    'doors','seats','performancehk','performancewatt','torque','range',
    'grossbattery','netbattery','chargingdc','numberofengines','numberofgears',
    'allowedtotalweight','kerbweight','kerbweightexdriver','payloadincdriver',
    'maxroofload','trailerwbreak','trailerwobreak','maxbootcapacity',
    'minbootcapacity','length','widthwomirrors','widthwmirrors','height','wheelbase',
  ];

  if (numericFields.includes(field)) {
    // Extract first number (handles "190 hk, 440 Hm" → "190")
    const match = val.match(/[\d.,]+/);
    if (match) {
      return match[0].replace(',', '.');
    }
    return '';
  }

  // turningcircle — keep decimal
  if (field === 'turningcircle') {
    const match = val.match(/[\d.,]+/);
    return match ? match[0].replace(',', '.') : '';
  }

  // cotwoemission — extract first number
  if (field === 'cotwoemission') {
    const match = val.match(/\d+/);
    return match ? match[0] : val;
  }

  // gear — extract type (Manuell/Automat/CVT) from "6 trinns, manuell girkasse"
  if (field === 'gear') {
    const lower = val.toLowerCase();
    if (lower.includes('automat') || lower.includes('automatic')) return 'Automat';
    if (lower.includes('manuell') || lower.includes('manual')) return 'Manuell';
    if (lower.includes('cvt')) return 'CVT';
    return val;
  }

  // numberofgears — extract first number from "6 trinns, manuell girkasse"
  if (field === 'numberofgears') {
    const match = val.match(/^(\d+)/);
    return match ? match[1] : '';
  }

  // drive — normalize to Norwegian short form
  if (field === 'drive') {
    const lower = val.toLowerCase();
    if (lower.includes('firehjul') || lower.includes('4matic') || lower.includes('4x4') || lower.includes('awd')) return 'AWD';
    if (lower.includes('bakhjul') || lower.includes('rear') || lower.includes('rwd')) return 'Bak';
    if (lower.includes('forhjul') || lower.includes('front') || lower.includes('fwd')) return 'Foran';
    return val;
  }

  // kerbweight — take first number from range "1809-2022 kg"
  if (field === 'kerbweight' || field === 'allowedtotalweight') {
    const match = val.match(/^([\d]+)/);
    return match ? match[1] : '';
  }

  // range — take first number from "404-432 km"
  if (field === 'range') {
    const match = val.match(/^([\d]+)/);
    return match ? match[1] : '';
  }

  // powerusage — keep "19,4 kWh/100 km" style
  if (field === 'powerusage') {
    return val.replace(/\s+/g, ' ');
  }

  // Text fields — return cleaned value
  return val.replace(/\s+/g, ' ').trim();
}

// ─── MERGE: motorbasen prioritert, auto-data fyller inn tomme ─────────────────

function mergeResults(existing, motorbasen, autodata) {
  const merged = { ...existing };
  
  // Apply motorbasen first (priority)
  for (const [field, val] of Object.entries(motorbasen)) {
    if (val) merged[field] = val;
  }
  
  // Apply auto-data only where motorbasen didn't provide a value
  for (const [field, val] of Object.entries(autodata)) {
    if (val && !motorbasen[field]) merged[field] = val;
  }
  
  return merged;
}

// ─── PARSE ROW ARGUMENT ───────────────────────────────────────────────────────

function parseRowArg(arg) {
  if (!arg) return null;
  const rangeMatch = arg.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  return arg.split(',').map(n => parseInt(n.trim()));
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  const rowArg = process.argv.find(a => a.startsWith('--rows=') || a === '--rows');
  const rowVal = rowArg?.includes('=') ? rowArg.split('=')[1] : process.argv[process.argv.indexOf('--rows') + 1];
  const targetRows = parseRowArg(rowVal);

  const { headers, rows } = parseCSV(CSV_PATH);
  console.log(`Leste ${rows.length} biler fra CSV.\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'nb-NO',
    extraHTTPHeaders: {
      'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7',
    }
  });
  const page = await context.newPage();

  let updatedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-indexed + header
    if (targetRows && !targetRows.includes(rowNum)) continue;

    const row = rows[i];
    if (!row.slug) continue;

    const motorbasenUrl = row.sourceslug?.trim();
    const autodataUrl = row.sourceslugad?.trim();

    if (!motorbasenUrl && !autodataUrl) {
      console.log(`Rad ${rowNum} (${row.brand} ${row.title}): ingen kilde-URL — hopper over`);
      continue;
    }

    console.log(`\nRad ${rowNum}: ${row.brand} ${row.title}`);

    let motorbasenData = {};
    let autodataData = {};

    try {
      if (motorbasenUrl) {
        motorbasenData = await scrapeMotorbasen(page, motorbasenUrl);
        console.log(`    motorbasen: ${Object.keys(motorbasenData).length} felt hentet`);
      }
    } catch (err) {
      console.log(`    motorbasen feil: ${err.message}`);
    }

    try {
      if (autodataUrl) {
        autodataData = await scrapeAutodata(page, autodataUrl);
        console.log(`    auto-data: ${Object.keys(autodataData).length} felt hentet`);
      }
    } catch (err) {
      console.log(`    auto-data feil: ${err.message}`);
    }

    const updated = mergeResults(row, motorbasenData, autodataData);
    
    // Show what changed
    const changes = [];
    for (const [field, newVal] of Object.entries(updated)) {
      if (newVal !== row[field] && newVal) {
        changes.push(`${field}: "${row[field] || '(tom)'}" → "${newVal}"`);
      }
    }
    if (changes.length > 0) {
      console.log(`    Endringer (${changes.length}):`);
      changes.forEach(c => console.log(`      ${c}`));
    } else {
      console.log(`    Ingen nye verdier funnet`);
    }

    rows[i] = updated;
    updatedCount++;

    // Pause 30 sekunder mellom hver bil for å unngå blokkering
    const isLast = (targetRows ? targetRows[targetRows.length - 1] === rowNum : i === rows.length - 1);
    if (!isLast) {
      console.log(`    Venter 30 sekunder før neste bil...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  await browser.close();

  // Save updated CSV
  const updatedCSV = serializeCSV(headers, rows);
  fs.writeFileSync(CSV_PATH, updatedCSV, 'utf8');
  console.log(`\n✅ Ferdig! Oppdaterte ${updatedCount} biler. CSV lagret.`);
}

main().catch(err => {
  console.error('Kritisk feil:', err);
  process.exit(1);
});
