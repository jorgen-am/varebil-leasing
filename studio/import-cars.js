const fs = require('fs');
const Papa = require('papaparse');
const axios = require('axios');
const { Schema } = require('@sanity/schema');
const { htmlToBlocks } = require('@sanity/block-tools');
const { JSDOM } = require('jsdom');

// --- KONFIGURASJON ---
const projectId = '1lzskaub'; 
const dataset = 'production';
const apiToken = 'skzuZbi2qcpRAQJOOcD96edEIB4GZkr40YsMHikgRBMuFGpBycCLGMNm5IcWIiRFFTU6ZXclut6QxoniGESvcQGCKSpBNo2Iy81gQRQwHIT2haNbX9PVBoiSyVsSvQsqjceSZYQc92JjLCS9CdEk7pn7UBO9BNg1mjboxWJTri3x8ChsIiUv'; 
// ---------------------

// --- HJELPEFUNKSJON FOR BILDEOPPLASTING ---
const uploadImageFromUrl = async (url) => {
    if (!url || !url.trim().startsWith('http')) return null;
    
    try {
      const response = await axios.get(url.trim(), { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      
      const assetResponse = await axios.post(
        `https://${projectId}.api.sanity.io/v2023-05-01/assets/images/${dataset}`,
        buffer,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'image/jpeg', 
          }
        }
      );
      
      return {
        _type: 'image',
        asset: {
          _type: "reference",
          _ref: assetResponse.data.document._id
        }
      };
    } catch (error) {
      console.error(`Kunne ikke laste opp bilde fra ${url.substring(0, 50)}...:`, error.message);
      return null;
    }
};

// --- OPPSETT FOR PORTABLE TEXT (HTML-konvertering) ---
const defaultSchema = Schema.compile({
    name: 'default',
    types: [{ type: 'object', name: 'car', fields: [{ name: 'description', type: 'array', of: [{ type: 'block' }] }] }]
});
const blockContentType = defaultSchema.get('car').fields.find(f => f.name === 'description').type;

const htmlToPortableText = (html) => {
    if (!html) return [];
    return htmlToBlocks(html, blockContentType, {
        parseHtml: (html) => new JSDOM(html).window.document
    });
};

const client = axios.create({
    baseURL: `https://${projectId}.api.sanity.io/v2023-05-01/data/mutate/${dataset}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` }
});

// --- START IMPORT ---
const csvFile = fs.readFileSync('egenskaper-varebil.csv', 'utf8');

Papa.parse(csvFile, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
        const cleanData = results.data.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => { newRow[key.trim()] = row[key]; });
            return newRow;
        });

        console.log(`Starter import av ${cleanData.length} biler med bilder og tekstkonvertering...`);

        for (const car of cleanData) {
            if (!car.title || !car.slug) continue;

            console.log(`\nBehandler: ${car.title}`);

            // 1. Last opp hovedbilde (shopimage)
            let mainImage = null;
            if (car.shopimage) {
                console.log(`- Laster opp hovedbilde...`);
                mainImage = await uploadImageFromUrl(car.shopimage);
            }

            // 2. Last opp galleri (mainimages - antar kommaseparert liste i CSV)
            let galleryImages = [];
            if (car.mainimages) {
                const urls = car.mainimages.split(',').filter(url => url.trim().length > 0);
                console.log(`- Laster opp ${urls.length} galleribilder...`);
                for (const url of urls) {
                    const img = await uploadImageFromUrl(url);
                    if (img) galleryImages.push(img);
                }
            }

            const mutations = [{
                createOrReplace: {
                    _type: 'car',
                    _id: `car-${car.slug}`,
                    title: car.title,
                    slug: { _type: 'slug', current: car.slug },
                    
                    // Priser & Økonomi
                    price0: Number(car.price0) || 0,
                    price60: Number(car.price60) || 0,
                    price100: Number(car.price100) || 0,
                    priceads0: Number(car.priceads0) || 0,
                    interest: car.interest,

                    // Tekniske detaljer
                    brand: car.brand,
                    quote: car.quote,
                    modeldescription: car.modeldescription,
                    fuel: car.fuel,
                    drive: car.drive,
                    range: car.range,
                    gear: car.gear,
                    performance: car.performance,
                    doors: car.doors,
                    seats: car.seats,
                    yearmodel: car.yearmodel,
                    color: car.color,
                    interior: car.interior,
                    charging: car.charging,
                    capacity: car.capacity,
                    towbar: car.towbar?.toUpperCase() === 'TRUE',

                    // Status-flagg
                    frontpage: car.frontpage?.toUpperCase() === 'TRUE',
                    campaign: car.campaign?.toUpperCase() === 'TRUE',
                    fastdelivery: car.fastdelivery?.toUpperCase() === 'TRUE',

                    // Tekstområder (Konvertert til Portable Text)
                    // Finn disse linjene i mutasjonen din og endre dem til:
                    description: htmlToPortableText(car.description),
                    equipment: htmlToPortableText(car.equipment),                   

                    // SEO
                    metatitle: car.metatitle,
                    metadescription: car.metadescription,

                    // Bilder
                    mainImage: mainImage,
                    gallery: galleryImages
                }
            }];

            try {
                await client.post('', { mutations });
                console.log(`✅ Suksess: ${car.title}`);
            } catch (err) {
                console.error(`❌ Feil ved lagring av ${car.title}:`, err.response?.data || err.message);
            }
        }
        console.log('\n🚀 Alt ferdig! Ta en kikk i Sanity Studio.');
    }
});