const { createClient } = require('@sanity/client'); // Denne linjen manglet eller ble overskrevet
const { toHTML } = require('@portabletext/to-html');
const fs = require('fs');
const path = require('path');

const client = createClient({
  projectId: '1lzskaub',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-01',
});

// Vi beholder denne for Frontmatter-felt som tittel, 
// men bruker toHTML for selve innholdet.
function blocksToText(blocks) {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks
    .map(block => {
      if (block._type !== 'block' || !block.children) return '';
      return block.children.map(child => child.text).join('');
    })
    .join(' ');
}

async function run() {
  console.log('--- Starter henting fra Sanity ---');

  try {
    const data = await client.fetch(`{
      "oppsett": *[_type == "siteSettings"][0],
      "biler": *[_type == "car"] { 
        ..., 
        "mainImageUrl": mainImage.asset->url,
        fuel,
        gear,
        drive,
        range,
        capacity,
        performance,
        doors,
        seats,
        yearmodel,
        color,
        interest,
        towbar,
        equipment,
        description
      },
      "kategorier": *[_type == "categoryPage"] {
        title,
        "slug": slug.current,
        description,
        body
      },
      "omtaler": *[_type == "review"] | order(date desc) {
        ...
      },
      "alle_poster": *[_type == "post"] {
        ...,
        "kategoriNavn": category,
        "bildeUrl": mainImage.asset->url,
        excerpt // Hente meta description
      }
    }`);

    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

    // --- 1. OMTALER ---
    let omtalerFinal = data.omtaler || [];
    const csvPath = path.join(dataDir, 'omtaler.csv');

    if (fs.existsSync(csvPath)) {
      const csvData = fs.readFileSync(csvPath, 'utf8');
      const lines = csvData.split('\n').filter(line => line.trim() !== '');
      const headers = lines[0].split(',');
      const nameIdx = headers.indexOf('name');
      const answerIdx = headers.indexOf('answer');

      if (nameIdx !== -1 && answerIdx !== -1) {
        const csvMap = {};
        lines.slice(1).forEach(line => {
          const cols = line.split(',');
          if (cols[nameIdx] && cols[answerIdx]) {
            csvMap[cols[nameIdx].trim()] = cols[answerIdx].trim();
          }
        });

        omtalerFinal = omtalerFinal.map(omtale => {
          if (!omtale.answer || omtale.answer === null) {
            const fallbackAnswer = csvMap[omtale.author];
            if (fallbackAnswer) return { ...omtale, answer: fallbackAnswer };
          }
          return omtale;
        });
      }
    }

    omtalerFinal.sort((a, b) => new Date(b.date) - new Date(a.date));
    fs.writeFileSync(path.join(dataDir, 'reviews.json'), JSON.stringify(omtalerFinal, null, 2));
    console.log(`✅ Sortert og lagret ${omtalerFinal.length} omtaler.`);
    
    // --- 2. ARTIKLER / BLOGG ---
    const postBaseDir = path.join(__dirname, 'content', 'post');
    if (fs.existsSync(postBaseDir)) {
        console.log('Sweep: Rydder gamle artikler...');
        fs.rmSync(postBaseDir, { recursive: true, force: true });
    }
    fs.mkdirSync(postBaseDir, { recursive: true });

    const artiklerFiltered = (data.alle_poster || []).filter(p => {
      const cat = (p.kategoriNavn || "").toLowerCase();
      return cat !== 'employee' && cat !== 'ansatt';
    });

    // --- 3. ARTIKLER (Nyheter, FAQ, osv) ---
    artiklerFiltered.forEach(post => {
      const rawCategory = post.kategoriNavn || 'Generelt';
      const catSlug = rawCategory.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const postDir = path.join(postBaseDir, catSlug);
      
      if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });

      const indexFile = path.join(postDir, '_index.md');
      if (!fs.existsSync(indexFile)) {
          fs.writeFileSync(indexFile, `---\ntitle: "${rawCategory}"\nlayout: "list"\n---`);
      }

      const slug = post.slug?.current || post.title.toLowerCase().replace(/\s+/g, '-');
      const bodyHtml = toHTML(post.body || []);
      
      const content = `---
title: "${(post.title || '').replace(/"/g, '\\"')}"
excerpt: "${(post.excerpt || '').replace(/"/g, '\\"').replace(/\n/g, ' ')}"
date: "${post.publishedAt || new Date().toISOString()}"
kategori: "${rawCategory.toLowerCase()}"
bildeUrl: "${post.bildeUrl || ''}"
bodyHtml: "${bodyHtml.replace(/"/g, '\\"').replace(/\n/g, '')}"
layout: "body"
---`; 
// Vi lar det være tomt her nede nå

      fs.writeFileSync(path.join(postDir, `${slug}.md`), content);
    });

    console.log(`✅ Lagret ${artiklerFiltered.length} artikler i kategoriserte mapper.`);

    // --- 4. ANSATTE ---
    const ansatte = (data.alle_poster || []).filter(p => {
      const cat = (p.kategoriNavn || "").toLowerCase();
      const title = (p.title || "").toLowerCase();
      return cat === 'employee' || cat === 'ansatt' || title.includes('jørgen') || title.includes('mattias') || title.includes('kenneth');
    });

    const ansatteDir = path.join(__dirname, 'content', 'ansatte');
    if (!fs.existsSync(ansatteDir)) fs.mkdirSync(ansatteDir, { recursive: true });
    
    ansatte.forEach(person => {
      const slug = person.slug?.current || person.title.toLowerCase().replace(/\s+/g, '-');
      const content = `---
title: "${person.title}"
position: "${person.campaignlink || 'Rådgiver'}"
image: "${person.bildeUrl || ''}"
layout: "single"
---
${blocksToText(person.body)}`;
      fs.writeFileSync(path.join(ansatteDir, `${slug}.md`), content);
    });
    fs.writeFileSync(path.join(dataDir, 'employees.json'), JSON.stringify(ansatte, null, 2));

// --- 5. BILER (Salgsobjekter) ---
console.log('Sweep: Bygger /biler/ mappen med korrekt menystruktur...');
const bilerBaseDir = path.join(__dirname, 'content', 'biler');

if (fs.existsSync(bilerBaseDir)) {
    fs.rmSync(bilerBaseDir, { recursive: true, force: true });
}
fs.mkdirSync(bilerBaseDir, { recursive: true });

// Hovedsiden for biler
fs.writeFileSync(path.join(bilerBaseDir, '_index.md'), `---
title: "Våre biler"
layout: "list"
url: "/biler/"
---`);

data.biler.forEach(car => {
  if (!car.brand) return;

  const brandSlug = car.brand.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, '-');
  const brandDir = path.join(bilerBaseDir, brandSlug);

  if (!fs.existsSync(brandDir)) {
      fs.mkdirSync(brandDir, { recursive: true });
      
      // Finn SEO-dokumentet som matcher denne bilens merke (brandSlug)
      const seoData = data.kategorier.find(kat => kat.slug === brandSlug);

      // Definer titler og beskrivelser. Bruker data fra Sanity hvis de finnes, ellers fallback.
      const finalTitle = seoData?.title || `Varebil leasing av ${car.brand}`;
      const finalMeta = seoData?.description || `Finn gode tilbud på leasing av ${car.brand} varebil hos Automedia.`;
      
      // Konverter Portable Text (body) til HTML
      const finalBody = seoData?.body ? toHTML(seoData.body) : "";

      fs.writeFileSync(path.join(brandDir, '_index.md'), `---
title: "${finalTitle.replace(/"/g, '\\"')}"
metadescription: "${finalMeta.replace(/"/g, '\\"')}"
layout: "list"
url: "/biler/${brandSlug}/"
menu:
  main:
    name: "${car.brand}"
    parent: "Biler"
---
${finalBody}`);
  }

  const carSlug = car.slug?.current || `bil-${Math.random().toString(36).substr(2, 5)}`;
  const equipmentHtml = toHTML(car.equipment || []);
  const descriptionHtml = toHTML(car.description || []);

  const content = `---
title: "${(car.title || '').replace(/"/g, '')}"
slug: "${String(car.slug || car.title || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}"
modeldescription: "${(car.modeldescription || '').replace(/"/g, '')}"
mainImageUrl: "${car.mainImageUrl ? car.mainImageUrl.replace(/\\/g, '') + '?fm=webp&q=80' : ''}"
descriptionHtml: "${descriptionHtml.replace(/"/g, "'").replace(/\n/g, ' ')}"
equipment: "${equipmentHtml.replace(/"/g, "'").replace(/\n/g, ' ')}"
price0: "${car.price0 || '0'}"
fuel: "${car.fuel || ''}"
gear: "${car.gear || ''}"
drive: "${car.drive || ''}"
range: "${car.range || ''}"
capacity: "${car.capacity || ''}"
performance: "${car.performance || ''}"
doors: "${car.doors || ''}"
seats: "${car.seats || ''}"
yearmodel: "${car.yearmodel || ''}"
color: "${car.color || ''}"
interest: "${car.interest || ''}"
towbar: ${car.towbar || false}
layout: "single"
---`;

  fs.writeFileSync(path.join(brandDir, `${carSlug}.md`), content);
});

console.log(`✅ Lagret ${data.biler.length} biler i /biler/[merke]/.`);


    // --- 7. TJENESTER ---
    const servicesDir = path.join(__dirname, 'content', 'tjenester');
    if (!fs.existsSync(servicesDir)) fs.mkdirSync(servicesDir, { recursive: true });

    // Lag en _index.md for samlesiden /tjenester/
    const servicesIndex = path.join(servicesDir, '_index.md');
    if (!fs.existsSync(servicesIndex)) {
      fs.writeFileSync(servicesIndex, `---\ntitle: "Våre Tjenester"\nlayout: "list"\n---`);
    }

    // Hent tjenester fra data-objektet (Sørg for at "tjenester": *[_type == "service"] er med i fetch-spørringen din øverst)
    const tjenester = await client.fetch(`*[_type == "service"] {
      ...,
      "image": image.asset->url
    }`);

    tjenester.forEach(service => {
      const slug = service.slug?.current || service.title.toLowerCase().replace(/\s+/g, '-');
      
      // Vi konverterer body (Portable Text) til HTML
      const bodyHtml = toHTML(service.body || []);
      const leadHtml = (service.lead || '').replace(/\n/g, '<br>'); // Bevarer linjeskift fra lead som HTML
      
      // Velg hvilken kilde som skal brukes (body prioriteres)
      const finalHtml = bodyHtml || leadHtml;

      const content = `---
title: "${(service.title || '').replace(/"/g, '\\"')}"
image: "${service.image || ''}"
alt: "${(service.alt || '').replace(/"/g, '\\"')}"
email: "${service.email || ''}"
salesman: "${service.salesman || ''}"
metatitle: "${(service.metatitle || '').replace(/"/g, '\\"')}"
metadescription: "${(service.metadescription || '').replace(/"/g, '\\"')}"
bodyHtml: "${finalHtml.replace(/"/g, '\\"').replace(/\r?\n|\r/g, '')}"
layout: "single"
---`;

      fs.writeFileSync(path.join(servicesDir, `${slug}.md`), content);
    });

    console.log(`✅ Lagret ${tjenester.length} tjenester.`);

  } catch (error) {
    console.error('❌ Feil under kjøring:', error);
  }
}

run();