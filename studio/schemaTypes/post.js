export default {
  name: 'post',
  title: 'Blogginnlegg',
  type: 'document',
  fields: [
    { name: 'title', title: 'Tittel', type: 'string' },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' } },
    { name: 'excerpt', title: 'Kort sammendrag', type: 'text' },
    { name: 'body', title: 'Hovedtekst', type: 'array', of: [{ type: 'block' }] },
    { name: 'mainImage', title: 'Hovedbilde', type: 'image' },
    { name: 'alt', title: 'Alt-tekst bilde', type: 'string' },
    { name: 'category', title: 'Kategori', type: 'string' },
    { name: 'readtime', title: 'Lesetid', type: 'string' },
    { name: 'tagone', title: 'Tag 1', type: 'string' },
    { name: 'tagtwo', title: 'Tag 2', type: 'string' },
    { name: 'campaignlink', title: 'Kampanjelenke', type: 'string' },
    { name: 'ctatext', title: 'CTA Tekst', type: 'string' },
    { name: 'ctaimage', title: 'CTA Bilde', type: 'image' },
    { name: 'shoform', title: 'Vis skjema', type: 'boolean' },
    { name: 'shoreviews', title: 'Vis omtaler', type: 'boolean' },
    { name: 'landing', title: 'Landingsside', type: 'boolean' },
    { name: 'sticky', title: 'Sticky innlegg', type: 'boolean' },
    { name: 'ogtitle', title: 'OG Tittel', type: 'string' },
    { name: 'ogdescription', title: 'OG Beskrivelse', type: 'string' },
    { name: 'metatitle', title: 'SEO Tittel', type: 'string' },
    { name: 'metadescription', title: 'SEO Beskrivelse', type: 'text' }
  ]
}