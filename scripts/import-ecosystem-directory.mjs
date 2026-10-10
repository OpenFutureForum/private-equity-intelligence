import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
const output = path.join(root, 'data', 'expansions', 'user-supplied-pe-ecosystem-2026.json');
const verifiedOn = '2026-10-10';

if (!input) throw new Error('Pass the source TSV path as the first argument.');

const clean = (value = '') => String(value)
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

const wordCase = (value) => clean(value).split(' ').map((word) => {
  if (!word || word !== word.toLowerCase()) return word;
  if (['cpa', 'llc'].includes(word)) return word.toUpperCase();
  return word[0].toUpperCase() + word.slice(1);
}).join(' ');

const organizationNames = new Map([
  ['citizensprivatebank', 'Citizens Private Bank'],
  ['junipersquare', 'Juniper Square'],
  ['sap', 'SAP'],
  ['volarllc', 'Volar LLC'],
  ['rbc capital markets', 'RBC Capital Markets'],
  ['standish management, llc', 'Standish Management, LLC'],
  ['uscapital', 'US Capital'],
  ['morganstanley', 'Morgan Stanley'],
  ['northsidecap', 'Northside Capital']
]);

const normalizeOrganization = (value) => {
  const cleaned = clean(value);
  return organizationNames.get(cleaned.toLowerCase()) ?? cleaned;
};

const normalizeProfileUrl = (value) => {
  const cleaned = clean(value);
  if (!cleaned) return null;
  const withoutProtocol = cleaned.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  if (!/^linkedin\.com\/in\//i.test(withoutProtocol)) throw new Error(`Unsupported professional profile URL: ${cleaned}`);
  return `https://www.${withoutProtocol}`;
};

const raw = await readFile(path.resolve(input), 'utf8');
const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
const header = lines.shift()?.split('\t').map(clean) ?? [];
if (header.length < 7 || header[0] !== 'Tier' || header[1] !== 'Firm') throw new Error('Unexpected source header.');

const records = lines.map((line, index) => {
  const [tierLabel, organizationValue, firstName, lastName, title, , profileUrl] = line.split('\t');
  const organization = normalizeOrganization(organizationValue);
  const suppliedName = clean(`${wordCase(firstName)} ${wordCase(lastName)}`);
  const professionalProfileUrl = normalizeProfileUrl(profileUrl);
  const name = suppliedName || `Unnamed professional at ${organization}`;
  const tier = Number.parseInt(clean(tierLabel), 10);

  if (!organization || !clean(title) || !Number.isInteger(tier)) throw new Error(`Incomplete source row ${index + 1}.`);

  return {
    sourceRecordNumber: index + 1,
    tier,
    tierLabel: clean(tierLabel),
    organization,
    name,
    suppliedName: suppliedName || null,
    title: clean(title),
    professionalProfileUrl
  };
});

const deduplicated = new Map();
for (const record of records) {
  const key = `${record.name.toLowerCase()}|${record.organization.toLowerCase()}`;
  const existing = deduplicated.get(key);
  if (!existing) {
    deduplicated.set(key, { ...record, sourceRecordNumbers: [record.sourceRecordNumber] });
    continue;
  }
  existing.sourceRecordNumbers.push(record.sourceRecordNumber);
  if (!existing.professionalProfileUrl && record.professionalProfileUrl) existing.professionalProfileUrl = record.professionalProfileUrl;
}

const usedSlugs = new Set();
const people = [...deduplicated.values()].map((record) => {
  const profileStem = record.professionalProfileUrl?.split('/in/')[1] ?? slugify(record.name);
  let slug = `ecosystem-${slugify(profileStem)}`;
  if (usedSlugs.has(slug)) slug = `${slug}-${slugify(record.organization)}`;
  usedSlugs.add(slug);

  return {
    id: `person_${slug.replaceAll('-', '_')}`,
    slug,
    name: record.name,
    profile_scope: ['ecosystem_directory'],
    market_id: null,
    current_firm_id: null,
    current_title: record.title,
    organization: record.organization,
    ecosystem_tier: record.tier,
    ecosystem_tier_label: record.tierLabel,
    professional_profile_url: record.professionalProfileUrl,
    display_name_status: record.suppliedName ? 'supplied' : 'not_supplied',
    verification_status: 'user_supplied_unverified',
    source_record_numbers: record.sourceRecordNumbers,
    summary: `${record.title} at ${record.organization}. This professional record was supplied for the PE ecosystem directory and has not been independently verified by the publisher.`,
    source_ids: ['src_user_supplied_pe_ecosystem_2026'],
    last_verified: verifiedOn
  };
});

const sources = [{
  id: 'src_user_supplied_pe_ecosystem_2026',
  title: 'User-supplied PE ecosystem professional directory',
  publisher: 'Open Future Forum submission',
  url: 'https://github.com/OpenFutureForum/private-equity-intelligence/blob/main/data/expansions/user-supplied-pe-ecosystem-2026.json',
  source_class: 'user_supplied_professional_directory',
  published_date: null,
  accessed_date: verifiedOn,
  supports: ['supplied professional name', 'organization', 'title', 'directory tier', 'professional profile URL'],
  verification_note: 'Imported from a user-supplied list. The publisher has not independently verified each entry.'
}];

if (records.length !== 168) throw new Error(`Expected 168 source rows, found ${records.length}.`);
if (people.length !== 167) throw new Error(`Expected 167 unique people, found ${people.length}.`);
if (new Set(people.map((person) => person.id)).size !== people.length) throw new Error('Duplicate generated person IDs.');

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ people, sources }, null, 2)}\n`);
console.log(`Processed ${records.length} source rows into ${people.length} unique professional profiles.`);
