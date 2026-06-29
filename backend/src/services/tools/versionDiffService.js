'use strict';

const { getRegistry, resolveChildren, resolveType } = require('./ideService');

// ── Schema flattener: registry → Map<xpath, fieldMeta> ───────────────────────

function flattenFields(registry) {
  const { simpleTypes } = registry;
  const fields = new Map();

  function walk(tag, xpath, typeDef, elDef, visited) {
    // Leaf node (simple type or unresolved)
    if (!typeDef || typeDef.kind === 'simple') {
      const st = elDef.typeName ? (simpleTypes.get(elDef.typeName) ?? null) : null;
      fields.set(xpath, {
        fieldName:  tag,
        typeName:   elDef.typeName ?? null,
        minOccurs:  elDef.minOccurs ?? 1,
        maxOccurs:  elDef.maxOccurs ?? 1,
        minLength:  st?.minLength ?? null,
        maxLength:  st?.maxLength ?? null,
        pattern:    st?.pattern   ?? null,
        isRequired: (elDef.minOccurs ?? 1) >= 1,
      });
      return;
    }

    // Complex node — guard against circular type references
    const key = elDef.typeName ?? xpath;
    if (visited.has(key)) return;
    const next = new Set(visited);
    next.add(key);

    const children = resolveChildren(typeDef, registry, new Set(next));
    for (const child of children) {
      if (!child.name) continue;
      const childTypeDef = child.inlineType ?? resolveType(child.typeName, registry);
      walk(child.name, `${xpath}/${child.name}`, childTypeDef, child, next);
    }
  }

  for (const [name, elDef] of registry.globalElements) {
    const typeDef = elDef.inlineType ?? resolveType(elDef.typeName, registry);
    walk(name, `/${name}`, typeDef, { ...elDef }, new Set());
  }

  return fields;
}

// ── Extract "guia type" from xpath ────────────────────────────────────────────

function extractGuiaType(xpath) {
  // /mensagemTISS/prestadorParaOperadora/loteGuias/guiaConsulta/...
  // Return the second non-empty segment (direct child of root element)
  const parts = xpath.split('/').filter(Boolean);
  return parts[1] ?? parts[0] ?? 'global';
}

// ── Diff engine ───────────────────────────────────────────────────────────────

function computeDiff(srcFields, tgtFields, sourceVersion, targetVersion) {
  const changes = [];

  // ADDs: present in target but absent from source
  for (const [xpath, meta] of tgtFields) {
    if (!srcFields.has(xpath)) {
      changes.push({
        source_version: sourceVersion,
        target_version: targetVersion,
        guia_type:      extractGuiaType(xpath),
        xpath,
        field_name:     meta.fieldName,
        change_type:    'ADD',
        description:    `Campo adicionado na versão ${targetVersion}.`,
      });
    }
  }

  // REMOVEDs: present in source but absent from target
  for (const [xpath, meta] of srcFields) {
    if (!tgtFields.has(xpath)) {
      changes.push({
        source_version: sourceVersion,
        target_version: targetVersion,
        guia_type:      extractGuiaType(xpath),
        xpath,
        field_name:     meta.fieldName,
        change_type:    'REMOVED',
        description:    `Campo removido na versão ${targetVersion}.`,
      });
    }
  }

  // MODIFIEDs: present in both but with different metadata
  for (const [xpath, srcMeta] of srcFields) {
    const tgtMeta = tgtFields.get(xpath);
    if (!tgtMeta) continue;

    const diffs = [];
    if (srcMeta.isRequired !== tgtMeta.isRequired) {
      diffs.push(
        `obrigatoriedade: ${srcMeta.isRequired ? 'Obrigatório' : 'Opcional'} → ${tgtMeta.isRequired ? 'Obrigatório' : 'Opcional'}`
      );
    }
    if (srcMeta.maxLength !== tgtMeta.maxLength) {
      diffs.push(`maxLength: ${srcMeta.maxLength ?? 'N/A'} → ${tgtMeta.maxLength ?? 'N/A'}`);
    }
    if (srcMeta.minLength !== tgtMeta.minLength) {
      diffs.push(`minLength: ${srcMeta.minLength ?? 'N/A'} → ${tgtMeta.minLength ?? 'N/A'}`);
    }
    if (srcMeta.pattern !== tgtMeta.pattern) {
      diffs.push(`padrão regex: ${srcMeta.pattern ?? 'N/A'} → ${tgtMeta.pattern ?? 'N/A'}`);
    }
    if (srcMeta.typeName !== tgtMeta.typeName) {
      diffs.push(`tipo: ${srcMeta.typeName ?? 'N/A'} → ${tgtMeta.typeName ?? 'N/A'}`);
    }

    if (diffs.length > 0) {
      changes.push({
        source_version: sourceVersion,
        target_version: targetVersion,
        guia_type:      extractGuiaType(xpath),
        xpath,
        field_name:     srcMeta.fieldName,
        change_type:    'MODIFIED',
        description:    diffs.join('; '),
      });
    }
  }

  return changes;
}

// ── Deduplicator ──────────────────────────────────────────────────────────────
// TISS reuses shared complex types (e.g. ct_DadosBeneficiario) across many
// guide structures. flattenFields expands every usage path as a distinct xpath,
// producing dozens of semantically identical entries that differ only in their
// absolute path. We collapse them by (guia_type, field_name, change_type,
// description), keeping the entry with the shortest xpath (most canonical path).

function deduplicateChanges(changes) {
  // Sort ascending by xpath length so shorter (more canonical) paths win
  const sorted = [...changes].sort((a, b) => a.xpath.length - b.xpath.length);

  const seen = new Map();
  for (const change of sorted) {
    const key = `${change.guia_type}||${change.field_name}||${change.change_type}||${change.description}`;
    if (!seen.has(key)) {
      seen.set(key, change);
    }
  }

  return Array.from(seen.values());
}

// ── Public API ────────────────────────────────────────────────────────────────

exports.generateVersionDiff = async (TissVersionChange, sourceVersion, targetVersion) => {
  // Load both registries (throws VERSION_NOT_FOUND if XSD folder missing)
  const srcRegistry = getRegistry(sourceVersion);
  const tgtRegistry = getRegistry(targetVersion);

  // Flatten both schema trees to xpath → fieldMeta maps
  const srcFields = flattenFields(srcRegistry);
  const tgtFields = flattenFields(tgtRegistry);

  // Compute raw diff (may contain duplicates from shared XSD types)
  const rawChanges = computeDiff(srcFields, tgtFields, sourceVersion, targetVersion);

  // Collapse duplicate entries that differ only in their absolute xpath
  const changes = deduplicateChanges(rawChanges);

  // Idempotent: destroy existing records for this pair before re-inserting
  await TissVersionChange.destroy({
    where: { source_version: sourceVersion, target_version: targetVersion },
  });

  if (changes.length > 0) {
    await TissVersionChange.bulkCreate(changes);
  }

  return {
    total:    changes.length,
    adds:     changes.filter(c => c.change_type === 'ADD').length,
    removed:  changes.filter(c => c.change_type === 'REMOVED').length,
    modified: changes.filter(c => c.change_type === 'MODIFIED').length,
  };
};
