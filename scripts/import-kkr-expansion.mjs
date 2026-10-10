import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDirectory = process.argv[2] ?? '/private/tmp';
const output = path.join(root, 'data', 'expansions', 'kkr-2026.json');
const verifiedOn = '2026-10-10';

const readPages = async (stem, count) => {
  const pages = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const page = index + 1;
    const document = JSON.parse(await readFile(path.join(cacheDirectory, `${stem}-${page}.json`), 'utf8'));
    return document.results;
  }));
  return pages.flat();
};

const clean = (value = '') => String(value)
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replaceAll('&amp;', '&')
  .replaceAll('&nbsp;', ' ')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/\s+/g, ' ')
  .trim();

const slugify = (value) => clean(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const existingPeople = JSON.parse(await readFile(path.join(root, 'data', 'people.json'), 'utf8'));
const existingNames = new Set(existingPeople.map((person) => person.name.trim().toLowerCase()));
const peopleDirectory = await readPages('kkr-people', 107);

const cityDetails = {
  'New York': { market: 'market_new_york', location: 'New York, New York, United States' },
  'San Francisco': { market: 'market_bay_area', location: 'San Francisco, California, United States' },
  'Menlo Park': { market: 'market_bay_area', location: 'Menlo Park, California, United States' },
  'Boston': { market: 'market_boston', location: 'Boston, Massachusetts, United States' },
  'Los Angeles': { market: 'market_los_angeles', location: 'Los Angeles, California, United States' }
};

const teamOrder = [
  'Private Equity',
  'Capstone',
  'Tech Growth',
  'Health Care Strategic Growth',
  'Global Impact',
  'Credit',
  'Real Estate',
  'Infrastructure',
  'Capital Markets',
  'Energy Real Assets',
  'Real Assets',
  'KKR Solutions',
  'Global Macro and Asset Allocation',
  'Insurance & Strategic Finance',
  'Global Client Solutions',
  'Investor Relations',
  'Executive Officers',
  'Firm Management',
  'Firm Strategy',
  'Global Institute',
  'Business Operations'
];

const teamRank = (person) => {
  const teams = clean(person.team).split(', ');
  const positions = teams.map((team) => teamOrder.indexOf(team)).filter((index) => index >= 0);
  return positions.length ? Math.min(...positions) : teamOrder.length;
};

const eligiblePeople = peopleDirectory
  .map((person) => ({ ...person, name: clean(person.name), title: clean(person.title), team: clean(person.team), city: clean(person.city) }))
  .filter((person) => cityDetails[person.city] && !existingNames.has(person.name.toLowerCase()));

const orderPeople = (a, b) => teamRank(a) - teamRank(b) || a.name.localeCompare(b.name);
const selectedPeople = [
  ...eligiblePeople.filter((person) => person.city !== 'New York').sort(orderPeople),
  ...eligiblePeople.filter((person) => person.city === 'New York').sort(orderPeople)
].slice(0, 364);

const people = selectedPeople.map((person) => {
  const slug = slugify(person.name);
  const details = cityDetails[person.city];
  return {
    id: `person_kkr_${slug.replaceAll('-', '_')}`,
    slug: `kkr-${slug}`,
    name: person.name,
    profile_scope: ['us_atlas'],
    market_id: details.market,
    current_firm_id: 'firm_kkr',
    current_title: person.title,
    location: details.location,
    location_evidence: 'explicit_office_filter',
    summary: `${person.title} on KKR's ${person.team || 'firm'} team. KKR's public directory lists ${person.city} as the office location.`,
    source_ids: ['src_kkr_people'],
    last_verified: verifiedOn
  };
});

const portfolioDirectory = await readPages('kkr-portfolio', 20);
const unitedStatesHeadquarters = /(?:United States|, (?:AL|AZ|CA|CO|CT|DC|FL|GA|IL|IN|KY|MA|MD|MI|MN|MO|NC|NJ|NY|OH|OR|PA|SC|TN|TX|UT|VA|WA|WI))\b/;
const includedAssetClasses = new Set(['Private Equity', 'Tech Growth', 'Health Care Growth', 'Global Impact']);
const selectedInvestments = portfolioDirectory
  .map((company) => ({
    ...company,
    name: clean(company.name),
    hq: clean(company.hq),
    assetClass: clean(company.assetClass),
    industry: clean(company.industry),
    description: clean(company.description),
    url: clean(company.url)
  }))
  .filter((company) => company.region === 'Americas')
  .filter((company) => unitedStatesHeadquarters.test(company.hq))
  .filter((company) => /^\d{4}$/.test(company.yoi))
  .filter((company) => company.assetClass.split(', ').some((assetClass) => includedAssetClasses.has(assetClass)))
  .sort((a, b) => a.name.localeCompare(b.name));

const normalizeWebsite = (url) => {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url.replace(/^http:\/\//, 'https://') : `https://${url}`;
};

const companies = selectedInvestments.map((company) => {
  const slug = slugify(company.name);
  return {
    id: `company_kkr_${slug.replaceAll('-', '_')}`,
    slug: `kkr-${slug}`,
    name: company.name,
    company_type: slugify(company.industry).replaceAll('-', '_'),
    headquarters: company.hq,
    website: normalizeWebsite(company.url),
    description: company.description,
    relationship_archetypes: [company.industry.toLowerCase(), ...company.assetClass.split(', ').map((value) => value.toLowerCase())],
    source_ids: ['src_kkr_portfolio_directory_2026'],
    last_verified: verifiedOn
  };
});

const transactionType = (assetClasses) => {
  if (assetClasses.includes('Global Impact')) return 'impact_investment';
  if (assetClasses.includes('Tech Growth') || assetClasses.includes('Health Care Growth')) return 'growth_investment';
  return 'platform_investment';
};

const deals = selectedInvestments.map((company) => {
  const slug = slugify(company.name);
  const assetClasses = company.assetClass.split(', ');
  return {
    id: `deal_kkr_${slug.replaceAll('-', '_')}_${company.yoi}`,
    slug: `kkr-${slug}-${company.yoi}`,
    title: `KKR investment in ${company.name}`,
    target_company_id: `company_kkr_${slug.replaceAll('-', '_')}`,
    announced_on: company.yoi,
    date_basis: 'investment_year',
    completed_on: null,
    status: 'completed',
    transaction_type: transactionType(assetClasses),
    buyer_firm_ids: ['firm_kkr'],
    seller_firm_ids: [],
    buyer_names: [],
    seller_names: [],
    enterprise_value: null,
    investment_thesis: company.description,
    provider_roles: [],
    people_roles: [],
    evidence_tier: 'official_portfolio_record',
    source_ids: ['src_kkr_portfolio_directory_2026'],
    last_verified: verifiedOn
  };
});

const sources = [{
  id: 'src_kkr_portfolio_directory_2026',
  title: 'Portfolio',
  publisher: 'KKR',
  url: 'https://www.kkr.com/invest/portfolio',
  source_class: 'official_portfolio_directory',
  published_date: null,
  accessed_date: verifiedOn,
  supports: ['portfolio company name', 'headquarters', 'asset class', 'industry', 'year of investment', 'company description']
}];

if (people.length !== 364) throw new Error(`Expected 364 people, found ${people.length}`);
if (companies.length !== 86 || deals.length !== 86) throw new Error(`Expected 86 portfolio investments, found ${deals.length}`);
if (new Set(people.map((person) => person.id)).size !== people.length) throw new Error('Duplicate generated person IDs');
if (new Set(companies.map((company) => company.id)).size !== companies.length) throw new Error('Duplicate generated company IDs');

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ people, companies, deals, sources }, null, 2)}\n`);
console.log(`Wrote ${people.length} people and ${deals.length} deals to ${output}`);

