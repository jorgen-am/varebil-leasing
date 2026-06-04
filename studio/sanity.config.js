import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

// IMPORTER DEN NYE CSS-FILEN HER:
import './studio-custom.css';

const myStructure = (S) =>
  S.list()
    .title('Innhold')
    .items([

      // Forside Singleton
      S.listItem()
        .title('Forside')
        .child(S.document().schemaType('pageHome').documentId('pageHome')),
      
      // Innstillinger Singleton
      S.listItem()
        .title('Innstillinger')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),

      S.divider(),
      
      S.listItem()
        .title('Biler')
        .child(
          S.documentTypeList('car')
            .title('Alle biler')
            .child((documentId) =>
              S.document()
                .documentId(documentId)
                .schemaType('car')
            )
        ),
              
      // Legger til resten av skjematypene automatisk
      ...S.documentTypeListItems().filter(
        // (listItem) => !['car'].includes(listItem.getId())
        (listItem) => !['car', 'pageHome', 'siteSettings'].includes(listItem.getId())
      ),
    ])

export default defineConfig({
  name: 'default',
  title: 'Varebil Leasing',
  projectId: '1lzskaub',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: myStructure,
      // Denne linjen under her kan hjelpe på enkelte versjoner for å gi mer plass
      defaultDocumentNode: (S, {schemaType}) => {
        return S.document().views([
          S.view.form(),
        ])
      }
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.innerHTML = `
    /* 1. NÅR LISTEN ER ALENE (INGEN DOKUMENT ÅPENT) */
    /* Hvis listen er det siste panelet, la den være bred */
    [data-ui="DocumentListPane"]:last-child {
      min-width: 650px !important;
      flex: 1 1 650px !important;
    }

    /* 2. NÅR ET DOKUMENT ER ÅPNET VED SIDEN AV */
    /* Hvis listen IKKE er det siste panelet lenger, gå tilbake til standard bredde */
    [data-ui="DocumentListPane"]:not(:last-child) {
      min-width: 320px !important;
      max-width: 350px !important;
      flex: 0 0 350px !important;
    }

    /* Gjør teksten pen uansett bredde */
    [data-testid="document-preview__subtitle"] {
      white-space: nowrap !important;
      text-overflow: ellipsis !important;
      overflow: hidden !important;
    }
    // Krymp tekstfelter SEO i høyden
    .fQmvnU[data-as="textarea"],
    .eiustQ[data-as="textarea"] {height: 70px;}
  `
  document.head.appendChild(style)
}