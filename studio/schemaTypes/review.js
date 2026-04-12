export default {
  name: 'review',
  title: 'Omtaler',
  type: 'document',
  fields: [
    { name: 'author', title: 'Kunde/Navn', type: 'string' },
    { name: 'rating', title: 'Stjerner (1-5)', type: 'number' },
    { name: 'content', title: 'Omtale', type: 'text' },
    { name: 'location', title: 'Sted/Bilmodell', type: 'string' },
    { name: 'image', title: 'Kunde- eller bilbilde', type: 'image' },
    { name: 'date', title: 'Dato', type: 'string' },
    { name: 'reviews', title: 'Antall omtaler', type: 'string' },
    { name: 'answer', title: 'Svar fra eier', type: 'string' },
    { name: 'dataname', title: 'Data Navn', type: 'string' }
  ]
}