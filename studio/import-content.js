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

// VELG FIL (Kjør én og én)
const CURRENT_TYPE = 'post'; // Sett til 'post', 'service', eller 'review'
const CSV_FILE_NAME = 'blogg.csv'; 

// --- HJELPEFUNKSJONER ---
const uploadImage = async (url) => {
    if (!url || !url.trim().startsWith('http')) return null;
    try {
        const res = await axios.get(url.trim(), { responseType: 'arraybuffer' });
        const asset = await axios.post(
            `https://${projectId}.api.sanity.io/v2023-05-01/assets/images/${dataset}`,
            Buffer.from(res.data, 'binary'),
            { headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'image/jpeg' } }
        );
        return { _type: 'image', asset: { _type: "reference", _ref: asset.data.document._id } };
    } catch (e) { return null; }
};

const defaultSchema = Schema.compile({
    name: 'default',
    types: [{ type: 'object', name: 'content', fields: [{ name: 'body', type: 'array', of: [{ type: 'block' }] }] }]
});
const blockContentType = defaultSchema.get('content').fields.find(f => f.name === 'body').type;

const toPortableText = (html) => {
    if (!html) return [];
    const cleanHtml = html.replace(/id="[^"]*"/g, '');
    return htmlToBlocks(cleanHtml, blockContentType, { parseHtml: (html) => new JSDOM(html).window.document });
};

const client = axios.create({
    baseURL: `https://${projectId}.api.sanity.io/v2023-05-01/data/mutate/${dataset}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` }
});

const data = fs.readFileSync(CSV_FILE_NAME, 'utf8');

Papa.parse(data, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
        const rows = results.data.map(r => {
            const n = {};
            Object.keys(r).forEach(k => { if(k) n[k.trim()] = r[k]; });
            return n;
        });

        for (const row of rows) {
            // Sjekk om raden faktisk har data (name for omtaler, title for post/service)
            if (!row.name && !row.title) continue;

            let payload = { _type: CURRENT_TYPE };
            
            if (CURRENT_TYPE === 'review') {
                // MAPPER FRA CSV-HEADERNE DINE: name,slug,stars,date,reviews,description,answer,dataname
                payload._id = `review-${row.slug || Math.random().toString(36).substring(7)}`;
                payload.author = row.name;        // CSV 'name' -> Sanity 'author'
                payload.rating = Number(row.stars) || 5; // CSV 'stars' -> Sanity 'rating'
                payload.content = row.description; // CSV 'description' -> Sanity 'content'
                payload.date = row.date;          // CSV 'date' -> Sanity 'date'
                payload.reviews = row.reviews;    // CSV 'reviews' -> Sanity 'reviews'
                payload.dataname = row.dataname;  // CSV 'dataname' -> Sanity 'dataname'
                
                // Hvis du har bilde-URL i en kolonne (f.eks. 'image'), aktiver denne:
                if (row.image) payload.image = await uploadImage(row.image);

            } else if (CURRENT_TYPE === 'post') {
                const slug = row.slug;
                if (!slug) continue;
                payload._id = `post-${slug}`;
                payload.title = row.title;
                payload.slug = { _type: 'slug', current: slug };
                payload.excerpt = row.metadescription;
                payload.body = toPortableText(row.description);
                payload.category = row.category;
                payload.readtime = row.readtime;
                payload.tagone = row.tagone;
                payload.tagtwo = row.tagtwo;
                payload.alt = row.alt;
                payload.campaignlink = row.campaignlink;
                payload.ctatext = row.ctatext;
                payload.shoform = String(row.showform).toUpperCase() === 'TRUE';
                payload.shoreviews = String(row.showreviews).toUpperCase() === 'TRUE';
                payload.landing = String(row.landing).toUpperCase() === 'TRUE';
                payload.sticky = String(row.sticky).toUpperCase() === 'TRUE';
                payload.ogtitle = row.ogtitle;
                payload.ogdescription = row.ogdescription;
                payload.metatitle = row.metatitle;
                payload.metadescription = row.metadescription;
                if (row.image) payload.mainImage = await uploadImage(row.image);
                if (row.ctaimage) payload.ctaimage = await uploadImage(row.ctaimage);

            } else if (CURRENT_TYPE === 'service') {
                const slug = row.slug;
                if (!slug) continue;
                payload._id = `service-${slug}`;
                payload.title = row.title;
                payload.slug = { _type: 'slug', current: slug };
                payload.lead = row.lead;
                payload.body = toPortableText(row.description);
                payload.email = row.email;
                payload.alt = row.alt;
                payload.salesman = row.salesman;
                if (row.image) payload.image = await uploadImage(row.image);
            }

            try {
                await client.post('', { mutations: [{ createOrReplace: payload }] });
                // Her bruker vi payload.author for reviews og payload.title for post/service
                console.log(`✅ Importert ${CURRENT_TYPE}: ${payload.title || payload.author}`);
            } catch (err) {
                console.error(`❌ Feil ved import:`, err.message);
            }
        }
        console.log('🚀 Ferdig med denne filen!');
    }
});