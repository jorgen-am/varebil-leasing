export default {
  name: 'car',
  title: 'Biler',
  type: 'document',
  fieldsets: [
    { name: 'leasing', title: 'Pris & Leasing' },
    { name: 'teknisk', title: 'Tekniske detaljer' },
    { name: 'status', title: 'Status & Kampanje' },
    { name: 'seo', title: 'SEO & Markedsføring' }
  ],
  fields: [
    { name: 'title', title: 'Modellnavn', type: 'string' },
    { name: 'slug', title: 'URL-streng', type: 'slug', options: { source: 'title' } },
    { name: 'mainimage', title: 'Hovedbilde', type: 'image', options: { hotspot: true } },
    { name: 'shopimage', title: 'Butikkbilde URL', type: 'url', fieldset: 'teknisk' },
    { name: 'gallery', title: 'Bildegalleri', type: 'array', of: [{ type: 'image', options: { hotspot: true } }], options: { layout: 'grid' } },

    // Spesifikasjoner (Synkronisert med CSV)
    { name: 'brand', title: 'Merke', type: 'string', fieldset: 'teknisk' },
    { name: 'modeldescription', title: 'Modellversjon (f.eks. L2 Proff)', type: 'string', fieldset: 'teknisk' },
    { name: 'yearmodel', title: 'Årsmodell', type: 'string', fieldset: 'teknisk' },
    { name: 'fuel', title: 'Drivstofftype', type: 'string', fieldset: 'teknisk' },
    { name: 'body', title: 'Karosseritype', type: 'string', fieldset: 'teknisk' }, // Endret fra bodyType til body
    { name: 'lversion', title: 'Lasteromversjon', type: 'string', fieldset: 'teknisk' },
    { name: 'drive', title: 'Hjuldrift', type: 'string', fieldset: 'teknisk' },
    { name: 'gear', title: 'Girkasse', type: 'string', fieldset: 'teknisk' },
    { name: 'numberofgears', title: 'Antall gir', type: 'number', fieldset: 'teknisk' }, // Endret fra numberOfGears
    { name: 'doors', title: 'Antall dører', type: 'number', fieldset: 'teknisk' },
    { name: 'seats', title: 'Antall seter', type: 'number', fieldset: 'teknisk' },
    { name: 'towbar', title: 'Hengerfeste inkludert', type: 'boolean', fieldset: 'teknisk' },
    { name: 'color', title: 'Farge utvendig', type: 'string', fieldset: 'teknisk' },
    { name: 'interior', title: 'Interiørfarge', type: 'string', fieldset: 'teknisk' },

    // Ytelser
    { name: 'performancehk', title: 'Ytelse (HK)', type: 'number', fieldset: 'teknisk' }, // Endret fra performanceHk
    { name: 'performancewatt', title: 'Ytelse (kW)', type: 'number', fieldset: 'teknisk' }, // Endret fra performanceWatt
    { name: 'torque', title: 'Dreiemoment (Nm)', type: 'number', fieldset: 'teknisk' },
    { name: 'numberofengines', title: 'Antall motorer', type: 'number', fieldset: 'teknisk' }, // Endret fra numberOfEngines
    { name: 'cotwoemission', title: 'CO2-utslipp', type: 'string', fieldset: 'teknisk' }, // Endret fra co2Emission

    // Batteri & Lading (Elbil-spesifikt)
    { name: 'range', title: 'Rekkevidde WLTP (km)', type: 'number', fieldset: 'teknisk' },
    { name: 'grossbattery', title: 'Brutto batteri (kWh)', type: 'number', fieldset: 'teknisk' }, // Endret fra grossBattery
    { name: 'netbattery', title: 'Netto batteri (kWh)', type: 'number', fieldset: 'teknisk' }, // Endret fra netBattery
    { name: 'chargingdc', title: 'Maks hurtiglading DC (kW)', type: 'number', fieldset: 'teknisk' }, // Endret fra chargingDc
    { name: 'maxhomechargeac', title: 'Maks hjemmelading AC', type: 'string', fieldset: 'teknisk' }, // Endret fra maxHomeChargeAc
    { name: 'onephasehomechargeac', title: '1-fase hjemmelading AC', type: 'string', fieldset: 'teknisk' }, // Endret fra onePhaseHomeChargeAc
    { name: 'chargingspeed', title: 'Ladehastighet tid', type: 'string', fieldset: 'teknisk' }, // Endret fra chargingSpeed
    { name: 'powerusage', title: 'Strømforbruk', type: 'string', fieldset: 'teknisk' }, // Endret fra powerUsage
    
    // Priser
    { name: 'pricezero', title: 'Leasing 0,- innskudd', type: 'number', fieldset: 'leasing' }, // Endret fra price0 til pricezero (fremdeles tilgjengelig som price0 i JSON ved behov)
    { name: 'pricesixty', title: 'Leasing 60k innskudd', type: 'number', fieldset: 'leasing' }, // Endret fra price60
    { name: 'pricehundred', title: 'Leasing 100k innskudd', type: 'number', fieldset: 'leasing' }, // Endret fra price100
    { name: 'priceadszero', title: 'Reklamepris (0,-)', type: 'number', fieldset: 'leasing' }, // Endret fra priceads0
    { name: 'interest', title: 'Rente', type: 'string', fieldset: 'leasing' },
    { name: 'quote', title: 'Quotenummer', type: 'string', fieldset: 'leasing' },
    { name: 'quotefile', title: 'Quote fil', type: 'file', options: { accept: '.pdf,.jpg,.jpeg,.doc,.docx,.png,.gif,.webp' }, fields: [ { name: 'description', type: 'string', title: 'Tilbudsfil' } ] }, // Endret fra attachment til quotefile

    // Innhold
    { name: 'equipment', title: 'Ekstrautstyr', type: 'array', of: [{ type: 'block' }] },
    { name: 'description', title: 'Beskrivelse', type: 'array', of: [{ type: 'block' }] }, 

    // Vekter & Tilhenger
    { name: 'allowedtotalweight', title: 'Tillatt totalvekt (kg)', type: 'number', fieldset: 'teknisk' }, // Endret fra allowedTotalWeight
    { name: 'kerbweight', title: 'Egenvekt (kg)', type: 'number', fieldset: 'teknisk' }, // Endret fra kerbWeight
    { name: 'kerbweightexdriver', title: 'Egenvekt ekskl. sjåfør (kg)', type: 'number', fieldset: 'teknisk' }, // Endret fra kerbWeightExDriver
    { name: 'payloadincdriver', title: 'Nyttelast inkl. sjåfør (kg)', type: 'number', fieldset: 'teknisk' }, // Endret fra payloadIncDriver
    { name: 'maxroofload', title: 'Maks taklast (kg)', type: 'number', fieldset: 'teknisk' }, // Endret fra maxRoofLoad
    { name: 'trailerwbreak', title: 'Tilhengervekt m/ brems (kg)', type: 'number', fieldset: 'teknisk' }, // Endret fra trailerWithBrake
    { name: 'trailerwobreak', title: 'Tilhengervekt u/ brems (kg)', type: 'number', fieldset: 'teknisk' }, // Endret fra trailerWithoutBrake

    // Volum & Dimensjoner
    { name: 'maxbootcapacity', title: 'Maks lasteromsvolum (liter)', type: 'number', fieldset: 'teknisk' }, // Endret fra maxBootCapacity
    { name: 'minbootcapacity', title: 'Minimum lasteromsvolum (liter)', type: 'number', fieldset: 'teknisk' }, // Endret fra minBootCapacity
    { name: 'length', title: 'Lengde (mm)', type: 'number', fieldset: 'teknisk' },
    { name: 'widthwomirrors', title: 'Bredde uten speil (mm)', type: 'number', fieldset: 'teknisk' }, // Endret fra widthWithoutMirrors
    { name: 'widthwmirrors', title: 'Bredde med speil (mm)', type: 'number', fieldset: 'teknisk' }, // Endret fra widthWithMirrors
    { name: 'height', title: 'Høyde (mm)', type: 'number', fieldset: 'teknisk' },
    { name: 'wheelbase', title: 'Akselavstand (mm)', type: 'number', fieldset: 'teknisk' },
    { name: 'turningcircle', title: 'Svingdiameter (m)', type: 'number', fieldset: 'teknisk' }, // Endret fra turningCircle

    // SEO
    { name: 'metatitle', title: 'SEO Tittel', type: 'string', fieldset: 'seo' },
    { name: 'metadescription', title: 'SEO Beskrivelse', type: 'text', fieldset: 'seo' },
    { name: 'opengraphtitle', title: 'Open Graph Tittel', type: 'string', fieldset: 'seo' }, // Endret fra ogtitle
    { name: 'opengraphdescription', title: 'Open Graph Beskrivelse', type: 'text', fieldset: 'seo' }, // Endret fra ogdescription

    // Garantier
    { name: 'warranty', title: 'Nybilgaranti', type: 'string', fieldset: 'teknisk' },
    { name: 'batterywarranty', title: 'Batterigaranti', type: 'string', fieldset: 'teknisk' }, // Endret fra batteryWarranty
    { name: 'warrantypaint', title: 'Lakkgaranti', type: 'string', fieldset: 'teknisk' }, // Endret fra warrantyPaint
    { name: 'warrantyrust', title: 'Rustgaranti', type: 'string', fieldset: 'teknisk' }, // Endret fra warrantyRust
    
    // Status & Flagg
    { name: 'frontpage', title: 'Vis på forside', type: 'boolean', fieldset: 'status' },
    { name: 'campaign', title: 'Er kampanje', type: 'boolean', fieldset: 'status' },
    { name: 'fastdelivery', title: 'Rask levering', type: 'boolean', fieldset: 'status' },
  ],

  preview: {
    select: {
      title: 'title',
      brand: 'brand',
      slug: 'slug.current',
      quote: 'quote',
      price: 'pricezero', // Oppdatert fra price0 til pricezero
      model: 'modeldescription',
      media: 'mainimage'
    },
    prepare(selection) {
      const {title, brand, slug, quote, price, model, media} = selection
      
      return {
        title: `${brand || ''} ${title || 'Uten navn'} ${model || ''} `, 
        subtitle: `Q: ${quote || '—'} | ${price || '—'}/mnd | ${slug || ''}`,
        media: media
      }
    }
  }
}