import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(root, 'data');
const expansionDirectory = path.join(dataDirectory, 'expansions');

export async function loadData(name) {
  const base = JSON.parse(await readFile(path.join(dataDirectory, `${name}.json`), 'utf8'));
  let expansionFiles = [];

  try {
    expansionFiles = (await readdir(expansionDirectory))
      .filter((file) => file.endsWith('.json'))
      .sort();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const additions = await Promise.all(expansionFiles.map(async (file) => {
    const expansion = JSON.parse(await readFile(path.join(expansionDirectory, file), 'utf8'));
    const rows = expansion[name] ?? [];
    if (!Array.isArray(rows)) throw new Error(`${file}: ${name} must be an array`);
    return rows;
  }));

  if (!Array.isArray(base)) {
    if (additions.some((rows) => rows.length)) throw new Error(`${name}: object datasets cannot be expanded`);
    return base;
  }

  return [base, ...additions].flat();
}
