import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadData } from '../scripts/data.mjs';

const load = async (name, folder = 'data') => folder === 'data'
  ? loadData(name)
  : JSON.parse(await readFile(new URL(`../${folder}/${name}.json`, import.meta.url), 'utf8'));

test('National Edition has meaningful depth', async () => {
  const [deals, people, providers, sources, markets] = await Promise.all([load('deals'), load('people'), load('providers'), load('sources'), load('markets')]);
  assert.ok(deals.length >= 100);
  assert.ok(people.length >= 667);
  assert.ok(providers.length >= 31);
  assert.ok(sources.length >= 80);
  assert.equal(markets.length, 10);
  assert.equal(people.filter((person) => person.profile_scope.includes('us_atlas')).length, 476);
  assert.equal(people.filter((person) => person.profile_scope.includes('ecosystem_directory')).length, 167);
  assert.equal(markets.every((market) => people.some((person) => person.market_id === market.id)), true);
  assert.ok(deals.reduce((n, d) => n + d.provider_roles.length, 0) >= 35);
  assert.ok(deals.reduce((n, d) => n + d.people_roles.length, 0) >= 20);
});

test('user-supplied ecosystem profiles preserve their evidence boundary', async () => {
  const people = await load('people');
  const ecosystemPeople = people.filter((person) => person.profile_scope.includes('ecosystem_directory'));
  assert.equal(ecosystemPeople.length, 167);
  assert.equal(ecosystemPeople.every((person) => person.organization && person.current_title), true);
  assert.equal(ecosystemPeople.every((person) => person.verification_status === 'user_supplied_unverified'), true);
  assert.equal(ecosystemPeople.every((person) => !person.market_id && !person.location), true);
  assert.equal(ecosystemPeople.filter((person) => person.professional_profile_url).length, 145);
});

test('atlas counts reconcile to its market records', async () => {
  const [people, firms, markets] = await Promise.all([load('people'), load('firms'), load('markets')]);
  const atlasPeople = people.filter((person) => person.profile_scope.includes('us_atlas'));
  const profileTotal = markets.reduce((total, market) => total + atlasPeople.filter((person) => person.market_id === market.id).length, 0);
  const atlasFirms = firms.filter((firm) => firm.us_market_ids?.length);
  const firmMarketAssociations = markets.reduce((total, market) => total + firms.filter((firm) => firm.us_market_ids?.includes(market.id)).length, 0);

  assert.equal(profileTotal, atlasPeople.length);
  assert.equal(atlasPeople.filter((person) => ['explicit_person_bio', 'explicit_office_filter'].includes(person.location_evidence)).length, 450);
  assert.equal(atlasPeople.filter((person) => person.location_evidence === 'firm_office_association').length, 26);
  assert.equal(atlasFirms.length, 18);
  assert.equal(firmMarketAssociations, 25);
  assert.equal(markets.every((market) => Number.isFinite(market.coordinates.longitude) && Number.isFinite(market.coordinates.latitude)), true);
});

test('portfolio records preserve their narrower evidence boundary', async () => {
  const deals = await load('deals');
  const portfolioRecords = deals.filter((deal) => deal.evidence_tier === 'official_portfolio_record');
  assert.equal(portfolioRecords.length, 86);
  assert.equal(portfolioRecords.every((deal) => deal.date_basis === 'investment_year'), true);
  assert.equal(portfolioRecords.every((deal) => deal.people_roles.length === 0 && deal.provider_roles.length === 0), true);
});

test('every confirmed person relationship has explicit source attribution', async () => {
  const deals = await load('deals');
  for (const deal of deals) for (const role of deal.people_roles) {
    assert.match(role.label, /^(named_deal_team|named_adviser|official_transaction_spokesperson)$/);
    assert.ok(deal.source_ids.includes(role.source_id));
    assert.ok(role.attribution.length > 15);
  }
});

test('Open Future Forum remains illustrative and has no transaction', async () => {
  const [companies, deals] = await Promise.all([load('companies'), load('deals')]);
  const off = companies.find((company) => company.id === 'company_open_future_forum');
  assert.equal(off.illustrative_only, true);
  assert.equal(deals.some((deal) => deal.target_company_id === off.id), false);
});

test('generated graph preserves source IDs on every edge', async () => {
  const graph = await load('knowledge-graph', 'docs/data');
  assert.ok(graph.nodes.length >= 907);
  assert.ok(graph.edges.length >= 775);
  assert.equal(graph.edges.every((edge) => Array.isArray(edge.source_ids) && edge.source_ids.length > 0), true);
});
