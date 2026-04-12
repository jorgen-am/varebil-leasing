export default {
    name: 'pageHome',
    title: 'Forside',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Internt navn',
        type: 'string',
        initialValue: 'Hovedforside',
        readOnly: true,
      },
      {
        name: 'hero',
        title: 'Hero Seksjon',
        type: 'object',
        fields: [
          { name: 'title', title: 'Overskrift', type: 'string' },
          { name: 'content', title: 'HTML / Brødtekst', type: 'array', of: [{ type: 'block' }] },
        ],
      },
      {
        name: 'instagramCode',
        title: 'Instagram HTML-kode',
        description: 'Lim inn koden fra ekstern leverandør her',
        type: 'text',
      },
      {
        name: 'footerText',
        title: 'Kort om oss (Footer)',
        type: 'text',
      }
    ],
  }