/**
 * Shared helpers for the data scripts: cached PokeAPI fetching and a small worker pool.
 * Raw responses are cached in scripts/cache so re-runs are fast and polite
 * (PokeAPI's fair-use policy asks clients to cache).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const CACHE = path.join(ROOT, 'scripts', 'cache');
export const API = 'https://pokeapi.co/api/v2';
const CONCURRENCY = 8;

export const ensureCache = () => mkdir(CACHE, { recursive: true });

export async function getJson<T = any>(url: string): Promise<T> {
  const key = createHash('sha1').update(url).digest('hex') + '.json';
  const file = path.join(CACHE, key);
  if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8'));
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'pokewwww-build-script' } });
    if (res.ok) {
      const text = await res.text();
      await writeFile(file, text);
      return JSON.parse(text);
    }
    if (attempt >= 4) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
}

export async function pool<T, R>(items: T[], fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
        if (++done % 50 === 0 || done === items.length) process.stdout.write(`\r  ${done}/${items.length}`);
      }
    }),
  );
  process.stdout.write('\n');
  return out;
}

export const idFromUrl = (url: string) => Number(url.split('/').filter(Boolean).pop());

export const en = <T extends { language: { name: string } }>(arr: T[]) => arr.find((x) => x.language.name === 'en');
