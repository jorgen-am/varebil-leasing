export default {
    name: 'categoryPage',
    title: 'Kategorisider (SEO)',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Sidetittel (H1)',
        type: 'string',
        description: 'F.eks. "Leasing av Ford varebil"',
      },
      {
        name: 'slug',
        title: 'URL-navn (Slug)',
        type: 'slug',
        options: {
          source: 'title',
          maxLength: 96,
        },
        description: 'Dette MÅ matche mappenavnet i Hugo (f.eks. ford, awd, elektrisk)',
      },
      {
        name: 'description',
        title: 'Meta-beskrivelse',
        type: 'text',
        rows: 3,
        description: 'Vises i Google-søket. Hold det under 160 tegn.',
      },
      {
        name: 'body',
        title: 'Innhold på siden',
        type: 'array',
        of: [{ type: 'block' }],
        description: 'Her skriver du teksten som skal vises øverst på kategorisiden.',
      },
    ],
  }