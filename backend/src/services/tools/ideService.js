'use strict';

const fs            = require('fs');
const path          = require('path');
const { XMLParser } = require('fast-xml-parser');

// ── Schema cache: version string -> registry ──────────────────────────────────
const SCHEMA_CACHE = new Map();

// ── XSD primitive type → UI input type ───────────────────────────────────────
const XSD_PRIM_INPUT = {
  'date':                'date',
  'time':                'time',
  'dateTime':            'datetime',
  'integer':             'number',
  'decimal':             'number',
  'positiveInteger':     'number',
  'nonNegativeInteger':  'number',
  'string':              'text',
  'boolean':             'checkbox',
  'base64Binary':        'text',
  'anyURI':              'text',
};

// ── Utility ───────────────────────────────────────────────────────────────────

let _nodeCounter   = 0;
let _choiceCounter = 0;
function nextId(tag)     { return `${tag}_${++_nodeCounter}`; }
function nextChoiceIdx() { return ++_choiceCounter; }

function toArr(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

// Strip namespace prefix: 'ans:ct_xxx' -> 'ct_xxx', 'xs:string' -> 'string'
function stripNs(s) {
  if (!s) return s;
  const i = s.indexOf(':');
  return i >= 0 ? s.slice(i + 1) : s;
}

// Heuristic: infer UI input type from TISS type name conventions
function heuristicInputType(typeName) {
  if (!typeName) return null;
  const n = typeName.toLowerCase();
  if (n === 'st_data' || n.endsWith('_data')) return 'date';
  if (n === 'st_hora' || n.endsWith('_hora')) return 'time';
  if (n.startsWith('st_numerico') || n.startsWith('st_numero')) return 'number';
  return null;
}

// ── XSD file parser ───────────────────────────────────────────────────────────

const XSD_PARSER = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  trimValues:          true,
  processEntities:     false,
  // Force these tags to always be arrays so we can iterate uniformly
  isArray: (tag) => [
    'element', 'simpleType', 'complexType', 'enumeration', 'include',
    'attribute', 'choice', 'sequence', 'all', 'extension', 'restriction',
  ].includes(tag),
});

function loadXsd(filePath) {
  try {
    const buf  = fs.readFileSync(filePath);
    const text = buf.toString('latin1'); // XSD files are ISO-8859-1
    return XSD_PARSER.parse(text);
  } catch {
    return null;
  }
}

// ── Registry builder ──────────────────────────────────────────────────────────

// ElementDef: { name, typeName, inlineType, minOccurs, maxOccurs, choiceGroup }
// SimpleTypeDef: { kind:'simple', base, enums, pattern, maxLength, minLength, inputType }
// ComplexTypeDef: { kind:'sequence'|'choice'|'extension', children, base?, ownChildren? }

function parseElementDef(el) {
  const minOccurs = el['@_minOccurs'] != null ? Number(el['@_minOccurs']) : 1;
  const maxOccurs = el['@_maxOccurs'] === 'unbounded' ? 'unbounded'
    : el['@_maxOccurs'] != null ? Number(el['@_maxOccurs']) : 1;

  const inlineCts = toArr(el.complexType ?? []);
  return {
    name:       el['@_name'],
    typeName:   stripNs(el['@_type']) ?? null,
    inlineType: inlineCts.length > 0 ? parseComplexTypeDef(inlineCts[0]) : null,
    minOccurs,
    maxOccurs,
    choiceGroup: false,
  };
}

function flattenToChildren(node) {
  const result = [];

  for (const el of toArr(node.element ?? [])) {
    result.push(parseElementDef(el));
  }

  // Each <xs:choice> block gets a unique index so independent choice groups
  // (e.g. CNPJ-vs-CPF and tipoAtendimento enum) are resolved separately
  for (const ch of toArr(node.choice ?? [])) {
    const cIdx = nextChoiceIdx();
    for (const el of toArr(ch.element ?? [])) {
      result.push({ ...parseElementDef(el), choiceGroup: true, choiceIdx: cIdx });
    }
    // Sequences nested inside a choice alternative (TISS uses this pattern occasionally)
    for (const seq of toArr(ch.sequence ?? [])) {
      for (const el of toArr(seq.element ?? [])) {
        result.push({ ...parseElementDef(el), choiceGroup: true, choiceIdx: cIdx });
      }
    }
  }

  for (const seq of toArr(node.sequence ?? [])) {
    result.push(...flattenToChildren(seq));
  }

  return result;
}

function parseComplexTypeDef(ct) {
  // complexContent / extension pattern
  const ccArr = toArr(ct.complexContent ?? []);
  if (ccArr.length > 0) {
    const extArr = toArr(ccArr[0].extension ?? []);
    if (extArr.length > 0) {
      const ext = extArr[0];
      return {
        kind:        'extension',
        base:        stripNs(ext['@_base']),
        ownChildren: flattenToChildren(ext),
      };
    }
  }

  // sequence
  const seqArr = toArr(ct.sequence ?? []);
  if (seqArr.length > 0) {
    return { kind: 'sequence', children: flattenToChildren(seqArr[0]) };
  }

  // choice
  const chArr = toArr(ct.choice ?? []);
  if (chArr.length > 0) {
    const cIdx = nextChoiceIdx();
    const children = [];
    for (const el of toArr(chArr[0].element ?? [])) {
      children.push({ ...parseElementDef(el), choiceGroup: true, choiceIdx: cIdx });
    }
    // Nested sequences inside a top-level choice (e.g. ct_prestadorParaOperadora)
    for (const seq of toArr(chArr[0].sequence ?? [])) {
      for (const el of toArr(seq.element ?? [])) {
        children.push({ ...parseElementDef(el), choiceGroup: true, choiceIdx: cIdx });
      }
    }
    return { kind: 'choice', children };
  }

  return { kind: 'sequence', children: [] };
}

function buildRegistry(versionDir) {
  const registry = {
    simpleTypes:    new Map(), // name -> SimpleTypeDef
    complexTypes:   new Map(), // name -> ComplexTypeDef
    globalElements: new Map(), // name -> { typeName, inlineType }
  };

  // Load only the main TISS schema files (not radar, xmldsig)
  const files = fs.readdirSync(versionDir)
    .filter(f => f.endsWith('.xsd') && /^tiss/i.test(f))
    .map(f => path.join(versionDir, f));

  for (const filePath of files) {
    const parsed = loadXsd(filePath);
    if (!parsed) continue;

    const schema = parsed.schema ?? parsed;

    // ── simpleTypes ───────────────────────────────────────────────────────────
    for (const st of toArr(schema.simpleType ?? [])) {
      const name = st['@_name'];
      if (!name) continue;

      const restArr = toArr(st.restriction ?? []);
      const rest    = restArr[0] ?? {};
      const base    = stripNs(rest['@_base']) ?? 'string';
      const enums   = toArr(rest.enumeration ?? []).map(e => e['@_value']).filter(Boolean);
      const pattern   = toArr(rest.pattern   ?? [])[0]?.['@_value'] ?? null;
      const maxLength = toArr(rest.maxLength ?? [])[0]?.['@_value'] ?? null;
      const minLength = toArr(rest.minLength ?? [])[0]?.['@_value'] ?? null;

      const inputType = enums.length > 0 ? 'enum'
        : XSD_PRIM_INPUT[base]
        ?? heuristicInputType(name)
        ?? 'text';

      registry.simpleTypes.set(name, {
        kind: 'simple',
        base,
        enums,
        pattern:   pattern   ? String(pattern)   : null,
        maxLength: maxLength  ? Number(maxLength)  : null,
        minLength: minLength  ? Number(minLength)  : null,
        inputType,
      });
    }

    // ── complexTypes ──────────────────────────────────────────────────────────
    for (const ct of toArr(schema.complexType ?? [])) {
      const name = ct['@_name'];
      if (!name) continue;
      registry.complexTypes.set(name, parseComplexTypeDef(ct));
    }

    // ── global elements ───────────────────────────────────────────────────────
    for (const el of toArr(schema.element ?? [])) {
      const name = el['@_name'];
      if (!name) continue;

      const inlineCts = toArr(el.complexType ?? []);
      registry.globalElements.set(name, {
        typeName:   stripNs(el['@_type']) ?? null,
        inlineType: inlineCts.length > 0 ? parseComplexTypeDef(inlineCts[0]) : null,
        minOccurs:  el['@_minOccurs'] != null ? Number(el['@_minOccurs']) : 1,
        maxOccurs:  el['@_maxOccurs'] === 'unbounded' ? 'unbounded'
                    : el['@_maxOccurs'] != null ? Number(el['@_maxOccurs']) : 1,
      });
    }
  }

  return registry;
}

// ── Registry getter (cached per version) ──────────────────────────────────────

function getRegistry(versao) {
  if (SCHEMA_CACHE.has(versao)) return SCHEMA_CACHE.get(versao);

  const key = versao.replace(/\./g, '_');
  const dir = path.join(__dirname, '../../storage/schemas', `v${key}`);

  if (!fs.existsSync(dir)) {
    throw Object.assign(
      new Error(`Versão TISS ${versao} não encontrada em disco (esperado: ${dir}).`),
      { code: 'VERSION_NOT_FOUND' }
    );
  }

  const registry = buildRegistry(dir);
  SCHEMA_CACHE.set(versao, registry);
  return registry;
}

// ── Type resolver ─────────────────────────────────────────────────────────────

function resolveType(typeName, registry) {
  if (!typeName) return null;

  // XSD primitives
  if (XSD_PRIM_INPUT[typeName]) {
    return { kind: 'simple', base: typeName, enums: [], inputType: XSD_PRIM_INPUT[typeName] };
  }

  if (registry.simpleTypes.has(typeName)) return registry.simpleTypes.get(typeName);
  if (registry.complexTypes.has(typeName)) return registry.complexTypes.get(typeName);

  // Fallback heuristic from name
  const ht = heuristicInputType(typeName);
  if (ht) return { kind: 'simple', base: typeName, enums: [], inputType: ht };

  return null;
}

// Recursively resolve extension chains and return the flat children list
function resolveChildren(typeDef, registry, visited = new Set()) {
  if (!typeDef) return [];

  if (typeDef.kind === 'extension') {
    const base = typeDef.base;
    if (visited.has(base)) return typeDef.ownChildren ?? [];
    visited.add(base);

    const baseDef = registry.complexTypes.get(base);
    const baseKids = baseDef ? resolveChildren(baseDef, registry, visited) : [];
    return [...baseKids, ...(typeDef.ownChildren ?? [])];
  }

  return typeDef.children ?? [];
}

// ── Line-number index ─────────────────────────────────────────────────────────

function buildLineIndex(xmlString) {
  // Map<tagName, number[]> — ordered list of line numbers for each tag
  const idx = new Map();
  const lines = xmlString.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/<(?:ans:)?([A-Za-z][\w-]*)[\s\/>]/g)) {
      const tag = m[1];
      if (!idx.has(tag)) idx.set(tag, []);
      idx.get(tag).push(i + 1);
    }
  }
  return idx;
}

// ── Validator (per-leaf) ──────────────────────────────────────────────────────

function validateValue(value, typeDef) {
  const errors = [];
  if (!typeDef || !value) return errors;

  const s = String(value);

  if (typeDef.enums?.length > 0 && !typeDef.enums.includes(s)) {
    errors.push(`Valor "${s}" inválido. Opções: ${typeDef.enums.slice(0, 5).join(', ')}${typeDef.enums.length > 5 ? '…' : ''}`);
  }
  if (typeDef.maxLength != null && s.length > typeDef.maxLength) {
    errors.push(`Máximo ${typeDef.maxLength} caracteres (atual: ${s.length})`);
  }
  if (typeDef.minLength != null && s.length < typeDef.minLength) {
    errors.push(`Mínimo ${typeDef.minLength} caracteres (atual: ${s.length})`);
  }
  if (typeDef.pattern) {
    try {
      if (!new RegExp(`^${typeDef.pattern}$`).test(s)) {
        errors.push(`Formato inválido (padrão: ${typeDef.pattern})`);
      }
    } catch { /* invalid regex in XSD */ }
  }

  return errors;
}

// ── Tree walker ───────────────────────────────────────────────────────────────

function walkNode(tag, xmlVal, typeDef, elDef, parentPath, registry, lineIdx) {
  const path       = parentPath ? `${parentPath}/${tag}` : tag;
  const id         = nextId(tag);
  const minOccurs  = elDef?.minOccurs ?? 1;
  const maxOccurs  = elDef?.maxOccurs ?? 1;
  const isRequired = minOccurs >= 1;
  const isPresent  = xmlVal !== undefined && xmlVal !== null;

  // Consume one line number for this tag
  const lineArr = lineIdx.get(tag) ?? [];
  const lineNumber = lineArr.length ? lineArr.shift() : null;

  // ── Leaf node ─────────────────────────────────────────────────────────────
  if (!typeDef || typeDef.kind === 'simple') {
    const inputType = typeDef?.inputType
      ?? heuristicInputType(elDef?.typeName ?? '')
      ?? 'text';
    const enums     = typeDef?.enums ?? [];
    const value     = isPresent ? String(xmlVal) : null;
    const errors    = isPresent ? validateValue(value, typeDef) : [];

    const status = !isPresent && isRequired ? 'missing'
      : errors.length > 0 ? 'error'
      : isPresent ? 'valid'
      : 'empty';

    return {
      id, tag, path, value,
      xsdTypeName: elDef?.typeName ?? null,
      inputType:   enums.length > 0 ? 'enum' : inputType,
      enums,
      maxLength:   typeDef?.maxLength ?? null,
      pattern:     typeDef?.pattern   ?? null,
      minOccurs, maxOccurs,
      isPresent, isRequired,
      isEnabled: isPresent || !isRequired ? true : false,
      status, errors,
      lineNumber,
      children: [],
    };
  }

  // ── Complex node ──────────────────────────────────────────────────────────
  // Early exit: don't recurse into absent complex nodes. Expanding children
  // of a missing/optional absent block produces a cascade of false "missing
  // required" errors for every grandchild. The ghost node (parent) is enough
  // signal — the user can enable or insert it to see the children.
  if (!isPresent) {
    return {
      id, tag, path, value: null,
      xsdTypeName: elDef?.typeName ?? null,
      inputType:   'complex',
      enums: [], maxLength: null, pattern: null,
      minOccurs, maxOccurs,
      isPresent: false, isRequired,
      isEnabled: false,
      status:  isRequired ? 'missing' : 'empty',
      errors:  [],
      lineNumber,
      children: [],
    };
  }

  const children = [];
  const allKids  = resolveChildren(typeDef, registry);
  const xmlObj   = (typeof xmlVal === 'object' && xmlVal !== null) ? xmlVal : {};

  // ── Choice-group resolution ────────────────────────────────────────────────
  // Rule: if ANY member of a <xs:choice> group is present in the XML, omit all
  // absent siblings — they are not "missing", they are the un-taken branch.
  // This eliminates false errors for CNPJ/CPF and prestadorParaOperadora vs
  // operadoraParaPrestador (transaction-type isolation).
  let kidsToWalk;

  if (typeDef?.kind === 'choice') {
    // The whole complex type IS a choice (e.g. ct_prestadorParaOperadora)
    const anyPresent = allKids.some(k => xmlObj[k.name] != null);
    kidsToWalk = anyPresent
      ? allKids.filter(k => xmlObj[k.name] != null)
      : allKids;
  } else {
    // Sequence / extension — may contain embedded <xs:choice> blocks
    const nonChoiceKids = allKids.filter(k => !k.choiceGroup);
    const choiceGroups  = new Map();
    for (const k of allKids) {
      if (!k.choiceGroup) continue;
      const idx = k.choiceIdx ?? '__legacy__';
      if (!choiceGroups.has(idx)) choiceGroups.set(idx, []);
      choiceGroups.get(idx).push(k);
    }
    kidsToWalk = [...nonChoiceKids];
    for (const [, group] of choiceGroups) {
      const anyPresent = group.some(k => xmlObj[k.name] != null);
      kidsToWalk.push(...(anyPresent
        ? group.filter(k => xmlObj[k.name] != null)
        : group
      ));
    }
  }
  // ── Walk resolved children ─────────────────────────────────────────────────

  for (const kidDef of kidsToWalk) {
    const kidName    = kidDef.name;
    if (!kidName) continue;

    const kidXml     = xmlObj[kidName];
    const items      = kidXml == null ? [] : Array.isArray(kidXml) ? kidXml : [kidXml];
    const kidTypeDef = kidDef.inlineType ?? resolveType(kidDef.typeName, registry);

    if (items.length === 0) {
      const ghost = walkNode(kidName, null, kidTypeDef, kidDef, path, registry, lineIdx);
      ghost.isEnabled = false;
      children.push(ghost);
    } else {
      for (let i = 0; i < items.length; i++) {
        children.push(walkNode(kidName, items[i], kidTypeDef, kidDef, path, registry, lineIdx));
      }
    }
  }

  // Determine parent status from children
  const hasErr  = children.some(c => c.status === 'error');
  const hasMiss = children.some(c => c.status === 'missing');

  return {
    id, tag, path, value: null,
    xsdTypeName: elDef?.typeName ?? null,
    inputType: 'complex',
    enums: [], maxLength: null, pattern: null,
    minOccurs, maxOccurs,
    isPresent, isRequired,
    isEnabled: true,
    status: hasErr ? 'error' : hasMiss ? 'warning' : isPresent ? 'valid' : 'empty',
    errors: [],
    lineNumber,
    children,
  };
}

// ── XML parser (same as viewerService) ───────────────────────────────────────

// CNPJ, CPF e outros identificadores têm zeros à esquerda que seriam
// descartados se parseTagValue:true convertesse a string para número.
// Como walkNode faz String(xmlVal) de qualquer forma, desligar a conversão
// global é seguro e preserva os dados exatamente como estão no XML.
const XML_PARSER = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  removeNSPrefix:      true,
  processEntities:     false,
  parseAttributeValue: false,
  parseTagValue:       false,
  trimValues:          true,
  cdataPropName:       '__cdata',
});

// ── Error collector ───────────────────────────────────────────────────────────

function collectErrors(node, out) {
  if (node.status === 'missing' && node.isRequired) {
    out.push({
      path: node.path, tag: node.tag, line: null,
      type: 'MISSING_REQUIRED',
      message: `Tag obrigatória <${node.tag}> está ausente.`,
    });
  }
  for (const err of node.errors ?? []) {
    out.push({ path: node.path, tag: node.tag, line: node.lineNumber, type: 'VALUE_INVALID', message: err });
  }
  for (const c of node.children ?? []) collectErrors(c, out);
}

// ── XML rebuild from tree ─────────────────────────────────────────────────────

function rebuildXml(node, indent = '') {
  if (!node.isEnabled && !node.isRequired) return null;

  const tag = `ans:${node.tag}`;

  if (node.children.length === 0) {
    // Leaf
    const val = node.value != null ? String(node.value) : '';
    if (!val && !node.isPresent) return null;
    return `${indent}<${tag}>${escapeXml(val)}</${tag}>`;
  }

  // Complex
  const kidLines = node.children
    .map(c => rebuildXml(c, indent + '  '))
    .filter(Boolean);

  if (kidLines.length === 0 && !node.isPresent) return null;

  return `${indent}<${tag}>\n${kidLines.join('\n')}\n${indent}</${tag}>`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Public API ────────────────────────────────────────────────────────────────

exports.parseXml = (xmlBuffer) => {
  _nodeCounter = 0;
  const xmlString = xmlBuffer.toString('utf-8');

  // Step 1: Detect version and transaction type (fast parse)
  let raw;
  try {
    raw = XML_PARSER.parse(xmlString);
  } catch (e) {
    throw Object.assign(new Error('XML inválido: ' + e.message), { code: 'PARSE_ERROR' });
  }

  const root = raw.mensagemTISS;
  if (!root || typeof root !== 'object') {
    throw Object.assign(new Error('Tag raiz <mensagemTISS> não encontrada.'), { code: 'INVALID_TISS' });
  }

  const cab    = root.cabecalho ?? {};
  const idTx   = cab.identificacaoTransacao ?? {};
  const versao = String(cab.Padrao ?? '').trim();
  const tipoTransacao = String(idTx.tipoTransacao ?? '').trim();

  if (!versao) {
    throw Object.assign(new Error('Tag <Padrao> (versão TISS) ausente no XML.'), { code: 'MISSING_VERSION' });
  }

  // Step 2: Load XSD registry for this version
  const registry = getRegistry(versao);

  // Step 3: Build line-number index
  const lineIdx = buildLineIndex(xmlString);

  // Step 4: Extract XML prolog
  const prologMatch = xmlString.match(/^<\?xml[^?]*\?>/);
  const prolog = prologMatch ? prologMatch[0] : '<?xml version="1.0" encoding="ISO-8859-1"?>';

  // Step 5: Walk XML tree against schema starting from mensagemTISS
  const globalEl = registry.globalElements.get('mensagemTISS');
  const rootTypeDef = globalEl?.inlineType ?? resolveType(globalEl?.typeName, registry);

  const tree = walkNode(
    'mensagemTISS',
    root,
    rootTypeDef,
    { minOccurs: 1, maxOccurs: 1, typeName: globalEl?.typeName },
    '',
    registry,
    lineIdx
  );

  // Step 6: Collect errors
  const errors = [];
  collectErrors(tree, errors);

  return {
    metadata: { versao, tipoTransacao, prolog, totalNodes: _nodeCounter },
    tree,
    errors,
    xmlOriginal: xmlString,
  };
};

exports.rebuildXmlFromTree = (tree, prolog) => {
  const body = rebuildXml(tree, '');
  if (!body) return prolog + '\n';

  // Add TISS namespace to root element
  const withNs = body.replace(
    '<ans:mensagemTISS>',
    '<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">'
  );

  return `${prolog}\n${withNs}`;
};

exports.saveDocument = async (UserDocument, { userId, filename, rawXml, versao, tipoTransacao, errorCount, description }) => {
  const existing = await UserDocument.findOne({ where: { user_id: userId, filename } });
  if (existing) {
    await existing.update({
      raw_xml:          rawXml,
      version:          versao,
      transaction_type: tipoTransacao,
      error_count:      errorCount,
      description:      description ?? null,
    });
    return existing;
  }
  return UserDocument.create({
    user_id:          userId,
    filename:         filename || 'documento.xml',
    raw_xml:          rawXml,
    version:          versao,
    transaction_type: tipoTransacao,
    error_count:      errorCount ?? 0,
    description:      description ?? null,
  });
};

exports.listDocuments = async (UserDocument, userId) => {
  return UserDocument.findAll({
    where:      { user_id: userId },
    attributes: ['id', 'filename', 'version', 'transaction_type', 'error_count', 'created_at'],
    order:      [['created_at', 'DESC']],
  });
};

// Exposed for versionDiffService — schema traversal utilities
exports.getRegistry     = getRegistry;
exports.resolveChildren = resolveChildren;
exports.resolveType     = resolveType;
