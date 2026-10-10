import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const file = (name) => new URL(`../docs/${name}`, import.meta.url);

test('essential pages and discovery files are generated', async () => {
  for (const name of ['index.html','deals/index.html','people/index.html','providers/index.html','methodology/index.html','sitemap.xml','robots.txt','llms.txt','.nojekyll']) {
    await assert.doesNotReject(access(file(name)));
  }
});

test('home page exposes core research lanes and metadata', async () => {
  const html = await readFile(file('index.html'), 'utf8');
  assert.match(html, /Relationship Economy/);
  assert.match(html, /Named Deal Teams/);
  assert.match(html, /PE Services Ecosystem/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /canonical/);
});
