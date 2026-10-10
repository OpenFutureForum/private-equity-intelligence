import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

const file = (name) => new URL(`../docs/${name}`, import.meta.url);

test('essential pages and discovery files are generated', async () => {
  for (const name of ['index.html','deals/index.html','atlas/index.html','atlas/new-york/index.html','people/index.html','providers/index.html','depth/index.html','methodology/index.html','data/markets.json','data/markets.csv','data/research-program.json','sitemap.xml','robots.txt','llms.txt','.nojekyll']) {
    await assert.doesNotReject(access(file(name)));
  }
});

test('deep research program contains exactly 50 records and preserves the threshold', async () => {
  const program = JSON.parse(await readFile(file('data/research-program.json'), 'utf8'));
  assert.equal(program.target, 50);
  assert.equal(program.completion_threshold, 75);
  assert.equal(program.records.length, 50);
  assert.equal(new Set(program.records.map((record) => record.deal_id)).size, 50);
  assert.ok(program.records.every((record) => record.status === 'complete'));
  assert.ok(program.records.every((record) => record.score >= program.completion_threshold));
});

test('home page exposes core research lanes and metadata', async () => {
  const html = await readFile(file('index.html'), 'utf8');
  assert.match(html, /Relationship Economy/);
  assert.match(html, /Named Deal Teams/);
  assert.match(html, /PE Services Ecosystem/);
  assert.match(html, /United States PE atlas/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /canonical/);
});

test('filterable cards honor the hidden state', async () => {
  const css = await readFile(file('assets/styles.css'), 'utf8');
  assert.match(css, /\[hidden\]\{display:none!important\}/);
});

test('atlas uses geographic map geometry and labels coverage counts', async () => {
  const html = await readFile(file('atlas/index.html'), 'utf8');
  assert.match(html, /class="map-nation"/);
  assert.match(html, /class="map-states"/);
  assert.match(html, /profiles in index/);
  assert.match(html, /476 profile records/);
  assert.match(html, /450 have person-level or official office-directory location evidence/);
  assert.match(html, /26 use a labeled firm-office association/);
  assert.match(html, /18 unique firm records create 25 market associations/);
});

test('release pages expose the expanded people directory and 100-deal target', async () => {
  const [home, deals, people] = await Promise.all([
    readFile(file('index.html'), 'utf8'),
    readFile(file('deals/index.html'), 'utf8'),
    readFile(file('people/index.html'), 'utf8')
  ]);
  assert.match(home, /<strong>100<\/strong><span>transactions<\/span>/);
  assert.match(home, /<strong>667<\/strong><span>professional profiles<\/span>/);
  assert.match(deals, /86 official portfolio records/);
  assert.match(people, /<strong>476<\/strong><span>U\.S\. atlas<\/span>/);
  assert.match(people, /<strong>167<\/strong><span>PE ecosystem<\/span>/);
  assert.match(people, /user-supplied list/);
});

test('generated site does not publish address-like contact strings', async () => {
  const peopleJson = await readFile(file('data/people.json'), 'utf8');
  const peopleCsv = await readFile(file('data/people.csv'), 'utf8');
  assert.doesNotMatch(`${peopleJson}\n${peopleCsv}`, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(peopleCsv.split('\n')[0], /email/i);
});

test('generated copy contains no em dashes or en dashes', async () => {
  const collect = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
      const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      return entry.isDirectory() ? collect(child) : [child];
    }));
    return files.flat();
  };

  const docs = new URL('../docs/', import.meta.url);
  const textFiles = (await collect(docs)).filter((entry) => /\.(?:html|json|csv|txt|xml)$/.test(entry.pathname));
  for (const entry of textFiles) {
    const contents = await readFile(entry, 'utf8');
    assert.doesNotMatch(contents, /[\u2013\u2014]/, `${entry.pathname} contains an em dash or en dash`);
  }
});
