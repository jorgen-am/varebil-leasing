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
    { name: 'mainImage', title: 'Hovedbilde', type: 'image', options: { hotspot: true } },
    { name: 'gallery', title: 'Bildegalleri', type: 'array', of: [{ type: 'image', options: { hotspot: true } }] },

    // Priser
    { name: 'price0', title: 'Leasing 0,- innskudd', type: 'number', fieldset: 'leasing' },
    { name: 'price60', title: 'Leasing 60k innskudd', type: 'number', fieldset: 'leasing' },
    { name: 'price100', title: 'Leasing 100k innskudd', type: 'number', fieldset: 'leasing' },
    { name: 'priceads0', title: 'Reklamepris (0,-)', type: 'number', fieldset: 'leasing' },
    { name: 'interest', title: 'Rente', type: 'string', fieldset: 'leasing' },
    { name: 'quote', title: 'Quotenummer', type: 'string', fieldset: 'leasing' },
    { name: 'attachment', title: 'Quote fil', type: 'file', options: { accept: '.pdf,.jpg,.jpeg,.doc,.docx,.png,.gif,.webp' }, fields: [ { name: 'description', type: 'string', title: 'Tilbudsfil' } ] },
    
    // Spesifikasjoner
    { name: 'brand', title: 'Merke', type: 'string', fieldset: 'teknisk' },
    { name: 'modeldescription', title: 'Modellversjon (f.eks. L2 Proff)', type: 'string', fieldset: 'teknisk' },
    { name: 'fuel', title: 'Drivstoff', type: 'string', fieldset: 'teknisk' },
    { name: 'drive', title: 'Hjuldrift', type: 'string', fieldset: 'teknisk' },
    { name: 'range', title: 'Rekkevidde', type: 'string', fieldset: 'teknisk' },
    { name: 'gear', title: 'Girkasse', type: 'string', fieldset: 'teknisk' },
    { name: 'performance', title: 'Ytelse (HK)', type: 'string', fieldset: 'teknisk' },
    { name: 'doors', title: 'Antall dører', type: 'string', fieldset: 'teknisk' },
    { name: 'seats', title: 'Antall seter', type: 'string', fieldset: 'teknisk' },
    { name: 'yearmodel', title: 'Årsmodell', type: 'string', fieldset: 'teknisk' },
    { name: 'towbar', title: 'Hengerfeste inkludert', type: 'boolean', fieldset: 'teknisk' },
    { name: 'color', title: 'Farge utvendig', type: 'string', fieldset: 'teknisk' },
    { name: 'interior', title: 'Interiørfarge', type: 'string', fieldset: 'teknisk' },
    { name: 'charging', title: 'Ladetid/hastighet', type: 'string', fieldset: 'teknisk' },
    { name: 'capacity', title: 'Lastekapasitet', type: 'string', fieldset: 'teknisk' },

    // Status & Flagg
    { name: 'frontpage', title: 'Vis på forside', type: 'boolean', fieldset: 'status' },
    { name: 'campaign', title: 'Er kampanje', type: 'boolean', fieldset: 'status' },
    { name: 'fastdelivery', title: 'Rask levering', type: 'boolean', fieldset: 'status' },

    // Innhold
    { name: 'equipment', title: 'Ekstrautstyr', type: 'array', of: [{ type: 'block' }] },
    { name: 'description', title: 'Beskrivelse', type: 'array', of: [{ type: 'block' }] },
    
    // SEO
    { name: 'metatitle', title: 'SEO Tittel', type: 'string', fieldset: 'seo' },
    { name: 'metadescription', title: 'SEO Beskrivelse', type: 'text', fieldset: 'seo' },
    { name: 'ogtitle', title: 'Open Graph Tittel', type: 'string', fieldset: 'seo' },
    { name: 'ogdescription', title: 'Open Graph Beskrivelse', type: 'text', fieldset: 'seo' },
  ], // Slutt på fields-arrayen

  // Preview må ligge HER, inne i eksport-objektet
  preview: {
    select: {
      title: 'title',
      brand: 'brand', // Vi må hente merket her...
      slug: 'slug.current',
      quote: 'quote',
      price: 'price0',
      model: 'modeldescription',
      media: 'mainImage'
    },
    prepare(selection) {
      const {title, brand, slug, quote, price, model, media} = selection
      
      return {
        // ...og så setter vi det sammen her for den øverste linjen:
        title: `${brand || ''} ${title || 'Uten navn'} ${model || ''} `, 
        
        // Subtitle forblir slik du ønsket den (uten brand):
        subtitle: `Q: ${quote || '—'} | ${price || '—'}/mnd | ${slug || ''}`,
        media: media
      }
    }
  }
} // Slutt på hele objektet