export default {
    name: 'page',
    title: 'Sider',
    type: 'document',
    fields: [
      { name: 'title', title: 'Sidetittel', type: 'string' },
      { name: 'slug', title: 'URL', type: 'slug', options: { source: 'title' } },
      { name: 'heroTitle', title: 'Hovedoverskrift', type: 'string' },
      { name: 'heroText', title: 'Intro-tekst', type: 'text' },
      { name: 'content', title: 'Sideinnhold', type: 'array', of: [{ type: 'block' }] }
    ]
  }