export default {
  name: 'service',
  title: 'Tjenester',
  type: 'document',
  fields: [
    { name: 'title', title: 'Tittel', type: 'string' },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' } },
    { name: 'body', title: 'Beskrivelse (Rik tekst)', type: 'array', of: [{ type: 'block' }] },
    { name: 'image', title: 'Bilde', type: 'image', options: { hotspot: true } },
    { name: 'alt', title: 'Alt-tekst bilde', type: 'string' },
    { name: 'email', title: 'E-post kontakt', type: 'string' },
    { name: 'salesman', title: 'Selger/Kontaktperson', type: 'string' },
    { name: 'metatitle', title: 'SEO Tittel', type: 'string' },
    { name: 'metadescription', title: 'SEO Beskrivelse', type: 'text' }
  ]
}