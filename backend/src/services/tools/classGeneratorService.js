'use strict';

const { TissVersion } = require('../../../models');
const { buildRegistry, getComplexChildren } = require('./swaggerService');
const { getEntryNode, generate: generateXml, ENTRY_PATHS } = require('./generatorService');

// ── Naming helpers ──────────────────────────────────────────────────────────

function toClassName(typeName) {
  const stripped = String(typeName).replace(/^(ct_|st_|__inline__)/, '');
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function pascalCase(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Primitive type mapping per target language ──────────────────────────────

function xsdBaseToTs(base) {
  if (/^(integer|int|long|short|byte|nonNegativeInteger|positiveInteger|unsignedInt|unsignedLong|decimal|double|float)$/i.test(base || '')) return 'number';
  if (/^boolean$/i.test(base || '')) return 'boolean';
  return 'string';
}

function xsdBaseToCSharp(base) {
  if (/^(integer|int|short|byte|nonNegativeInteger|positiveInteger|unsignedInt)$/i.test(base || '')) return 'int';
  if (/^(long|unsignedLong)$/i.test(base || '')) return 'long';
  if (/^decimal$/i.test(base || '')) return 'decimal';
  if (/^(double|float)$/i.test(base || '')) return 'double';
  if (/^boolean$/i.test(base || '')) return 'bool';
  if (/^date(time)?$/i.test(base || '')) return 'DateTime';
  return 'string';
}

function xsdBaseToGo(base) {
  if (/^(integer|int|short|byte|nonNegativeInteger|positiveInteger|unsignedInt)$/i.test(base || '')) return 'int';
  if (/^(long|unsignedLong)$/i.test(base || '')) return 'int64';
  if (/^(decimal|double|float)$/i.test(base || '')) return 'float64';
  if (/^boolean$/i.test(base || '')) return 'bool';
  return 'string';
}

function xsdBaseToPython(base) {
  if (/^(integer|int|short|byte|nonNegativeInteger|positiveInteger|unsignedInt|long|unsignedLong)$/i.test(base || '')) return 'int';
  if (/^(decimal|double|float)$/i.test(base || '')) return 'float';
  if (/^boolean$/i.test(base || '')) return 'bool';
  return 'str';
}

// ── Type-graph collection (DFS, post-order = dependencies first) ───────────
// Cycle-safe: a "visiting" sentinel (null) prevents infinite recursion while
// still letting earlier callers reference the type name being resolved.

function collectTypes(rootTypeName, registry) {
  const types = new Map();
  const order = [];

  function visit(typeName) {
    if (types.has(typeName)) return;
    types.set(typeName, null);

    const children = getComplexChildren(typeName, registry);
    const fields = [];

    for (const child of children) {
      const required = Number(child.minOccurs ?? '1') >= 1;
      const isArray  = child.maxOccurs === 'unbounded' || Number(child.maxOccurs ?? '1') > 1;

      if (child.isLeaf) {
        fields.push({
          name: child.name,
          kind: 'leaf',
          base: child.restrictions?.base || child.type || 'string',
          required,
          isArray,
          restrictions: child.restrictions,
          description: child.description,
        });
      } else if (child.type) {
        visit(child.type);
        fields.push({
          name: child.name,
          kind: 'complex',
          typeRef: child.type,
          required,
          isArray,
          description: child.description,
        });
      }
    }

    types.set(typeName, { typeName, fields });
    order.push(typeName);
  }

  visit(rootTypeName);
  return order.map((t) => types.get(t));
}

// ── Emitters ─────────────────────────────────────────────────────────────

function emitTypeScript(types) {
  const lines = [];
  for (const t of types) {
    lines.push(`export interface ${toClassName(t.typeName)} {`);
    for (const f of t.fields) {
      const optional = f.required ? '' : '?';
      let tsType = f.kind === 'leaf' ? xsdBaseToTs(f.base) : toClassName(f.typeRef);
      if (f.isArray) tsType += '[]';
      lines.push(`  ${f.name}${optional}: ${tsType};`);
    }
    lines.push('}', '');
  }
  return lines.join('\n').trimEnd() + '\n';
}

function emitCSharp(types) {
  const lines = [
    'using System;',
    'using System.Collections.Generic;',
    'using System.ComponentModel.DataAnnotations;',
    '',
    'namespace TissModels',
    '{',
  ];
  for (const t of types) {
    lines.push(`    public class ${toClassName(t.typeName)}`, '    {');
    for (const f of t.fields) {
      const propName = pascalCase(f.name);

      if (f.required) lines.push('        [Required]');
      if (f.kind === 'leaf' && f.restrictions?.maxLength) {
        lines.push(`        [StringLength(${f.restrictions.maxLength})]`);
      }

      let csType;
      if (f.kind === 'leaf') {
        csType = xsdBaseToCSharp(f.base);
        if (!f.required && csType !== 'string') csType += '?';
      } else {
        csType = toClassName(f.typeRef);
      }
      if (f.isArray) csType = `List<${csType}>`;

      lines.push(`        public ${csType} ${propName} { get; set; }`, '');
    }
    lines.push('    }', '');
  }
  lines.push('}');
  return lines.join('\n').trimEnd() + '\n';
}

function emitGo(types) {
  const lines = ['package tissmodels', ''];
  for (const t of types) {
    lines.push(`type ${toClassName(t.typeName)} struct {`);
    for (const f of t.fields) {
      const propName   = pascalCase(f.name);
      const omitempty  = f.required ? '' : ',omitempty';
      let goType = f.kind === 'leaf' ? xsdBaseToGo(f.base) : toClassName(f.typeRef);
      if (f.isArray) goType = `[]${goType}`;
      const tag = '`xml:"' + f.name + omitempty + '" json:"' + f.name + omitempty + '"`';
      lines.push(`\t${propName} ${goType} ${tag}`);
    }
    lines.push('}', '');
  }
  return lines.join('\n').trimEnd() + '\n';
}

function emitPython(types) {
  const lines = [
    'from __future__ import annotations',
    'from dataclasses import dataclass',
    'from typing import Optional, List',
    '',
  ];
  for (const t of types) {
    const ordered = [...t.fields.filter((f) => f.required), ...t.fields.filter((f) => !f.required)];
    lines.push('@dataclass', `class ${toClassName(t.typeName)}:`);
    if (!ordered.length) lines.push('    pass');
    for (const f of ordered) {
      let pyType = f.kind === 'leaf' ? xsdBaseToPython(f.base) : toClassName(f.typeRef);
      if (f.isArray) pyType = `List[${pyType}]`;
      lines.push(f.required
        ? `    ${f.name}: ${pyType}`
        : `    ${f.name}: Optional[${pyType}] = None`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

const EXTENSIONS = { csharp: 'cs', typescript: 'ts', go: 'go', python: 'py' };
const EMITTERS    = { csharp: emitCSharp, typescript: emitTypeScript, go: emitGo, python: emitPython };

// ── Public API ───────────────────────────────────────────────────────────

async function generateCode(versionId, transactionType, language) {
  const ver = await TissVersion.findByPk(Number(versionId), { attributes: ['id', 'version'] });
  if (!ver) { const e = new Error('Versão não encontrada.'); e.code = 'NOT_FOUND'; throw e; }

  if (!transactionType || !ENTRY_PATHS[transactionType]) {
    const e = new Error('Tipo de transação inválido.');
    e.code = 'BAD_REQUEST';
    throw e;
  }

  if (language === 'xml') {
    const { xml } = await generateXml(versionId, transactionType, []);
    return { code: xml, fileName: `${transactionType}.xml`, language };
  }

  const emitter = EMITTERS[language];
  if (!emitter) {
    const e = new Error('Linguagem inválida.');
    e.code = 'BAD_REQUEST';
    throw e;
  }

  const { node } = await getEntryNode(versionId, transactionType);
  if (!node?.type) {
    const e = new Error('Não foi possível resolver o tipo de entrada para esta transação.');
    e.code = 'NOT_FOUND';
    throw e;
  }

  const registry = buildRegistry(ver.version);
  const types    = collectTypes(node.type, registry);
  const code     = emitter(types);
  const fileName = `${toClassName(node.type)}.${EXTENSIONS[language]}`;

  return { code, fileName, language };
}

module.exports = { generateCode };
