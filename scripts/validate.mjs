import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async (name) => JSON.parse(await readFile(path.join(root, 'data', `${name}.json`), 'utf8'));
const [companies, firms, people, providers, deals, sources, framework, markets] = await Promise.all([
  load('companies'), load('firms'), load('people'), load('providers'), load('deals'), load('sources'), load('framework'), load('markets')
]);

const errors = [];
const fail = (message) => errors.push(message);
const assert = (condition, message) => { if (!condition) fail(message); };
const index = (rows) => new Set(rows.map((row) => row.id));
const companyIds = index(companies);
const firmIds = index(firms);
const peopleIds = index(people);
const providerIds = index(providers);
const sourceIds = index(sources);
const marketIds = index(markets);
const datePattern = /^\d{4}(?:-\d{2})?(?:-\d{2})?$/;

for (const [name, rows] of Object.entries({ companies, firms, people, providers, deals, sources, markets })) {
  assert(Array.isArray(rows), `${name} must be an array`);
  const ids = rows.map((row) => row.id);
  const slugs = rows.filter((row) => row.slug).map((row) => row.slug);
  assert(ids.length === new Set(ids).size, `${name} contains duplicate IDs`);
  assert(slugs.length === new Set(slugs).size, `${name} contains duplicate slugs`);
  for (const row of rows) {
    assert(row.id && row.id.startsWith(name === 'people' ? 'person_' : name === 'companies' ? 'company_' : name === 'providers' ? 'provider_' : name === 'firms' ? 'firm_' : name === 'deals' ? 'deal_' : name === 'markets' ? 'market_' : 'src_'), `${name}: invalid ID ${row.id}`);
    assert(row.name || row.title, `${name}/${row.id}: missing name or title`);
    if (row.last_verified) assert(datePattern.test(row.last_verified), `${name}/${row.id}: invalid last_verified`);
    for (const sourceId of row.source_ids ?? []) assert(sourceIds.has(sourceId), `${name}/${row.id}: unknown source ${sourceId}`);
  }
}

for (const source of sources) {
  assert(/^https:\/\//.test(source.url), `sources/${source.id}: URL must use HTTPS`);
  assert(datePattern.test(source.accessed_date), `sources/${source.id}: invalid access date`);
  assert(source.published_date === null || datePattern.test(source.published_date), `sources/${source.id}: invalid published date`);
  assert(Array.isArray(source.supports) && source.supports.length > 0, `sources/${source.id}: supports must not be empty`);
}

const allowedLabels = new Set(['named_deal_team', 'named_adviser', 'official_transaction_spokesperson', 'relevant_professional_not_attributed', 'unknown']);
for (const deal of deals) {
  assert(companyIds.has(deal.target_company_id), `deals/${deal.id}: unknown target company`);
  assert(deal.target_company_id !== 'company_open_future_forum', `deals/${deal.id}: Open Future Forum must remain illustrative-only`);
  assert(datePattern.test(deal.announced_on), `deals/${deal.id}: invalid announcement date`);
  assert(deal.completed_on === null || datePattern.test(deal.completed_on), `deals/${deal.id}: invalid completion date`);
  assert(['completed','announced','cancelled'].includes(deal.status), `deals/${deal.id}: invalid status`);
  assert(Array.isArray(deal.source_ids) && deal.source_ids.length > 0, `deals/${deal.id}: at least one source is required`);
  for (const id of [...deal.buyer_firm_ids, ...deal.seller_firm_ids]) assert(firmIds.has(id), `deals/${deal.id}: unknown firm ${id}`);
  for (const role of deal.provider_roles) {
    assert(providerIds.has(role.provider_id), `deals/${deal.id}: unknown provider ${role.provider_id}`);
    assert(sourceIds.has(role.source_id), `deals/${deal.id}: unknown provider-role source ${role.source_id}`);
    assert(deal.source_ids.includes(role.source_id), `deals/${deal.id}: provider-role source must be included on deal`);
    assert(role.role && role.side, `deals/${deal.id}: incomplete provider role`);
  }
  for (const role of deal.people_roles) {
    assert(peopleIds.has(role.person_id), `deals/${deal.id}: unknown person ${role.person_id}`);
    assert(allowedLabels.has(role.label), `deals/${deal.id}: invalid people label ${role.label}`);
    assert(['named_deal_team','named_adviser','official_transaction_spokesperson'].includes(role.label), `deals/${deal.id}: unconfirmed people role cannot be published as participation`);
    assert(sourceIds.has(role.source_id), `deals/${deal.id}: unknown people-role source ${role.source_id}`);
    assert(deal.source_ids.includes(role.source_id), `deals/${deal.id}: people-role source must be included on deal`);
    assert(role.attribution?.length > 15, `deals/${deal.id}: people role needs explicit attribution language`);
  }
}

const allowedLocationEvidence = new Set(['explicit_person_bio','explicit_office_filter','firm_office_association']);
for (const person of people) {
  assert(Array.isArray(person.profile_scope) && person.profile_scope.length > 0, `people/${person.id}: missing profile scope`);
  assert(person.profile_scope.every((scope) => ['us_atlas','transaction_attribution'].includes(scope)), `people/${person.id}: invalid profile scope`);
  if (person.current_firm_id) assert(firmIds.has(person.current_firm_id), `people/${person.id}: unknown current firm`);
  if (person.profile_scope.includes('us_atlas')) {
    assert(person.market_id && marketIds.has(person.market_id), `people/${person.id}: U.S. atlas profile needs a valid market`);
    assert(person.location, `people/${person.id}: U.S. atlas profile needs a location statement`);
    assert(allowedLocationEvidence.has(person.location_evidence), `people/${person.id}: invalid location evidence`);
    if (person.location_evidence === 'firm_office_association') assert(/associat|not asserted/i.test(person.location), `people/${person.id}: firm-office location must be visibly qualified`);
    assert(person.current_firm_id && person.current_title, `people/${person.id}: U.S. atlas profile needs a verified current role`);
  }
  if (person.profile_scope.includes('transaction_attribution')) {
    assert(deals.some((d) => d.people_roles.some((r) => r.person_id === person.id)), `people/${person.id}: transaction profile is not linked to a deal`);
  }
}

for (const market of markets) {
  assert(market.name && market.region && market.description, `markets/${market.id}: missing required display fields`);
  assert(Number.isFinite(market.coordinates?.longitude) && market.coordinates.longitude >= -180 && market.coordinates.longitude <= 180, `markets/${market.id}: invalid longitude`);
  assert(Number.isFinite(market.coordinates?.latitude) && market.coordinates.latitude >= -90 && market.coordinates.latitude <= 90, `markets/${market.id}: invalid latitude`);
  assert(people.some((person) => person.market_id === market.id), `markets/${market.id}: no current professional profiles`);
}

for (const firm of firms) {
  for (const marketId of firm.us_market_ids ?? []) assert(marketIds.has(marketId), `firms/${firm.id}: unknown U.S. market ${marketId}`);
}

for (const provider of providers) {
  assert(provider.evidence_basis === 'publicly_named_transaction_role', `providers/${provider.id}: invalid evidence basis`);
  assert(deals.some((d) => d.provider_roles.some((r) => r.provider_id === provider.id)), `providers/${provider.id}: no documented engagement`);
}

assert(framework.scoring_status === 'framework_only', 'framework: scoring must remain disabled in National Edition');
assert(Array.isArray(framework.dimensions) && framework.dimensions.length >= 10, 'framework: expected at least ten dimensions');
assert(framework.dimensions.every((d) => d.definition && d.evidence_prompts?.length >= 3), 'framework: every dimension needs a definition and three evidence prompts');

const raw = JSON.stringify({ companies, firms, people, providers, deals, sources, framework, markets }).toLowerCase();
for (const forbidden of ['personal_email','home_address','private_phone','date_of_birth','family_details','password']) {
  assert(!raw.includes(forbidden), `privacy: forbidden field or content ${forbidden}`);
}
assert(!/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(raw), 'privacy: dataset must not contain email addresses');
assert(!/[\u2013\u2014]/.test(raw), 'editorial: dataset must not contain em dashes or en dashes');

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${deals.length} deals, ${people.length} people, ${providers.length} providers, ${firms.length} firms, ${markets.length} U.S. markets and ${sources.length} sources.`);
