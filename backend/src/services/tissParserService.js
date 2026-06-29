'use strict';

const { XMLParser } = require('fast-xml-parser');
const { TissType, TissField, TissEnum, sequelize } = require('../../models');

// ─── Parser config ────────────────────────────────────────────────────────────
// removeNSPrefix: xs:element → element (handles xs: and xsd: prefixes)
// isArray: tags marked here are ALWAYS arrays, even when singular
const xmlParser = new XMLParser({
  ignoreAttributes:   false,
  attributeNamePrefix: '@_',
  removeNSPrefix:     true,
  processEntities:    false,   // ignora declarações de entidade com '%' (presentes nos XSD da ANS)
  isArray: (tagName) =>
    [
      'element', 'complexType', 'simpleType', 'enumeration',
      'sequence', 'choice', 'all', 'restriction',
      'minLength', 'maxLength', 'pattern', 'totalDigits', 'fractionDigits',
      'annotation', 'complexContent', 'simpleContent', 'extension',
    ].includes(tagName),
  parseAttributeValue: false,
  trimValues:          true,
  cdataPropName:       '__cdata',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDoc(node) {
  if (!node?.annotation?.length) return null;
  const doc = node.annotation[0]?.documentation;
  if (!doc) return null;
  if (typeof doc === 'string') return doc.trim() || null;
  if (typeof doc === 'object') return (doc['#text'] ?? doc.__cdata ?? '').trim() || null;
  return null;
}

function parseOccurs(val, defaultVal = 1) {
  if (val === 'unbounded') return -1;
  if (val === undefined || val === null) return defaultVal;
  const n = parseInt(val, 10);
  return isNaN(n) ? defaultVal : n;
}

// Returns the first container (sequence/choice/all) from a type node,
// including those nested inside xs:complexContent > xs:extension
function getInnerContainer(typeNode) {
  if (!typeNode) return null;
  if (typeNode.sequence?.length) return typeNode.sequence[0];
  if (typeNode.choice?.length)   return typeNode.choice[0];
  if (typeNode.all?.length)      return typeNode.all[0];

  const cc = typeNode.complexContent?.[0];
  if (cc) {
    const branch = cc.extension?.[0] ?? cc.restriction?.[0];
    if (branch) {
      if (branch.sequence?.length) return branch.sequence[0];
      if (branch.choice?.length)   return branch.choice[0];
      if (branch.all?.length)      return branch.all[0];
    }
  }
  return null;
}

// ─── DB record builders ───────────────────────────────────────────────────────

async function createTissTypes(complexTypes, simpleTypes, t) {
  const typeMap = {};

  for (const [name, node] of Object.entries(complexTypes)) {
    const [rec] = await TissType.findOrCreate({
      where: { name },
      defaults: { name, type: 'complex', description: getDoc(node) },
      transaction: t,
    });
    typeMap[name] = rec.id;
  }

  for (const [name, node] of Object.entries(simpleTypes)) {
    const [rec] = await TissType.findOrCreate({
      where: { name },
      defaults: { name, type: 'simple', description: getDoc(node) },
      transaction: t,
    });
    typeMap[name] = rec.id;
  }

  return typeMap;
}

// Processes elements within a container node (sequence/choice/all)
// Returns the number of TissField records created
async function processContainer(container, parentId, versionId, typeMap, t, depth = 0) {
  if (!container || depth > 15) return 0;

  let count = 0;

  // Direct elements
  for (const el of (container.element ?? [])) {
    count += await processElement(el, parentId, versionId, typeMap, t, depth);
  }

  // Nested sub-containers (choice or all within a sequence, etc.)
  // These share the same parentId — we flatten the hierarchy level
  for (const sub of [
    ...(container.sequence ?? []),
    ...(container.choice  ?? []),
    ...(container.all     ?? []),
  ]) {
    count += await processContainer(sub, parentId, versionId, typeMap, t, depth + 1);
  }

  return count;
}

async function processElement(el, parentId, versionId, typeMap, t, depth) {
  const name = el['@_name'];
  if (!name) return 0;

  const elType    = el['@_type'] ?? null;
  const typeId    = elType ? (typeMap[elType] ?? null) : null;
  const minOccurs = parseOccurs(el['@_minOccurs'], 1);
  const maxOccurs = parseOccurs(el['@_maxOccurs'], 1);

  const field = await TissField.create({
    name,
    type_id:     typeId,
    parent_id:   parentId,
    version_id:  versionId,
    min_occurs:  minOccurs,
    max_occurs:  maxOccurs,
    is_required: minOccurs > 0,
    description: getDoc(el),
  }, { transaction: t });

  let count = 1;

  // Inline complexType inside this element
  const inlineCt = el.complexType?.[0];
  if (inlineCt) {
    const inner = getInnerContainer(inlineCt);
    if (inner) {
      count += await processContainer(inner, field.id, versionId, typeMap, t, depth + 1);
    }
  }

  return count;
}

// ─── XSD file collector ───────────────────────────────────────────────────────

function collectTypes(parsedFiles) {
  const complexTypes = {};
  const simpleTypes  = {};

  for (const parsed of parsedFiles) {
    const schema = parsed.schema ?? {};
    for (const ct of (schema.complexType ?? [])) {
      if (ct['@_name']) complexTypes[ct['@_name']] = ct;
    }
    for (const st of (schema.simpleType ?? [])) {
      if (st['@_name']) simpleTypes[st['@_name']] = st;
    }
  }

  return { complexTypes, simpleTypes };
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function parseAndIngest(fileBuffers, versionId) {
  const t = await sequelize.transaction();

  try {
    // Parse each XSD buffer — sanitiza antes para remover DOCTYPE/ENTITY que
    // o fast-xml-parser interpreta em baixo nível antes de respeitar as config
    const parsedFiles = fileBuffers.map((buf) => {
      const xmlString  = buf.toString('utf-8');
      const cleanedXml = xmlString
        .replace(/<!DOCTYPE[^[>]*(\[[^\]]*\])?>/gi, '')
        .replace(/<!ENTITY[^>]*>/gi, '');
      return xmlParser.parse(cleanedXml);
    });

    // Collect all named types across all files (handles cross-file references)
    const { complexTypes, simpleTypes } = collectTypes(parsedFiles);

    // Phase 1: create TissType records
    const typeMap = await createTissTypes(complexTypes, simpleTypes, t);

    let fieldsCreated = 0;
    let enumsCreated  = 0;

    // Phase 2: create TissField records for simpleTypes
    for (const [name, st] of Object.entries(simpleTypes)) {
      const restriction = st.restriction?.[0];
      if (!restriction) continue;

      const rawMin = restriction.minLength?.[0]?.['@_value'] ?? null;
      const rawMax = restriction.maxLength?.[0]?.['@_value'] ?? null;
      const rawPat = restriction.pattern?.[0]?.['@_value']   ?? null;

      const field = await TissField.create({
        name,
        type_id:       typeMap[name] ?? null,
        parent_id:     null,
        version_id:    versionId,
        min_length:    rawMin ? parseInt(rawMin, 10) : null,
        max_length:    rawMax ? parseInt(rawMax, 10) : null,
        pattern_regex: rawPat,
        is_required:   false,
        description:   getDoc(st),
      }, { transaction: t });
      fieldsCreated++;

      // Enumerations
      for (const en of (restriction.enumeration ?? [])) {
        const value = en['@_value'];
        if (!value) continue;
        await TissEnum.create({
          field_id:    field.id,
          value,
          description: getDoc(en),
        }, { transaction: t });
        enumsCreated++;
      }
    }

    // Phase 3: create TissField records for complexTypes
    for (const [name, ct] of Object.entries(complexTypes)) {
      // Root field represents the complexType itself
      const rootField = await TissField.create({
        name,
        type_id:     typeMap[name] ?? null,
        parent_id:   null,
        version_id:  versionId,
        is_required: false,
        description: getDoc(ct),
      }, { transaction: t });
      fieldsCreated++;

      const container = getInnerContainer(ct);
      if (container) {
        fieldsCreated += await processContainer(container, rootField.id, versionId, typeMap, t);
      }
    }

    await t.commit();

    return {
      typesCreated:  Object.keys(complexTypes).length + Object.keys(simpleTypes).length,
      fieldsCreated,
      enumsCreated,
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = { parseAndIngest };
