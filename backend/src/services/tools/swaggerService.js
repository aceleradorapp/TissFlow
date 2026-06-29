'use strict';

const fs   = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { TissVersion } = require('../../../models');

const SCHEMAS_BASE = path.join(__dirname, '..', '..', 'storage', 'schemas');

const xmlParser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  removeNSPrefix:      true,   // strip xs: / ans: etc. from TAG names
  processEntities:     false,
  cdataPropName:       '__cdata',
  isArray: (name) => [
    'element', 'complexType', 'simpleType',
    'sequence', 'choice', 'all',
    'include', 'import',
    'restriction', 'enumeration',
    'annotation', 'documentation',
    'extension', 'complexContent', 'simpleContent',
  ].includes(name),
  parseAttributeValue: false,
  trimValues:          true,
});

// ── In-memory cache ────────────────────────────────────────────────────────
// Keyed by version string (e.g. "4.01.00").  Call clearCache() after re-upload.
const _cache = {};

function clearCache(versionStr) {
  delete _cache[versionStr];
}

// ── XML helpers ────────────────────────────────────────────────────────────

function sanitize(raw) {
  return raw
    .replace(/<!DOCTYPE[^[>]*(\[[^\]]*\])?>/gi, '')
    .replace(/<!ENTITY[^>]*>/gi, '');
}

// Strip XML namespace prefix ("ans:ct_foo" → "ct_foo", "xs:string" → "string")
function stripNs(str) {
  if (!str) return null;
  const i = str.indexOf(':');
  return i >= 0 ? str.slice(i + 1) : str;
}

// Returns true for built-in XSD types like "xs:string", "xs:integer", etc.
function isBuiltInType(rawType) {
  return !rawType || /^(xs|xsd):/.test(rawType);
}

function extractDoc(node) {
  try {
    const docs = node?.annotation?.[0]?.documentation;
    if (!docs?.length) return '';
    const d = docs[0];
    if (typeof d === 'string')  return d.trim();
    if (d?.__cdata)             return String(d.__cdata).trim();
    if (d?.['#text'])           return String(d['#text']).trim();
    return '';
  } catch { return ''; }
}

// Extract simpleType restriction metadata (lengths, pattern, enums)
function extractRestrictions(typeName, registry) {
  const st = registry.simpleTypes[typeName];
  if (!st) return null;

  const r = st.restriction?.[0] || st.simpleContent?.[0]?.restriction?.[0];
  if (!r) return null;

  const enums = [].concat(r.enumeration || []).map((e) => ({
    value:       String(e?.['@_value'] ?? ''),
    description: extractDoc(e),
  }));

  return {
    base:           stripNs(r['@_base']) || null,
    pattern:        r.pattern?.[0]?.['@_value']        ?? null,
    minLength:      r.minLength?.[0]?.['@_value']      ?? null,
    maxLength:      r.maxLength?.[0]?.['@_value']      ?? null,
    totalDigits:    r.totalDigits?.[0]?.['@_value']    ?? null,
    fractionDigits: r.fractionDigits?.[0]?.['@_value'] ?? null,
    enums,
  };
}

// ── Element mapping ────────────────────────────────────────────────────────

function mapElement(el, registry) {
  if (!el?.['@_name']) return null;

  const name        = el['@_name'];
  const rawType     = el['@_type'];
  const typeName    = stripNs(rawType);
  const minOccurs   = String(el['@_minOccurs'] ?? '1');
  const maxOccurs   = String(el['@_maxOccurs'] ?? '1');
  const description = extractDoc(el);

  // Inline anonymous complexType → store with virtual name
  const inlineCt = el.complexType?.[0];
  if (inlineCt) {
    const virtualType = `__inline__${name}`;
    if (!registry.complexTypes[virtualType]) {
      registry.complexTypes[virtualType] = inlineCt;
    }
    return { name, type: virtualType, minOccurs, maxOccurs, description, isLeaf: false, restrictions: null };
  }

  // isLeaf = built-in type OR known simpleType OR type not in complexType registry
  const isLeaf = isBuiltInType(rawType) || !typeName || !registry.complexTypes[typeName];
  const restrictions = (isLeaf && typeName && !isBuiltInType(rawType))
    ? extractRestrictions(typeName, registry)
    : null;

  return { name, type: typeName, minOccurs, maxOccurs, description, isLeaf, restrictions };
}

// Recursively collect elements from sequence / choice / all containers
function elementsFromContainer(container, registry, depth = 0) {
  if (!container || depth > 8) return [];

  const out = [];

  for (const el of [].concat(container.element || [])) {
    const mapped = mapElement(el, registry);
    if (mapped) out.push(mapped);
  }
  for (const seq of [].concat(container.sequence || [])) {
    out.push(...elementsFromContainer(seq, registry, depth + 1));
  }
  for (const ch of [].concat(container.choice || [])) {
    out.push(...elementsFromContainer(ch, registry, depth + 1));
  }
  for (const al of [].concat(container.all || [])) {
    out.push(...elementsFromContainer(al, registry, depth + 1));
  }
  return out;
}

// Returns direct child elements for a given complexType name
function getComplexChildren(typeName, registry, visited = new Set()) {
  if (visited.has(typeName)) return [];
  visited.add(typeName);

  const ct = registry.complexTypes[typeName];
  if (!ct) return [];

  // Direct sequence / choice / all
  const seq = ct.sequence?.[0] || ct.choice?.[0] || ct.all?.[0];
  if (seq) return elementsFromContainer(seq, registry);

  // ComplexContent → extension (inheritance: base + own fields)
  const cc = ct.complexContent?.[0];
  if (cc) {
    const ext      = cc.extension?.[0];
    const restr    = cc.restriction?.[0];
    const branch   = ext || restr;
    const baseName = branch ? stripNs(branch['@_base']) : null;

    const baseChildren = (baseName && ext) ? getComplexChildren(baseName, registry, visited) : [];
    const ownSeq       = branch?.sequence?.[0] || branch?.choice?.[0] || branch?.all?.[0];
    const ownChildren  = ownSeq ? elementsFromContainer(ownSeq, registry) : [];

    return [...baseChildren, ...ownChildren];
  }

  return [];
}

// ── Registry builder ───────────────────────────────────────────────────────

function buildRegistry(versionStr) {
  if (_cache[versionStr]) return _cache[versionStr];

  const folderName = 'v' + versionStr.replace(/\./g, '_');
  const folderPath = path.join(SCHEMAS_BASE, folderName);

  if (!fs.existsSync(folderPath)) {
    const err = new Error(
      `Schemas não encontrados para a versão ${versionStr}. Faça o upload dos XSDs primeiro.`
    );
    err.code = 'NO_SCHEMAS';
    throw err;
  }

  const files = fs.readdirSync(folderPath).filter((f) => /\.(xsd|xml)$/i.test(f));
  if (!files.length) {
    const err = new Error(`Nenhum arquivo XSD encontrado para a versão ${versionStr}.`);
    err.code = 'NO_SCHEMAS';
    throw err;
  }

  const complexTypes = {};
  const simpleTypes  = {};
  let   rootElement  = null;

  for (const file of files) {
    let parsed;
    try {
      const raw = fs.readFileSync(path.join(folderPath, file), 'utf-8');
      parsed    = xmlParser.parse(sanitize(raw));
    } catch { continue; }

    const schema = parsed.schema;
    if (!schema) continue;

    for (const ct of [].concat(schema.complexType || [])) {
      if (ct?.['@_name']) complexTypes[ct['@_name']] = ct;
    }
    for (const st of [].concat(schema.simpleType || [])) {
      if (st?.['@_name']) simpleTypes[st['@_name']] = st;
    }
    for (const el of [].concat(schema.element || [])) {
      if (el?.['@_name'] === 'mensagemTISS' && !rootElement) rootElement = el;
    }
  }

  const registry = { complexTypes, simpleTypes, rootElement };
  _cache[versionStr] = registry;
  return registry;
}

// ── Version helper ─────────────────────────────────────────────────────────

async function resolveVersion(versionId) {
  const ver = await TissVersion.findByPk(Number(versionId), { attributes: ['id', 'version'] });
  if (!ver) throw new Error('Versão não encontrada.');
  return { ver, registry: buildRegistry(ver.version) };
}

// ── Public API ─────────────────────────────────────────────────────────────

async function getVersions() {
  return TissVersion.findAll({
    where:      { is_active: true },
    attributes: ['id', 'version', 'release_date'],
    order:      [['version', 'DESC']],
  });
}

// Returns the root mensagemTISS node
async function getRoot(versionId) {
  const { registry } = await resolveVersion(versionId);
  const { rootElement } = registry;

  if (rootElement) return mapElement(rootElement, registry);

  // Fallback: synthesise root from the ct_mensagemTISS complexType
  const ct = registry.complexTypes['ct_mensagemTISS'];
  if (ct) {
    return {
      name: 'mensagemTISS', type: 'ct_mensagemTISS',
      minOccurs: '1', maxOccurs: '1',
      description: extractDoc(ct), isLeaf: false, restrictions: null,
    };
  }

  return null;
}

// Returns the direct child elements for a given XSD type name (lazy loading)
async function getChildren(versionId, typeName) {
  const { registry } = await resolveVersion(versionId);
  return getComplexChildren(typeName, registry);
}

// Searches all element names recursively and returns matches with their
// ancestor path [{name, type}] so the frontend can auto-expand the tree.
async function searchField(versionId, query) {
  const { registry } = await resolveVersion(versionId);
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return [];

  const results = [];
  const visited = new Set();

  // Get root (for path building)
  let rootEl = null;
  if (registry.rootElement) {
    rootEl = mapElement(registry.rootElement, registry);
  } else if (registry.complexTypes['ct_mensagemTISS']) {
    rootEl = {
      name: 'mensagemTISS', type: 'ct_mensagemTISS',
      minOccurs: '1', maxOccurs: '1',
      description: extractDoc(registry.complexTypes['ct_mensagemTISS']),
      isLeaf: false, restrictions: null,
    };
  }
  if (!rootEl) return [];

  // Root itself matches?
  if (rootEl.name.toLowerCase().includes(q)) {
    results.push({ field: rootEl, ancestorPath: [] });
  }

  // Depth-first traversal
  function traverse(typeName, ancestorPath) {
    if (visited.has(typeName) || results.length >= 10) return;
    visited.add(typeName);

    const children = getComplexChildren(typeName, registry);
    for (const child of children) {
      if (child.name.toLowerCase().includes(q)) {
        results.push({ field: child, ancestorPath });
        if (results.length >= 10) return;
      }
      if (!child.isLeaf && child.type && !visited.has(child.type)) {
        traverse(child.type, [...ancestorPath, { name: child.name, type: child.type }]);
      }
      if (results.length >= 10) return;
    }
  }

  if (rootEl.type) {
    traverse(rootEl.type, [{ name: rootEl.name, type: rootEl.type }]);
  }

  return results;
}

module.exports = {
  // Public API
  getVersions, getRoot, getChildren, searchField, clearCache,
  // Shared internals — used by generatorService
  buildRegistry, getComplexChildren, mapElement,
};
