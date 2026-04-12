import car from './car'
import post from './post'
import service from './service'
import review from './review'
import page from './page'
import siteSettings from './siteSettings'
import pageHome from './pageHome'
import categoryPage from './categoryPage' // 1. Lagt til importen her

// --- ÉN SAMLET LISTE FOR ALLE SKJEMAER ---
export const schemaTypes = [
  car, 
  post, 
  service, 
  review, 
  page, 
  siteSettings, 
  pageHome,
  categoryPage // 2. Lagt til den nye typen her
]