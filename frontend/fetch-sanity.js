const { createClient } = require('@sanity/client');
const { toHTML } = require('@portabletext/to-html');
const fs = require('fs');
const path = require('path');

const client = createClient({
  projectId: '1lzskaub',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-01',
});

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
        "galleryUrls": gallery[].asset->url,
        fuel,
        body,
        drive,
        gear,
        numberofgears,
        doors,
        seats,
        lversion,
        performancehk,
        performancewatt,
        torque,
        numberofengines,
        cotwoemission,
        range,
        grossbattery,
        netbattery,
        chargingdc,
        maxhomechargeac,
        onephasehomechargeac,
        chargingspeed,
        powerusage,
        warranty,
        batterywarranty,
        warrantypaint,
        warrantyrust,
        allowedtotalweight,
        kerbweight,
        kerbweightexdriver,
        payloadincdriver,
        maxroofload,
        trailerwbreak,
        trailerwobreak,
        maxbootcapacity,
        minbootcapacity,
        length,
        widthwomirrors,
        widthwmirrors,
        height,
        wheelbase,
        turningcircle,
        yearmodel,
        color,
        interior,
        interest,
        towbar,
        equipment,
        description,
        pricezero,
        pricesixty,
        pricehundred,
        priceadszero,
        quote,
        shopimage,
        alttext,
        mainimages,
        shortterm,
        pricecomment,
        salesman,
        availability,
        consultant,
        sourceslug,
        sourceslugad,
        chosepage,
        shop,
        frontpage,
        campaign,
        fastdelivery,
        metatitle,
        metadescription,
        opengraphtitle,
        opengraphdescription
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
        excerpt
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

    // --- 5. BILER ---
    console.log('Sweep: Bygger /biler/ mappen med korrekt menystruktur...');
    const bilerBaseDir = path.join(__dirname, 'content', 'biler');

    if (fs.existsSync(bilerBaseDir)) {
        fs.rmSync(bilerBaseDir, { recursive: true, force: true });
    }
    fs.mkdirSync(bilerBaseDir, { recursive: true });

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
          
          const seoData = data.kategorier.find(kat => kat.slug === brandSlug);
          const finalTitle = seoData?.title || `Varebil leasing av ${car.brand}`;
          const finalMeta = seoData?.description || `Finn gode tilbud på leasing av ${car.brand} varebil hos Automedia.`;
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

      const brandValue = car.brand?.title || car.brand?.name || car.brand || '';
      const cleanBrand = String(brandValue).replace(/"/g, '');
      const cleanSlug = String(carSlug).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      const galleryYaml = car.galleryUrls && car.galleryUrls.length > 0 
        ? '\n' + car.galleryUrls.map(url => `  - "${url.replace(/\\/g, '')}?fm=webp&q=80"`).join('\n')
        : ' []';

      // Hjelpefunksjoner — skriver kun feltet hvis verdien ikke er tom
      const f = (key, val) => {
        const v = (val === null || val === undefined) ? '' : String(val).trim().replace(/\r?\n|\r/g, ' ');
        return v ? `${key}: "${v.replace(/"/g, "'")}"\n` : '';
      };
      const fNum = (key, val) => {
        const v = (val === null || val === undefined) ? '' : String(val).trim().replace(/\r?\n|\r/g, ' ');
        return (v && v !== '0') ? `${key}: "${v}"\n` : '';
      };
      const fBool = (key, val) => val ? `${key}: true\n` : '';

      const fields = [
        `title: "${(car.title || '').replace(/"/g, '')}"`,
        `brand: "${cleanBrand}"`,
        `slug: "${cleanSlug}"`,
        `layout: "single"`,
        car.mainImageUrl ? `mainimages: "${car.mainImageUrl.replace(/\\/g, '')}?fm=webp&q=80"` : '',
        car.shopimage    ? `shopimage: "${car.shopimage}"` : '',
        galleryYaml !== ' []' ? `gallery: ${galleryYaml}` : '',
        f('modeldescription', car.modeldescription),
        f('alttext', car.alttext),
        fNum('pricezero', car.pricezero),
        fNum('pricesixty', car.pricesixty),
        fNum('pricehundred', car.pricehundred),
        fNum('priceadszero', car.priceadszero),
        f('interest', car.interest),
        f('quote', car.quote),
        f('fuel', car.fuel),
        f('body', car.body),
        f('drive', car.drive),
        f('gear', car.gear),
        f('lversion', car.lversion),
        fNum('numberofgears', car.numberofgears),
        fNum('doors', car.doors),
        fNum('seats', car.seats),
        fNum('performancehk', car.performancehk),
        fNum('performancewatt', car.performancewatt),
        fNum('torque', car.torque),
        fNum('numberofengines', car.numberofengines),
        f('cotwoemission', car.cotwoemission),
        fNum('range', car.range),
        fNum('grossbattery', car.grossbattery),
        fNum('netbattery', car.netbattery),
        fNum('chargingdc', car.chargingdc),
        f('maxhomechargeac', car.maxhomechargeac),
        f('onephasehomechargeac', car.onephasehomechargeac),
        f('chargingspeed', car.chargingspeed),
        f('powerusage', car.powerusage),
        f('warranty', car.warranty),
        f('batterywarranty', car.batterywarranty),
        f('warrantypaint', car.warrantypaint),
        f('warrantyrust', car.warrantyrust),
        fNum('allowedtotalweight', car.allowedtotalweight),
        fNum('kerbweight', car.kerbweight),
        fNum('kerbweightexdriver', car.kerbweightexdriver),
        fNum('payloadincdriver', car.payloadincdriver),
        fNum('maxroofload', car.maxroofload),
        fNum('trailerwbreak', car.trailerwbreak),
        fNum('trailerwobreak', car.trailerwobreak),
        fNum('maxbootcapacity', car.maxbootcapacity),
        fNum('minbootcapacity', car.minbootcapacity),
        fNum('length', car.length),
        fNum('widthwomirrors', car.widthwomirrors),
        fNum('widthwmirrors', car.widthwmirrors),
        fNum('height', car.height),
        fNum('wheelbase', car.wheelbase),
        f('turningcircle', car.turningcircle),
        f('yearmodel', car.yearmodel),
        f('color', car.color),
        f('interior', car.interior),
        fBool('towbar', car.towbar),
        fBool('frontpage', car.frontpage),
        fBool('campaign', car.campaign),
        fBool('fastdelivery', car.fastdelivery),
        f('metatitle', car.metatitle),
        f('metadescription', car.metadescription),
        f('opengraphtitle', car.opengraphtitle),
        f('opengraphdescription', car.opengraphdescription),
        f('shortterm', car.shortterm),
        f('pricecomment', car.pricecomment),
        f('salesman', car.salesman),
        f('availability', car.availability),
        f('consultant', car.consultant),
        f('sourceslug', car.sourceslug),
        f('sourceslugad', car.sourceslugad),
        f('chosepage', car.chosepage),
        f('shop', car.shop),
        descriptionHtml ? `descriptionHtml: ${JSON.stringify(descriptionHtml)}` : '',
        equipmentHtml   ? `equipmentHtml: ${JSON.stringify(equipmentHtml)}` : '',
      ].filter(Boolean).join('\n');

      const content = `---\n${fields}\n---`;


      fs.writeFileSync(path.join(brandDir, `${carSlug}.md`), content);
    });

    console.log(`✅ Lagret ${data.biler.length} biler i /biler/[merke]/.`);

    // --- 7. TJENESTER ---
    const servicesDir = path.join(__dirname, 'content', 'tjenester');
    if (!fs.existsSync(servicesDir)) fs.mkdirSync(servicesDir, { recursive: true });

    const servicesIndex = path.join(servicesDir, '_index.md');
    if (!fs.existsSync(servicesIndex)) {
      fs.writeFileSync(servicesIndex, `---\ntitle: "Våre Tjenester"\nlayout: "list"\n---`);
    }

    const tjenester = await client.fetch(`*[_type == "service"] {
      ...,
      "image": image.asset->url
    }`);

    tjenester.forEach(service => {
      const slug = service.slug?.current || service.title.toLowerCase().replace(/\s+/g, '-');
      const bodyHtml = toHTML(service.body || []);
      const leadHtml = (service.lead || '').replace(/\n/g, '<br>');
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