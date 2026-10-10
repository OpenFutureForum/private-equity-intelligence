import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const base = '/private-equity-intelligence/';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

const htmlFiles = (await walk(docs)).filter((file) => file.endsWith('.html'));
const errors = [];
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const matches = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const href of matches) {
    if (/^(?:https?:|mailto:|tel:|#|data:)/.test(href)) continue;
    let relative = href;
    if (relative.startsWith(base)) relative = relative.slice(base.length);
    else if (relative.startsWith('/')) continue;
    relative = relative.split('#')[0].split('?')[0];
    if (!relative) relative = 'index.html';
    let target = path.join(docs, relative);
    if (relative.endsWith('/')) target = path.join(target, 'index.html');
    try { await access(target); }
    catch { errors.push(`${path.relative(root, file)} -> ${href}`); }
  }
}

if (errors.length) {
  console.error(`Broken internal references (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Checked internal references across ${htmlFiles.length} HTML pages.`);
