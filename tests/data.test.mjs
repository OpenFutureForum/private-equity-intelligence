import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = async (name, folder = 'data') => JSON.parse(await readFile(new URL(`../${folder}/${name}.json`, import.meta.url), 'utf8'));

test('Foundation Edition has meaningful depth', async () => {
  const [deals, people, providers, sources] = await Promise.all([load('deals'), load('people'), load('providers'), load('sources')]);
  assert.ok(deals.length >= 10);
  assert.ok(people.length >= 25);
  assert.ok(providers.length >= 20);
  assert.ok(sources.length >= 25);
  assert.ok(deals.reduce((n, d) => n + d.provider_roles.length, 0) >= 25);
  assert.ok(deals.reduce((n, d) => n + d.people_roles.length, 0) >= 15);
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
  assert.ok(graph.nodes.length >= 75);
  assert.ok(graph.edges.length >= 50);
  assert.equal(graph.edges.every((edge) => Array.isArray(edge.source_ids) && edge.source_ids.length > 0), true);
});
