/**
 * Regenera data/stocks.json fusionando el catálogo actual con las listas OFICIALES
 * de valores de NASDAQ y NYSE / NYSE American (Nasdaq Trader Symbol Directory).
 *
 *   node scripts/build-catalog.mjs
 *
 * - Conserva TODAS las entradas actuales tal cual (sus sectores/industrias en
 *   español y las acciones internacionales que estas listas no incluyen).
 * - Agrega cada símbolo cotizado en EE. UU. que aún no esté, con
 *   sector/industria = "Desconocido" (estas listas no traen esa clasificación).
 * - Filtra ETFs, notas, warrants, units, rights, preferentes y test issues:
 *   queremos EMPRESAS, no productos cotizados.
 * - Las 200 criptos del final se mantienen al final.
 *
 * Es idempotente: al volver a correrlo, lo que ya está (incluida cualquier
 * clasificación hecha a mano) se respeta y solo se añaden símbolos nuevos.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(HERE, '..', 'data', 'stocks.json');

const SOURCES = [
  { url: 'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt', kind: 'nasdaq' },
  { url: 'https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt', kind: 'other' },
];

const EXCHANGE_BY_CODE = {
  N: 'NYSE',
  A: 'NYSE American',
  P: 'NYSE Arca',
  Z: 'Cboe BZX',
  V: 'IEX',
};

/** Nombres que NO son acciones ordinarias de una empresa. */
const NON_EQUITY = new RegExp(
  [
    'warrant',
    '\\bunit(s)?\\b',
    '\\bright(s)?\\b',
    'preferred',
    '\\bpfd\\b',
    'depositary shares.*(preferred|pfd|%)',
    '%\\s*(notes|debentures?|bonds?|preferred)',
    'subordinated',
    'senior notes',
    'notes due',
    '\\bdebentures?\\b',
    'when[\\s-]issued',
    'contingent value',
    '\\btrust\\s+(preferred|units)\\b',
    'royalty trust',
    'income trust',
    '\\bfund\\b',
    '\\betn(s)?\\b',
    '\\bnotes?\\s+due\\b',
    'shares of beneficial interest',
    'test\\s+(stock|issue)',
  ].join('|'),
  'i'
);

/** Sufijos de símbolo (tras "." o "-") que indican warrant / unit / right / preferente. */
const SYMBOL_SUFFIX_JUNK = /[.\-](WS|WT|WI|U|UN|RT|R|CL|EC|PR[A-Z]?|P[A-Z]?)$/i;

function cleanName(raw) {
  let name = raw.trim();
  const classMatch = name.match(/\bClass\s+([A-Z])\b/);
  name = name
    .replace(
      /\s*-\s*(Common Stock|Common Shares|Ordinary Shares?|Class [A-Z] Common Stock|Class [A-Z] Ordinary Shares?|American Depositary Shares?.*|Depositary Shares?.*|Ordinary Shares?.*|Global Shares.*|Common Units.*|Shares of Beneficial Interest.*|Subscription Receipts.*|Limited Partnership.*)$/i,
      ''
    )
    .replace(/\s+American Deposit(a|o)ry (Shares?|Receipts?).*$/i, '')
    .replace(/\s*\(each representing.*$/i, '')
    .replace(/\s+Class [A-Z] Ordinary Shares?.*$/i, '')
    .replace(/\s+Ordinary Shares?\b.*$/i, '')
    .replace(/\s+Depositary Shares?\b.*$/i, '')
    .replace(/\s*-\s*Common shares.*$/i, '')
    .replace(/,\s*Par [Vv]alue.*$/i, '')
    .replace(/\s+(Class [A-Z] )?(Limited Voting|Subordinate(d)? Voting|Voting) Shares.*$/i, '')
    .replace(/\s+Common Stock$/i, '')
    .replace(/\s*\(The\)$/i, '')
    .replace(/\s*,?\s*Class\s+[A-Z]$/, '')
    .replace(/\s*[,(]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // A veces el archivo repite el nombre ("Foo Corp Foo Corp") -> lo colapsamos.
  const half = Math.floor(name.length / 2);
  if (name.length > 10 && name.slice(0, half).trim() === name.slice(half).trim()) {
    name = name.slice(0, half).trim();
  }
  if (classMatch && !/\bclase\b/i.test(name)) name = `${name} (Clase ${classMatch[1]})`;
  return name;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'inversiones-app catalog builder' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

function parseRows(text, kind) {
  const lines = text.split(/\r?\n/).filter((l) => l && !l.startsWith('File Creation Time'));
  const header = lines.shift();
  const cols = header.split('|');
  const idx = (label) => cols.indexOf(label);

  const iSymbol = kind === 'nasdaq' ? idx('Symbol') : idx('ACT Symbol');
  const iName = idx('Security Name');
  const iEtf = idx('ETF');
  const iTest = idx('Test Issue');
  const iExch = kind === 'other' ? idx('Exchange') : -1;

  const out = [];
  for (const line of lines) {
    const c = line.split('|');
    const symbol = (c[iSymbol] || '').trim().toUpperCase();
    const rawName = (c[iName] || '').trim();
    if (!symbol || !rawName) continue;
    if ((c[iTest] || '').trim() === 'Y') continue;
    if ((c[iEtf] || '').trim() === 'Y') continue;
    if (NON_EQUITY.test(rawName)) continue;
    if (SYMBOL_SUFFIX_JUNK.test(symbol)) continue;
    if (!/^[A-Z][A-Z0-9.]{0,8}$/.test(symbol)) continue;
    if (/[.\-]$/.test(symbol)) continue;

    const exchange =
      kind === 'nasdaq' ? 'NASDAQ' : EXCHANGE_BY_CODE[(c[iExch] || '').trim()] || 'NYSE';
    out.push({ symbol, name: cleanName(rawName), sector: 'Desconocido', industry: 'Desconocido', exchange });
  }
  return out;
}

async function main() {
  const current = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const stocks = current.filter((e) => e.exchange !== 'Cripto');
  const crypto = current.filter((e) => e.exchange === 'Cripto');
  const known = new Set(current.map((e) => e.symbol.toUpperCase()));

  let fetched = [];
  for (const src of SOURCES) {
    process.stdout.write(`bajando ${src.url} ... `);
    const text = await fetchText(src.url);
    const rows = parseRows(text, src.kind);
    console.log(`${rows.length} valores tras filtrar`);
    fetched = fetched.concat(rows);
  }

  const added = [];
  for (const row of fetched) {
    if (known.has(row.symbol)) continue;
    known.add(row.symbol);
    added.push(row);
  }
  added.sort((a, b) => a.symbol.localeCompare(b.symbol));

  const merged = [...stocks, ...added, ...crypto];
  fs.writeFileSync(CATALOG_PATH, '[\n' + merged.map((e) => JSON.stringify(e)).join(',\n') + '\n]\n');

  console.log('---');
  console.log('entradas previas (acciones):', stocks.length);
  console.log('nuevas agregadas:', added.length);
  console.log('cripto:', crypto.length);
  console.log('total:', merged.length);
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
