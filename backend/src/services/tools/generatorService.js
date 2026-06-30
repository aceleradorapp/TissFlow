'use strict';

const { TissVersion } = require('../../../models');
const { buildRegistry, getComplexChildren, mapElement } = require('./swaggerService');

// ── Transaction type → XSD navigation path ────────────────────────────────
// Each value is the sequence of element names from the root type down to the entry node.

const ENTRY_PATHS = {
  ENVIO_LOTE_GUIAS:           ['prestadorParaOperadora', 'loteGuias'],
  ENVIO_RECURSO_GLOSA:        ['prestadorParaOperadora', 'recursoGlosa'],
  SOLICITACAO_ELEGIBILIDADE:  ['prestadorParaOperadora', 'solicitacaoElegibilidade'],
  RESPOSTA_ELEGIBILIDADE:     ['operadoraParaPrestador', 'respostaElegibilidade'],
  AUTORIZACAO_SOLICITACAO:    ['operadoraParaPrestador', 'autorizacaoSolicitacao'],
};

// ── Navigate the XSD tree to find the node at the end of pathSegments ─────

function resolveNodeAtPath(rootTypeName, pathSegments, registry) {
  let currentType = rootTypeName;

  for (let i = 0; i < pathSegments.length; i++) {
    const seg      = pathSegments[i];
    const children = getComplexChildren(currentType, registry);
    const child    = children.find((c) => c.name === seg);
    if (!child) return null;

    if (i === pathSegments.length - 1) {
      // Last segment = entry node found
      return { node: child, type: child.type ?? currentType };
    }

    if (child.isLeaf || !child.type) return null; // can't go deeper through leaf
    currentType = child.type;
  }
  return null;
}

// ── Contextual fake data ───────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }

const FAKES = [
  [/registroans/i,                          '999999'],
  [/cnpj/i,                                 '12345678000195'],
  [/cpf/i,                                  '12345678901'],
  [/cnes/i,                                 '1234567'],
  [/numerocarteira|carteira/i,              '123456789012'],
  [/atendimento.*rn|rn.*atendimento/i,      'N'],
  [/codigoprocedimento|codigosolicit/i,     '30101012'],
  [/codigobenef/i,                          '0000123456789'],
  [/codigooperadora/i,                      '999999'],
  [/codigo|cod/i,                           '001'],
  [/seqtransacao|sequenciatransacao/i,      '1'],
  [/sequencia|seq/i,                        '1'],
  [/datanascimento/i,                       '1980-05-15'],
  [/dataatend|datarealiz|datainicio|datafim|dataprest|dataemis/i, today],
  [/data|date/i,                            today],
  [/hora|time/i,                            '08:30:00'],
  [/ans$/i,                                 '999999'],
  [/cep/i,                                  '01310100'],
  [/uf|estado/i,                            'SP'],
  [/municipio|cidade|ibge/i,                '3550308'],
  [/telefone|fone|phone/i,                  '11912345678'],
  [/email/i,                                'paciente@example.com'],
  [/nomesocial/i,                           'NOME SOCIAL EXEMPLO'],
  [/nomebenef|nomepac|nomedobenef/i,        'PACIENTE EXEMPLO'],
  [/nomecontratado|nomeprestador/i,         'CLINICA EXEMPLO LTDA'],
  [/nome|name/i,                            'NOME EXEMPLO'],
  [/valorprocedimento|valortotal|valor/i,   '150.00'],
  [/versao|version/i,                       '4.01.00'],
  [/plano/i,                                '8000'],
  [/matricula|registro/i,                   '0000001234567890'],
  [/tipousuario|tipo/i,                     '1'],
  [/indicador|flag/i,                       'S'],
  [/observ/i,                               'Sem observacoes'],
  [/numero|num/i,                           '00001'],
];

function fakeValue(name, restrictions) {
  const r = restrictions;
  if (r?.enums?.length) return r.enums[0].value;
  for (const [pat, val] of FAKES) {
    if (pat.test(name)) return typeof val === 'function' ? val() : val;
  }
  if (r?.pattern)     return r.pattern.replace(/[\[\](){}\\^$|?*+.]/g, '').slice(0, 14) || 'XXXX';
  if (r?.maxLength)   return 'X'.repeat(Math.min(Number(r.maxLength), 12));
  if (r?.totalDigits) return '1'.repeat(Math.min(Number(r.totalDigits), 8));
  return 'VALOR';
}

function escXml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Recursive builders ────────────────────────────────────────────────────

function buildXml(typeName, registry, activeSet, currentPath, visited, depth) {
  if (depth > 12 || visited.has(typeName)) return '';
  const next = new Set(visited); next.add(typeName);
  const children = getComplexChildren(typeName, registry);
  const pad = '  '.repeat(depth + 1);
  let out = '';

  for (const child of children) {
    const childPath = `${currentPath}.${child.name}`;
    const required  = Number(child.minOccurs ?? '1') >= 1;
    if (!required && !activeSet.has(childPath)) continue;

    if (child.isLeaf) {
      out += `${pad}<ans:${child.name}>${escXml(fakeValue(child.name, child.restrictions))}</ans:${child.name}>\n`;
    } else if (child.type && !next.has(child.type)) {
      const inner = buildXml(child.type, registry, activeSet, childPath, next, depth + 1);
      out += `${pad}<ans:${child.name}>\n${inner}${pad}</ans:${child.name}>\n`;
    }
  }
  return out;
}

function buildJson(typeName, registry, activeSet, currentPath, visited, depth) {
  if (depth > 12 || visited.has(typeName)) return {};
  const next = new Set(visited); next.add(typeName);
  const children = getComplexChildren(typeName, registry);
  const obj = {};

  for (const child of children) {
    const childPath = `${currentPath}.${child.name}`;
    const required  = Number(child.minOccurs ?? '1') >= 1;
    if (!required && !activeSet.has(childPath)) continue;

    if (child.isLeaf) {
      obj[child.name] = fakeValue(child.name, child.restrictions);
    } else if (child.type && !next.has(child.type)) {
      obj[child.name] = buildJson(child.type, registry, activeSet, childPath, next, depth + 1);
    }
  }
  return obj;
}

// ── Resolve root info from registry ───────────────────────────────────────

function getRootInfo(registry) {
  let rootName = 'mensagemTISS';
  let rootType = 'ct_mensagemTISS';
  if (registry.rootElement) {
    const mapped = mapElement(registry.rootElement, registry);
    if (mapped) { rootName = mapped.name; rootType = mapped.type ?? 'ct_mensagemTISS'; }
  }
  return { rootName, rootType };
}

// ── Public API ─────────────────────────────────────────────────────────────

// Returns the entry node info for a given transaction type (for frontend tree root)
async function getEntryNode(versionId, transactionType) {
  const ver = await TissVersion.findByPk(Number(versionId), { attributes: ['id', 'version'] });
  if (!ver) { const e = new Error('Versão não encontrada.'); e.code = 'NOT_FOUND'; throw e; }

  const pathSegments = ENTRY_PATHS[transactionType];
  if (!pathSegments) {
    const e = new Error('Tipo de transação inválido.');
    e.code = 'BAD_REQUEST';
    throw e;
  }

  const registry = buildRegistry(ver.version);
  const { rootType } = getRootInfo(registry);

  const result = resolveNodeAtPath(rootType, pathSegments, registry);
  if (!result) {
    const e = new Error(
      `Caminho "${pathSegments.join(' > ')}" não encontrado na versão TISS ${ver.version}. ` +
      `Esta transação pode não existir nesta versão.`
    );
    e.code = 'NOT_FOUND';
    throw e;
  }

  return {
    node:     { ...result.node, path: result.node.name },
    fullPath: `mensagemTISS.${pathSegments.join('.')}`,
  };
}

// Generates XML and JSON for the chosen transaction type
async function generate(versionId, transactionType, activeOptionalPaths) {
  const ver = await TissVersion.findByPk(Number(versionId), { attributes: ['id', 'version'] });
  if (!ver) { const e = new Error('Versão não encontrada.'); e.code = 'NOT_FOUND'; throw e; }

  const registry = buildRegistry(ver.version);
  const { rootName, rootType } = getRootInfo(registry);
  const activeSet = new Set((activeOptionalPaths ?? []).map(String));

  const pathSegments = transactionType ? (ENTRY_PATHS[transactionType] ?? []) : [];

  // ── No transaction type: generate full tree ─────────────────────────
  if (!pathSegments.length) {
    const inner = buildXml(rootType, registry, activeSet, rootName, new Set(), 0);
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">',
      inner.trimEnd(),
      '</ans:mensagemTISS>',
    ].join('\n');
    const json = JSON.stringify(
      { mensagemTISS: buildJson(rootType, registry, activeSet, rootName, new Set(), 0) },
      null, 2,
    );
    return { xml, json };
  }

  // ── Contextual generation ───────────────────────────────────────────
  const wrapperName  = pathSegments[0];                        // e.g. "prestadorParaOperadora"
  const entryName    = pathSegments[pathSegments.length - 1];  // e.g. "loteGuias"
  const entryResult  = resolveNodeAtPath(rootType, pathSegments, registry);
  const entryType    = entryResult?.type ?? null;
  // entryDepth: how many levels down the entry node is (depth of loteGuias = 2)
  const entryDepth   = pathSegments.length;

  const rootChildren = getComplexChildren(rootType, registry);
  const xmlLines     = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">',
  ];
  const jsonMensagem = {};

  for (const child of rootChildren) {
    const isRequired = Number(child.minOccurs ?? '1') >= 1;

    if (child.name === wrapperName) {
      // Transaction wrapper with ONLY the specific entry node
      xmlLines.push(`  <ans:${wrapperName}>`);
      jsonMensagem[wrapperName] = {};

      if (entryType) {
        const entryPad = '  '.repeat(entryDepth);
        const entryInner = buildXml(entryType, registry, activeSet, entryName, new Set(), entryDepth);
        xmlLines.push(`${entryPad}<ans:${entryName}>`);
        if (entryInner.trimEnd()) xmlLines.push(entryInner.trimEnd());
        xmlLines.push(`${entryPad}</ans:${entryName}>`);
        jsonMensagem[wrapperName][entryName] = buildJson(
          entryType, registry, activeSet, entryName, new Set(), entryDepth,
        );
      }

      xmlLines.push(`  </ans:${wrapperName}>`);
    } else if (isRequired) {
      // Required siblings (cabecalho, epilogo) — generate fully, no optional filtering
      if (child.isLeaf) {
        const val = fakeValue(child.name, child.restrictions);
        xmlLines.push(`  <ans:${child.name}>${escXml(val)}</ans:${child.name}>`);
        jsonMensagem[child.name] = val;
      } else if (child.type) {
        const visited = new Set([rootType]);
        const inner   = buildXml(child.type, registry, new Set(), child.name, visited, 0);
        xmlLines.push(`  <ans:${child.name}>`);
        if (inner.trimEnd()) xmlLines.push(inner.trimEnd());
        xmlLines.push(`  </ans:${child.name}>`);
        jsonMensagem[child.name] = buildJson(
          child.type, registry, new Set(), child.name, new Set([rootType]), 0,
        );
      }
    }
  }

  xmlLines.push('</ans:mensagemTISS>');
  return {
    xml:  xmlLines.join('\n'),
    json: JSON.stringify({ mensagemTISS: jsonMensagem }, null, 2),
  };
}

module.exports = { generate, getEntryNode, ENTRY_PATHS };
