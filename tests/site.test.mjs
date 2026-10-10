import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

const file = (name) => new URL(`../docs/${name}`, import.meta.url);

test('essential pages and discovery files are generated', async () => {
  for (const name of ['index.html','deals/index.html','atlas/index.html','atlas/new-york/index.html','people/index.html','providers/index.html','methodology/index.html','data/markets.json','data/markets.csv','sitemap.xml','robots.txt','llms.txt','.nojekyll']) {
    await assert.doesNotReject(access(file(name)));
  }
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
  assert.match(html, /112 profile records/);
  assert.match(html, /86 have person-level or official office-directory location evidence/);
  assert.match(html, /26 use a labeled firm-office association/);
  assert.match(html, /18 unique firm records create 22 market associations/);
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
