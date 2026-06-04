// migrate-fields.js
// 
// Kopierer verdier fra gamle camelCase-feltnavn til korrekte lowercase-feltnavn i Sanity.
// Sletter deretter de gamle feltene så advarselen "Unknown fields found" forsvinner.
//
// Kjør med: node migrate-fields.js

const axios = require('axios');

const projectId = '1lzskaub';
const dataset = 'production';
const apiToken = 'skoy2IU2ZL2p8WzeIEVfqy5XtMLOMR7HXafTEs6o4zh4jeFkMzXwYifWcFZEdYki8cXovhP2T4SJuxx4hxEyz5WZ2o4KfOTLnlMu23fjInHWQFqtTB4vpfU4PBs3GQ0ljV8sYB5MlrC6gZvodeNORmJlknVOE9ZZ1ykbe8tFqHlaV8Sr6O2y';

const BASE_URL = `https://${projectId}.api.sanity.io/v2023-05-01`;

const headers = {
  Authorization: `Bearer ${apiToken}`,
  'Content-Type': 'application/json'
};

// Alle felt som skal flyttes: { gammeltNavn: nyttNavn }
const FIELD_MIGRATIONS = {
  'allowedTotalWeight':   'allowedtotalweight',
  'batteryWarranty':      'batterywarranty',
  'bodyType':             'body',
  'chargingDc':           'chargingdc',
  'chargingSpeed':        'chargingspeed',
  'co2Emission':          'cotwoemission',
  'grossBattery':         'grossbattery',
  'kerbWeight':           'kerbweight',
  'kerbWeightExDriver':   'kerbweightexdriver',
  'maxBootCapacity':      'maxbootcapacity',
  'maxHomeChargeAc':      'maxhomechargeac',
  'maxRoofLoad':          'maxroofload',
  'minBootCapacity':      'minbootcapacity',
  'netBattery':           'netbattery',
  'numberOfEngines':      'numberofengines',
  'numberOfGears':        'numberofgears',
  'onePhaseHomeChargeAc': 'onephasehomechargeac',
  'payloadIncDriver':     'payloadincdriver',
  'performanceHk':        'performancehk',
  'performanceWatt':      'performancewatt',
  'powerUsage':           'powerusage',
  'price0':               'pricezero',
  'price60':              'pricesixty',
  'price100':             'pricehundred',
  'priceads0':            'priceadszero',
  'trailerWithBrake':     'trailerwbreak',
  'trailerWithoutBrake':  'trailerwobreak',
  'turningCircle':        'turningcircle',
  'warrantyPaint':        'warrantypaint',
  'warrantyRust':         'warrantyrust',
  'widthWithMirrors':     'widthwmirrors',
  'widthWithoutMirrors':  'widthwomirrors',
};

// Henter alle bil-dokumenter fra Sanity med alle relevante felt
async function fetchAllCars() {
  const oldFields = Object.keys(FIELD_MIGRATIONS).join(', ');
  const query = encodeURIComponent(`*[_type == "car"]{ _id, _rev, ${oldFields} }`);
  const url = `${BASE_URL}/data/query/${dataset}?query=${query}`;
  
  const res = await axios.get(url, { headers });
  return res.data.result;
}

// Bygger én patch per dokument: setter nye felt, sletter gamle
function buildPatch(doc) {
  const setFields = {};
  const unsetFields = [];

  for (const [oldKey, newKey] of Object.entries(FIELD_MIGRATIONS)) {
    const value = doc[oldKey];
    
    // Hopp over felt som ikke finnes eller er null/undefined på dette dokumentet
    if (value === undefined || value === null) continue;

    // Kopier verdien til det nye feltnavnet
    setFields[newKey] = value;
    
    // Merk det gamle feltet for sletting
    unsetFields.push(oldKey);
  }

  if (unsetFields.length === 0) return null; // Ingenting å gjøre for dette dokumentet

  return {
    patch: {
      id: doc._id,
      set: setFields,
      unset: unsetFields
    }
  };
}

async function runMigration() {
  console.log('Henter alle bil-dokumenter fra Sanity...');
  const cars = await fetchAllCars();
  console.log(`Fant ${cars.length} biler.\n`);

  let migrated = 0;
  let skipped = 0;

  // Behandler i grupper på 20 for å unngå for store forespørsler
  const BATCH_SIZE = 20;
  for (let i = 0; i < cars.length; i += BATCH_SIZE) {
    const batch = cars.slice(i, i + BATCH_SIZE);
    const mutations = batch.map(buildPatch).filter(Boolean);

    if (mutations.length === 0) {
      skipped += batch.length;
      continue;
    }

    // Vis hva som skjer for denne batchen
    for (const car of batch) {
      const patch = buildPatch(car);
      if (patch) {
        const fieldsToMove = Object.keys(patch.patch.set);
        console.log(` -> ${car._id}`);
        console.log(`    Flytter ${fieldsToMove.length} felt: ${fieldsToMove.join(', ')}`);
        migrated++;
      } else {
        skipped++;
      }
    }

    try {
      await axios.post(
        `${BASE_URL}/data/mutate/${dataset}`,
        { mutations },
        { headers }
      );
    } catch (err) {
      console.error('❌ Feil i batch:', err.response?.data || err.message);
    }
  }

  console.log(`\n✅ Ferdig!`);
  console.log(`   Migrerte: ${migrated} dokumenter`);
  console.log(`   Hoppet over (ingen gamle felt): ${skipped} dokumenter`);
  console.log(`\nDu kan nå åpne Sanity Studio og bekrefte at "Unknown fields found"-advarselen er borte.`);
  console.log(`Kjør deretter Hugo for å bygge siden på nytt.`);
}

runMigration().catch(err => {
  console.error('Kritisk feil:', err.response?.data || err.message);
  process.exit(1);
});
