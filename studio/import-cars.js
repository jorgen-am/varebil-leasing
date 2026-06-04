const fs = require('fs');
const Papa = require('papaparse');
const axios = require('axios');
const { Schema } = require('@sanity/schema');
const { htmlToBlocks } = require('@sanity/block-tools');
const { JSDOM } = require('jsdom');

// --- KONFIGURASJON ---
const projectId = '1lzskaub'; 
const dataset = 'production';
const apiToken = 'skoy2IU2ZL2p8WzeIEVfqy5XtMLOMR7HXafTEs6o4zh4jeFkMzXwYifWcFZEdYki8cXovhP2T4SJuxx4hxEyz5WZ2o4KfOTLnlMu23fjInHWQFqtTB4vpfU4PBs3GQ0ljV8sYB5MlrC6gZvodeNORmJlknVOE9ZZ1ykbe8tFqHlaV8Sr6O2y'
// ---------------------

const client = axios.create({
  baseURL: `https://${projectId}.api.sanity.io/v2023-05-01/data/mutate/${dataset}`,
  headers: {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  }
});

const uploadImageFromUrl = async (url) => {
    if (!url || !url.trim().startsWith('http')) return null;
    try {
      const response = await axios.get(url.trim(), { 
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const buffer = Buffer.from(response.data, 'binary');
      const assetResponse = await axios.post(
        `https://${projectId}.api.sanity.io/v2023-05-01/assets/images/${dataset}`,
        buffer,
        { headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'image/jpeg' } }
      );
      const uniqueKey = 'img_' + Math.random().toString(36).substr(2, 9);
      return { 
        _type: 'image', 
        _key: uniqueKey,
        asset: { _type: 'reference', _ref: assetResponse.data.document._id } 
      };
    } catch (err) {
      console.error(`Kunne ikke laste opp bilde fra URL: ${url}`, err.message);
      return null;
    }
};

const defaultSchema = Schema.compile({
  name: 'myBlog',
  types: [{ type: 'object', name: 'blogPost', fields: [{title: 'Body', name: 'body', type: 'array', of: [{type: 'block'}]}] }]
});
const blockContentType = defaultSchema.get('blogPost').fields.find((field) => field.name === 'body').type;

const htmlToPortableText = (htmlString) => {
    if (!htmlString || htmlString.trim() === '') return [];
    try {
        const { window } = new JSDOM(`<html><body>${htmlString}</body></html>`);
        return htmlToBlocks(htmlString, blockContentType, { 
            parseHtml: (html) => {
                const dom = new JSDOM(html);
                return dom.window.document;
            }
        });
    } catch (err) { 
        console.error("Feil ved HTML-parsing:", err.message);
        return []; 
    }
};

const cleanNumber = (val) => {
    if (!val) return undefined;
    const cleaned = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? undefined : parsed;
};

const csvFilePath = './egenskaper-varebil.csv';
const fileContent = fs.readFileSync(csvFilePath, 'utf8');

console.log('Starter import av bil-spesifikasjoner...\n');

Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    // VIKTIG: Ingen transformHeader her — vi bruker CSV-kolonnenavn direkte (allerede lowercase uten mellomrom)
    complete: async (results) => {
        
        for (const car of results.data) {
            if (!car.slug || car.slug.trim() === '') continue;

            console.log(`Behandler: ${car.brand || ''} ${car.title || 'Uten navn'}`);
            const generatedCarId = `car-${car.slug.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

            let mainImage = null;
            let galleryImages = [];

            if (car.shopimage && car.shopimage.trim() !== '') {
                mainImage = await uploadImageFromUrl(car.shopimage.trim());
            }

            if (car.mainimages && car.mainimages.trim() !== '') {
                const rawUrls = car.mainimages.split(';').map(url => url.trim()).filter(url => url !== '');
                for (const url of rawUrls) {
                    const imgRef = await uploadImageFromUrl(url);
                    if (imgRef) galleryImages.push(imgRef);
                }
                if (!mainImage && galleryImages.length > 0) {
                    mainImage = galleryImages[0];
                }
            }

            // FIKS: Alle felt bruker nå eksakt samme navn som CSV-kolonner og Sanity-skjema.
            // Tidligere feil:
            //   1. transformHeader la til understreker (f.eks. 'performance_hk') som ikke finnes i CSV
            //   2. carData brukte gammel camelCase (f.eks. 'performanceHk') som ikke finnes i car.js-skjema
            const carData = {
                _id: generatedCarId,
                _type: 'car',

                // Identifikasjon
                title: car.title,
                slug: { _type: 'slug', current: car.slug.trim() },
                brand: car.brand,
                modeldescription: car.modeldescription,
                yearmodel: car.yearmodel,

                // Utseende
                color: car.color,
                interior: car.interior,
                shopimage: car.shopimage,           // FIKS: var ikke med i det hele tatt
                alttext: car.alttext,

                // Grunnspesifikasjoner — FIKS: var bodyType, nå body (matcher car.js)
                fuel: car.fuel,
                body: car.body,                     // FIKS: var 'bodyType'
                drive: car.drive,
                gear: car.gear,
                doors: cleanNumber(car.doors),
                seats: cleanNumber(car.seats),
                lversion: car.lversion,
                towbar: car.towbar?.toUpperCase() === 'TRUE',

                // Ytelse — FIKS: var 'performanceHk'/'performanceWatt' (camelCase)
                performancehk: cleanNumber(car.performancehk),
                performancewatt: cleanNumber(car.performancewatt),
                torque: cleanNumber(car.torque),
                numberofengines: cleanNumber(car.numberofengines),
                cotwoemission: car.cotwoemission,

                // Batteri & Lading — FIKS: alle var camelCase og/eller hadde understreker
                range: cleanNumber(car.range),
                grossbattery: cleanNumber(car.grossbattery),
                netbattery: cleanNumber(car.netbattery),
                chargingdc: cleanNumber(car.chargingdc),        // FIKS: var 'carging_dc' (feil navn + skrivefeil)
                maxhomechargeac: car.maxhomechargeac,
                onephasehomechargeac: car.onephasehomechargeac,
                chargingspeed: car.chargingspeed,               // FIKS: var 'carging_speed' (skrivefeil)
                powerusage: car.powerusage,
                batterywarranty: car.batterywarranty,

                // Girkasse
                numberofgears: cleanNumber(car.numberofgears),

                // Garanti
                warranty: car.warranty,
                warrantypaint: car.warrantypaint,
                warrantyrust: car.warrantyrust,

                // Vekter
                allowedtotalweight: cleanNumber(car.allowedtotalweight),
                kerbweight: cleanNumber(car.kerbweight),
                kerbweightexdriver: cleanNumber(car.kerbweightexdriver),
                payloadincdriver: cleanNumber(car.payloadincdriver),
                maxroofload: cleanNumber(car.maxroofload),

                // Tilhenger — FIKS: var 'trailerWithBrake'/'trailerWithoutBrake' og 'trailer_w_break' (skrivefeil break/brake)
                trailerwbreak: cleanNumber(car.trailerwbreak),
                trailerwobreak: cleanNumber(car.trailerwobreak),

                // Volum & Dimensjoner — FIKS: var camelCase og hadde understreker
                maxbootcapacity: cleanNumber(car.maxbootcapacity),
                minbootcapacity: cleanNumber(car.minbootcapacity),
                length: cleanNumber(car.length),
                widthwomirrors: cleanNumber(car.widthwomirrors),    // FIKS: var 'widthWithoutMirrors'
                widthwmirrors: cleanNumber(car.widthwmirrors),      // FIKS: var 'widthWithMirrors'
                height: cleanNumber(car.height),
                wheelbase: cleanNumber(car.wheelbase),
                turningcircle: car.turningcircle ? parseFloat(String(car.turningcircle).replace(',', '.')) : undefined,

                // Priser — FIKS: var 'price0'/'price60'/'price100'/'priceads0'
                pricezero: cleanNumber(car.pricezero),
                pricesixty: cleanNumber(car.pricesixty),
                pricehundred: cleanNumber(car.pricehundred),
                priceadszero: cleanNumber(car.priceadszero),
                interest: car.interest,
                quote: car.quote,

                // Status
                frontpage: car.frontpage?.toUpperCase() === 'TRUE',
                campaign: car.campaign?.toUpperCase() === 'TRUE',
                fastdelivery: car.fastdelivery?.toUpperCase() === 'TRUE',
                shop: car.shop,
                chosepage: car.chosepage,
                shortterm: car.shortterm,
                pricecomment: car.pricecomment,
                salesman: car.salesman,
                availability: car.availability,
                consultant: car.consultant,
                sourceslug: car.sourceslug,
                sourceslugad: car.sourceslugad,

                // Innhold
                description: htmlToPortableText(car.description),
                equipment: htmlToPortableText(car.equipment),                   
                
                // SEO
                metatitle: car.metatitle,
                metadescription: car.metadescription,
                opengraphtitle: car.opengraphtitle,
                opengraphdescription: car.opengraphdescription,

                // Bilder
                mainimage: mainImage,
                gallery: galleryImages
            };

            Object.keys(carData).forEach(key => carData[key] === undefined && delete carData[key]);

            try {
                const createMutation = { createIfNotExists: carData };

                const { 
                    pricezero, pricesixty, pricehundred, priceadszero, interest, quote,
                    frontpage, campaign, fastdelivery, description, equipment,
                    metatitle, metadescription, opengraphtitle, opengraphdescription,
                    mainimage: mImg, gallery: gal,
                    ...technicalSpecs 
                } = carData;

                const patchMutation = {
                    patch: {
                        id: generatedCarId,
                        set: technicalSpecs,
                        //mainimage: mImg || null,
                        setIfMissing: {
                            pricezero: pricezero ?? null,
                            pricesixty: pricesixty ?? null,
                            pricehundred: pricehundred ?? null,
                            priceadszero: priceadszero ?? null,
                            interest: interest || "",
                            quote: quote || "",
                            frontpage: frontpage ?? false,
                            campaign: campaign ?? false,
                            fastdelivery: fastdelivery ?? false,
                            description: description || [],
                            equipment: equipment || [],
                            metatitle: metatitle || "",
                            metadescription: metadescription || "",
                            opengraphtitle: opengraphtitle || "",
                            opengraphdescription: opengraphdescription || "",
                            //mainimage: mImg || null,
                            gallery: gal || []
                        }
                    }
                };

                await client.post('', { mutations: [createMutation, patchMutation] });
                console.log(` ✓ ${car.brand} ${car.title}`);
            } catch (err) {
                console.error(`❌ Feil ved oppdatering av ${car.title}:`, err.response?.data || err.message);
            }
        }
        console.log('\n🚀 Alt ferdig!');
    }
});