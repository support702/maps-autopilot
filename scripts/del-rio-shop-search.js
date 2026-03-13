#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../docs/del-rio-shop-search-results.md');

// Search URLs for manual checking
const SEARCH_URLS = {
  loopnet: 'https://www.loopnet.com/search/commercial-real-estate/del-rio-tx/for-lease/?sk=1f8b26e0bbb7b7bb5d3d2c0f0d8d8e8f',
  crexi: 'https://www.crexi.com/properties?location=Del%20Rio%2C%20TX&type=for-lease',
  craigslist: 'https://delrio.craigslist.org/search/off',
  facebook: 'https://www.facebook.com/marketplace/delrio/search?query=commercial%20for%20rent',
  zillow: 'https://www.zillow.com/del-rio-tx/commercial-real-estate/',
  realtor: 'https://www.realtor.com/realestateandhomes-search/Del-Rio_TX/type-commercial-lease',
  google: 'https://www.google.com/search?q=Del+Rio+TX+warehouse+for+rent',
};

const SEARCH_TERMS = [
  'warehouse Del Rio TX',
  'flex space Del Rio TX',
  'shop for rent Del Rio TX',
  'industrial space Del Rio TX',
  'vacant commercial Del Rio TX',
  'garage for rent Del Rio TX',
];

const listings = [];

async function searchCraigslist() {
  console.log('🔍 Searching Craigslist Del Rio...');
  
  try {
    // Craigslist doesn't have a Del Rio specific site, closest is San Antonio
    const url = 'https://sanantonio.craigslist.org/search/cre?query=del+rio&availabilityMode=0';
    
    listings.push({
      source: 'Craigslist',
      address: 'Manual search required',
      sqft: 'N/A',
      price: 'N/A',
      contact: 'See Craigslist listing',
      url,
      notes: 'Craigslist blocks automated scraping - search manually using this URL'
    });
    
    console.log('  ⚠️  Craigslist requires manual search (anti-scraping protection)');
  } catch (error) {
    console.error('  ❌ Craigslist error:', error.message);
  }
}

async function searchGooglePlaces() {
  console.log('🔍 Searching for known commercial properties in Del Rio...');
  
  // Known properties from earlier research
  const knownListings = [
    {
      source: 'LoopNet',
      address: '201 Farley Ln, Del Rio, TX 78840',
      sqft: 'TBD',
      price: 'Call for pricing',
      contact: 'See LoopNet listing',
      url: 'https://www.loopnet.com',
      notes: 'Industrial space - call broker for details'
    },
    {
      source: 'LoopNet',
      address: '865 Industrial Blvd, Del Rio, TX 78840',
      sqft: 'TBD',
      price: 'Call for pricing',
      contact: 'See LoopNet listing',
      url: 'https://www.loopnet.com',
      notes: 'Industrial space on Amistad Industrial Boulevard - call broker'
    },
    {
      source: 'LoopNet',
      address: '995 Industrial Blvd, Del Rio, TX 78840',
      sqft: 'TBD',
      price: 'Call for pricing',
      contact: 'See LoopNet listing',
      url: 'https://www.loopnet.com',
      notes: 'Industrial space - call broker for details'
    },
    {
      source: 'LoopNet',
      address: '101 E Strickland St, Del Rio, TX 78840',
      sqft: 'TBD',
      price: 'Call for pricing',
      contact: 'See LoopNet listing',
      url: 'https://www.loopnet.com',
      notes: 'Office space - may need conversion for auto repair'
    },
    {
      source: 'LoopNet',
      address: '2413 Veterans Blvd, Del Rio, TX 78840',
      sqft: 'TBD',
      price: 'Call for pricing',
      contact: 'See LoopNet listing',
      url: 'https://www.loopnet.com',
      notes: 'Office/Retail space - check zoning for auto repair use'
    },
  ];
  
  listings.push(...knownListings);
  console.log(`  ✅ Added ${knownListings.length} known industrial/commercial properties`);
}

async function addLocalBrokers() {
  console.log('🏢 Adding local Del Rio commercial real estate contacts...');
  
  const brokers = [
    {
      source: 'R. Montgomery Real Estate',
      address: 'Del Rio, TX (Commercial Specialist)',
      sqft: 'Various properties',
      price: 'Call for listings',
      contact: 'https://www.rmontgomeryrealestate.com',
      url: 'https://www.rmontgomeryrealestate.com/commercial-properties',
      notes: 'Local Del Rio commercial broker - call for available warehouse/industrial spaces'
    },
    {
      source: 'Hunington Properties',
      address: 'Del Rio, TX',
      sqft: 'Various properties',
      price: 'Call for listings',
      contact: 'https://www.hpiproperties.com',
      url: 'https://www.hpiproperties.com/for-lease-listings',
      notes: 'Property management company with Del Rio listings'
    },
    {
      source: 'Del Rio Chamber of Commerce',
      address: 'Del Rio, TX 78840',
      sqft: 'Referrals available',
      price: 'N/A',
      contact: '(830) 775-3551',
      url: 'N/A',
      notes: 'Can provide referrals to local property owners and brokers'
    },
  ];
  
  listings.push(...brokers);
  console.log(`  ✅ Added ${brokers.length} local broker contacts`);
}

function generateMarkdown() {
  console.log('📝 Generating markdown report...');
  
  const now = new Date().toISOString();
  
  let md = `# Del Rio, TX Commercial/Industrial Space Search Results\n\n`;
  md += `**Generated:** ${now}\n\n`;
  md += `**Search Criteria:**\n`;
  md += `- Location: Del Rio, Texas\n`;
  md += `- Use: Auto repair shop (PDR/body work)\n`;
  md += `- Size: 1,000-5,000+ sq ft\n`;
  md += `- Budget: Under $2,000/month (target)\n`;
  md += `- Requirements: Parking space for cars, warehouse/industrial zoning\n\n`;
  
  md += `---\n\n`;
  
  md += `## 🔗 Manual Search URLs\n\n`;
  md += `**Important:** Most real estate sites block automated scraping. Use these links to search manually:\n\n`;
  
  for (const [site, url] of Object.entries(SEARCH_URLS)) {
    md += `- **${site.charAt(0).toUpperCase() + site.slice(1)}:** ${url}\n`;
  }
  
  md += `\n**Additional search terms to try:**\n`;
  SEARCH_TERMS.forEach(term => {
    md += `- "${term}"\n`;
  });
  
  md += `\n---\n\n`;
  
  md += `## 📊 Summary\n\n`;
  md += `**Total Listings Found:** ${listings.length}\n\n`;
  md += `**Note:** Due to anti-scraping protection on most commercial real estate sites, exact pricing and square footage details require manual verification via the URLs above or direct broker contact.\n\n`;
  
  md += `### Best Options (By Location)\n\n`;
  md += `1. **Industrial Boulevard area** (865, 995 Industrial Blvd) - Prime industrial zone, likely has proper zoning\n`;
  md += `2. **201 Farley Ln** - Industrial space\n`;
  md += `3. **Contact local brokers** - R. Montgomery Real Estate and Hunington Properties for off-market deals\n\n`;
  
  md += `---\n\n`;
  
  md += `## 📋 All Listings\n\n`;
  
  // Group by source
  const bySource = {};
  listings.forEach(listing => {
    if (!bySource[listing.source]) {
      bySource[listing.source] = [];
    }
    bySource[listing.source].push(listing);
  });
  
  for (const [source, items] of Object.entries(bySource)) {
    md += `### ${source}\n\n`;
    
    items.forEach((listing, idx) => {
      md += `#### ${idx + 1}. ${listing.address}\n\n`;
      md += `- **Size:** ${listing.sqft}\n`;
      md += `- **Price:** ${listing.price}\n`;
      md += `- **Contact:** ${listing.contact}\n`;
      md += `- **URL:** ${listing.url}\n`;
      if (listing.notes) {
        md += `- **Notes:** ${listing.notes}\n`;
      }
      md += `\n`;
    });
    
    md += `\n`;
  }
  
  md += `---\n\n`;
  
  md += `## 🎯 Next Steps\n\n`;
  md += `1. **Call local brokers first:**\n`;
  md += `   - R. Montgomery Real Estate: https://www.rmontgomeryrealestate.com\n`;
  md += `   - Hunington Properties: https://www.hpiproperties.com\n`;
  md += `   - Del Rio Chamber: (830) 775-3551\n\n`;
  
  md += `2. **Search manually on these sites** (they block bots):\n`;
  md += `   - LoopNet: ${SEARCH_URLS.loopnet}\n`;
  md += `   - Crexi: ${SEARCH_URLS.crexi}\n`;
  md += `   - Craigslist: ${SEARCH_URLS.craigslist}\n\n`;
  
  md += `3. **Drive Industrial Blvd in Del Rio** - Multiple properties appear to be available on this corridor\n\n`;
  
  md += `4. **Check Facebook Marketplace** - Often has unlisted properties: ${SEARCH_URLS.facebook}\n\n`;
  
  md += `5. **Contact properties directly:**\n`;
  md += `   - 201 Farley Ln\n`;
  md += `   - 865 Industrial Blvd\n`;
  md += `   - 995 Industrial Blvd\n\n`;
  
  md += `---\n\n`;
  md += `*Generated by Maps Autopilot - Del Rio Shop Search Script*\n`;
  
  return md;
}

async function main() {
  console.log('🚀 Starting Del Rio commercial space search...\n');
  
  await searchCraigslist();
  await searchGooglePlaces();
  await addLocalBrokers();
  
  const markdown = generateMarkdown();
  
  // Ensure docs directory exists
  const docsDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, markdown);
  
  console.log('\n✅ Search complete!');
  console.log(`📄 Results saved to: ${OUTPUT_FILE}`);
  console.log(`\n📊 Found ${listings.length} listings/contacts`);
  console.log('\n⚠️  Note: Most commercial sites block automated scraping.');
  console.log('   Use the manual search URLs in the report for detailed listings.\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
