/**
 * Document Categorization
 * Maps companies to business categories
 * Based on generic folder structure for years 2000-2025+
 */

export interface CategoryInfo {
  name: string;
  folder: string;
  companies: string[];
}

export const CATEGORIES: Record<string, CategoryInfo> = {
  'Finanzen': {
    name: 'Finanzen',
    folder: '01_Finanzen',
    companies: [
      'Sparkasse', 'Volksbank', 'Postbank', 'Commerzbank',
      'Deutsche Bank', 'PayPal', 'N26', 'ING', 'DKB', 'KfW', 
      'KfW Bankengruppe', 'Santander', 'Targobank', 'Comdirect'
    ]
  },
  'Beruf': {
    name: 'Beruf & Karriere',
    folder: '02_Beruf_Karriere',
    companies: [] // Meist durch AI erkannt (Arbeitgeber-spezifisch)
  },
  'Gesundheit': {
    name: 'Gesundheit',
    folder: '03_Gesundheit',
    companies: [
      'Techniker Krankenkasse', 'TK', 'AOK', 'Barmer', 'DAK',
      'IKK', 'KKH', 'BKK', 'HEK', 'SBK'
    ]
  },
  'Versicherung': {
    name: 'Versicherungen',
    folder: '04_Versicherungen',
    companies: [
      'Allianz', 'AXA', 'Generali', 'HUK-Coburg', 'ERGO', 'Gothaer',
      'R+V Versicherung', 'VHV', 'Debeka', 'Signal Iduna',
      'Württembergische', 'LVM', 'Provinzial', 'Cosmos', 'DEVK'
    ]
  },
  'Wohnen': {
    name: 'Wohnen',
    folder: '05_Wohnen',
    companies: [
      'Vonovia', 'Deutsche Wohnen', 'LEG', 'GWG', 'Stadtwerke',
      'Vattenfall', 'E.ON', 'EnBW', 'RWE', 'Gasag', 'Veolia'
    ]
  },
  'Telekommunikation': {
    name: 'Telekommunikation',
    folder: '06_Telekommunikation',
    companies: [
      'Vodafone', 'Telekom', 'O2', 'Telefónica', '1&1', 'Freenet',
      'Congstar', 'Mobilcom', 'Klarmobil', 'Unitymedia', 'Pyur'
    ]
  },
  'Mobilität': {
    name: 'Mobilität',
    folder: '07_Mobilitaet',
    companies: [
      'ADAC', 'TÜV', 'DEKRA', 'ATU', 'BMW', 'Mercedes', 'VW', 'Audi',
      'Deutsche Bahn', 'BVG', 'MVG', 'VRS', 'VRR', 'Car2Go', 'Miles'
    ]
  },
  'Reisen': {
    name: 'Reisen',
    folder: '08_Reisen',
    companies: [
      'Lufthansa', 'Ryanair', 'Eurowings', 'Booking.com', 'Airbnb',
      'Hotels.com', 'Expedia', 'TUI', 'DER Touristik'
    ]
  },
  'Behörden': {
    name: 'Behörden',
    folder: '09_Behoerden',
    companies: [
      'Finanzamt', 'Bürgeramt', 'Standesamt', 'Kraftfahrzeugzulassung',
      'Bundeszentralamt', 'Landesamt', 'Stadtverwaltung', 'Gemeinde'
    ]
  },
  'Steuern': {
    name: 'Steuern',
    folder: '10_Steuern',
    companies: [
      'Finanzamt', 'Steuerberater', 'Lohnsteuerhilfeverein',
      'ELSTER', 'Bundeszentralamt für Steuern'
    ]
  },
  'Soziales': {
    name: 'Soziales & Familie',
    folder: '11_Soziales',
    companies: [
      'Kindergarten', 'Schule', 'Jugendamt', 'Familienkasse',
      'Elterngeldstelle', 'Caritas', 'Diakonie', 'DRK', 'AWO'
    ]
  },
  'Sonstiges': {
    name: 'Sonstiges',
    folder: '99_Sonstiges',
    companies: [
      'Amazon', 'eBay', 'Otto', 'Zalando', 'DHL', 'Deutsche Post',
      'Hermes', 'UPS', 'FedEx', 'DPD', 'GLS'
    ]
  }
};

/**
 * Get category for a company name
 */
export function getCategoryForCompany(companyName: string): CategoryInfo | null {
  for (const category of Object.values(CATEGORIES)) {
    for (const company of category.companies) {
      if (companyName.includes(company) || company.includes(companyName)) {
        return category;
      }
    }
  }
  return null;
}

/**
 * Get all available categories
 */
export function getAllCategories(): CategoryInfo[] {
  return Object.values(CATEGORIES);
}

/**
 * Find category by folder name
 */
export function getCategoryByFolder(folder: string): CategoryInfo | null {
  for (const category of Object.values(CATEGORIES)) {
    if (category.folder === folder) {
      return category;
    }
  }
  return null;
}
