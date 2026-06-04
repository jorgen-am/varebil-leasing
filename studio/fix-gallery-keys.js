// fix-gallery-keys.js
//
// Fikser "Missing keys" på galleri-bilder i Sanity.
// Henter alle bil-dokumenter der gallery-arrayen har bilder uten _key,
// og patcher inn unike nøkler.
//
// Kjør med: node fix-gallery-keys.js

const axios = require('axios');

const projectId = '1lzskaub';
const dataset = 'production';
const apiToken = 'skoy2IU2ZL2p8WzeIEVfqy5XtMLOMR7HXafTEs6o4zh4jeFkMzXwYifWcFZEdYki8cXovhP2T4SJuxx4hxEyz5WZ2o4KfOTLnlMu23fjInHWQFqtTB4vpfU4PBs3GQ0ljV8sYB5MlrC6gZvodeNORmJlknVOE9ZZ1ykbe8tFqHlaV8Sr6O2y';

const BASE_URL = `https://${projectId}.api.sanity.io/v2023-05-01`;
const headers = {
  Authorization: `Bearer ${apiToken}`,
  'Content-Type': 'application/json'
};

function randomKey() {
  return 'img_' + Math.random().toString(36).substr(2, 9);
}

async function fetchAllCars() {
  const query = encodeURIComponent(`*[_type == "car" && defined(gallery)]{ _id, gallery }`);
  const res = await axios.get(`${BASE_URL}/data/query/${dataset}?query=${query}`, { headers });
  return res.data.result;
}

async function runFix() {
  console.log('Henter biler med galleri...');
  const cars = await fetchAllCars();
  console.log(`Fant ${cars.length} biler med galleri-felt.\n`);

  let fixed = 0;
  let skipped = 0;

  const BATCH_SIZE = 20;
  for (let i = 0; i < cars.length; i += BATCH_SIZE) {
    const batch = cars.slice(i, i + BATCH_SIZE);
    const mutations = [];

    for (const car of batch) {
      const gallery = car.gallery || [];

      // Sjekk om noen bilder mangler _key
      const hasMissingKeys = gallery.some(img => !img._key);
      if (!hasMissingKeys) {
        skipped++;
        continue;
      }

      // Legg til _key der det mangler
      const fixedGallery = gallery.map(img => ({
        ...img,
        _key: img._key || randomKey()
      }));

      console.log(` -> ${car._id}: fikser ${gallery.filter(img => !img._key).length} bilder uten nøkkel`);
      fixed++;

      mutations.push({
        patch: {
          id: car._id,
          set: { gallery: fixedGallery }
        }
      });
    }

    if (mutations.length === 0) continue;

    try {
      await axios.post(`${BASE_URL}/data/mutate/${dataset}`, { mutations }, { headers });
    } catch (err) {
      console.error('❌ Feil i batch:', err.response?.data || err.message);
    }
  }

  console.log(`\n✅ Ferdig!`);
  console.log(`   Fikset: ${fixed} dokumenter`);
  console.log(`   Allerede ok: ${skipped} dokumenter`);
}

runFix().catch(err => {
  console.error('Kritisk feil:', err.response?.data || err.message);
  process.exit(1);
});
