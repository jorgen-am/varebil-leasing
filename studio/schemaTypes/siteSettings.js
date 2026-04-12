export default {
    name: 'siteSettings',
    title: 'Innstillinger',
    type: 'document',
    fields: [
      { name: 'title', title: 'Sidenavn', type: 'string' },
      { name: 'logo', title: 'Logo', type: 'image' },
      { name: 'phone', title: 'Telefonnummer', type: 'string' },
      {
        name: 'mainNav',
        title: 'Hovedmeny',
        type: 'array',
        of: [
          {
            type: 'object',
            fields: [
              { name: 'label', title: 'Navn i meny', type: 'string' },
              { name: 'link', title: 'Lenke (f.eks /biler)', type: 'string' }
            ]
          }
        ]
      }
    ]
  }