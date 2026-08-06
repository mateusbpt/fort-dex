import fs from 'node:fs/promises';
import path from 'node:path';

export function normalizeId(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

export async function ensureDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
}

export async function writeJson(file, data) {
  await ensureDirectory(path.dirname(file));
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function log(message = '') { console.log(message); }
export function success(message) { console.log(`✔ ${message}`); }
export function warn(message) { console.warn(`⚠ ${message}`); }
export function error(message) { console.error(`✖ ${message}`); }

export function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter(item => {
    const value = key(item);
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
