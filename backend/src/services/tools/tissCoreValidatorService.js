'use strict';

/**
 * TissCoreValidatorService — Motor centralizado de validação TISS
 *
 * Layers of validation (each runs independently — all errors are accumulated):
 *   0. Syntax       — stack-scanner (all mismatched tags) + XMLValidator fallback
 *   1. XSD Schema   — libxmljs2 validates against the official ANS XSD for the
 *                     detected version; falls back to structural heuristics when
 *                     the version's XSD is unavailable
 *   2. Hash MD5     — recalculates MD5 over the transaction body and compares
 *   3. Math Audit   — quantity × unit-price × factor = valorTotal for each procedure
 */

const crypto      = require('crypto');
const fs          = require('fs');
const path        = require('path');
const { XMLParser, XMLValidator } = require('fast-xml-parser');
let libxmljs;
try { libxmljs = require('libxmljs2'); } catch (_) { /* optional — graceful degradation */ }

const SCHEMAS_BASE = path.join(__dirname, '..', '..', 'storage', 'schemas');

// ── Shared lenient parser (data extraction only) ───────────────────────────────

const PARSER = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  removeNSPrefix:      true,
  processEntities:     false,
  parseAttributeValue: false,
  parseTagValue:       false,
  trimValues:          true,
});

// ── Utilities ──────────────────────────────────────────────────────────────────

function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function fmtMoney(v) {
  if (v == null) return null;
  const n = Number(v);
  if (isNaN(n)) return null;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function versionToFolder(versionStr) {
  return 'v' + String(versionStr).replace(/\./g, '_');
}

// ── Layer 0: Syntax (stack-scanner + XMLValidator) ─────────────────────────────

function collectSyntaxErrors(xmlString) {
  const errors = [];
  const stack  = [];

  const lineIndex = [0];
  for (let i = 0; i < xmlString.length; i++) {
    if (xmlString[i] === '\n') lineIndex.push(i + 1);
  }
  function lineOf(pos) {
    let lo = 0, hi = lineIndex.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineIndex[mid] <= pos) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  }

  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([a-zA-Z][a-zA-Z0-9:._-]*)\s*>|<([a-zA-Z][a-zA-Z0-9:._-]*)([^>]*)>/g;
  let m;
  while ((m = re.exec(xmlString)) !== null) {
    const closeName = m[1];
    const openName  = m[2];
    const attrs     = m[3] ?? '';
    if (!openName && !closeName) continue;
    if (closeName) {
      if (stack.length === 0) {
        errors.push({
          layer: 'schema', code: 'xml-syntax-error',
          description: `Tag de fechamento '</${closeName}>' inesperada — nenhum elemento aberto`,
          details: `Linha ${lineOf(m.index)}`,
          line: lineOf(m.index),
        });
      } else {
        const top = stack[stack.length - 1];
        if (top.name !== closeName) {
          errors.push({
            layer: 'schema', code: 'xml-syntax-error',
            description: `Fechamento '</${closeName}>' não corresponde à abertura '<${top.name}>' (linha ${top.line})`,
            details: `Linha ${lineOf(m.index)}`,
            line: lineOf(m.index),
          });
          while (stack.length > 0 && stack[stack.length - 1].name !== closeName) stack.pop();
          if (stack.length > 0) stack.pop();
        } else {
          stack.pop();
        }
      }
    } else if (!attrs.trimEnd().endsWith('/')) {
      stack.push({ name: openName, line: lineOf(m.index) });
    }
  }
  for (const t of stack) {
    errors.push({
      layer: 'schema', code: 'xml-syntax-error',
      description: `Tag '<${t.name}>' foi aberta mas nunca fechada`,
      details: `Linha ${t.line}`,
      line: t.line,
    });
  }
  return errors;
}

function validateSyntax(xmlString) {
  const tagErrors = collectSyntaxErrors(xmlString);
  if (tagErrors.length > 0) return tagErrors;

  const result = XMLValidator.validate(xmlString, { allowBooleanAttributes: true });
  if (result !== true) {
    const { msg, line, col } = result.err;
    return [{
      layer: 'schema', code: 'xml-syntax-error',
      description: `XML malformado — ${msg}`,
      details: `Linha ${line}, coluna ${col}`,
      line,
    }];
  }
  return [];
}

// ── XSD cache (loaded once per version, then kept in memory) ──────────────────

const xsdCache = new Map();

function resolveMainXsdFile(schemaDir) {
  try {
    const files = fs.readdirSync(schemaDir);
    // Must be the root TISS envelope schema, not guides/types/webServices
    return files.find(f =>
      /^tissV\d/i.test(f) &&
      !/guia|complex|simple|web/i.test(f) &&
      f.endsWith('.xsd')
    ) ?? null;
  } catch { return null; }
}

function loadXsdDocument(versionStr) {
  const cacheKey = versionStr;
  if (xsdCache.has(cacheKey)) return xsdCache.get(cacheKey);

  const schemaDir = path.join(SCHEMAS_BASE, versionToFolder(versionStr));
  const mainFile  = resolveMainXsdFile(schemaDir);
  if (!mainFile) { xsdCache.set(cacheKey, null); return null; }

  try {
    const raw  = fs.readFileSync(path.join(schemaDir, mainFile), 'latin1');
    // Re-encode declaration so libxmljs2 accepts the string as UTF-8
    const utf8 = raw.split('ISO-8859-1').join('UTF-8');
    // baseUrl lets libxmljs2 resolve <include> / <import> schemaLocations
    const baseUrl = 'file:///' + schemaDir.replace(/\\/g, '/') + '/';
    const doc = libxmljs.parseXml(utf8, { baseUrl });
    xsdCache.set(cacheKey, doc);
    return doc;
  } catch (err) {
    console.warn(`[tissCoreValidator] Failed to load XSD for version ${versionStr}:`, err.message);
    xsdCache.set(cacheKey, null);
    return null;
  }
}

// ── XSD error translation (libxml2 English → Portuguese + suggestedFix) ───────

// Hint overrides for specific field names (supplement the generic translation)
const FIELD_HINTS = {
  CNPJ:              'O CNPJ deve conter exatamente 14 dígitos numéricos, sem pontuação.',
  numeroCNPJ:        'O CNPJ deve conter exatamente 14 dígitos numéricos, sem pontuação.',
  cnpjContratado:    'O CNPJ do contratado deve ter exatamente 14 dígitos, sem formatação.',
  CPF:               'O CPF deve conter exatamente 11 dígitos numéricos, sem pontuação.',
  registroANS:       'O Registro ANS deve conter exatamente 6 dígitos numéricos.',
  hash:              'O hash MD5 deve conter exatamente 32 caracteres hexadecimais (letras a-f e dígitos).',
  codigoProcedimento:'O código do procedimento deve seguir o padrão TUSS (numérico, 8 ou 10 dígitos).',
  Padrao:            'A versão TISS declarada em <Padrao> deve ser um dos valores homologados pela ANS (ex: 4.01.00).',
};

function stripNs(str) {
  // Remove "{http://...}" namespace prefixes from element/type names
  return str.replace(/\{[^}]+\}/g, '').trim();
}

function extractFieldName(msg) {
  const m = msg.match(/Element '([^']+)':/);
  if (!m) return null;
  return stripNs(m[1]);
}

function translateXsdError(err) {
  const { message: msg, line } = err;
  const field = extractFieldName(msg);

  // ── Pattern restriction ──────────────────────────────────────────────────
  if (msg.includes("[facet 'pattern']")) {
    const valM = msg.match(/The value '([^']+)'/);
    const patM = msg.match(/pattern '([^']+)'/);
    const val  = valM?.[1] ?? '?';
    const pat  = patM?.[1] ?? '?';
    const fix  = field && FIELD_HINTS[field]
      ? FIELD_HINTS[field]
      : `O campo <${field ?? '?'}> deve corresponder ao padrão "${pat}". Verifique o valor "${val}".`;
    return {
      layer: 'schema', code: 'xsd-pattern-violation', line, field,
      description: `<${field ?? '?'}>: valor "${val}" não corresponde ao padrão obrigatório "${pat}".`,
      details:     `Linha ${line}`,
      suggestedFix: fix,
    };
  }

  // ── maxLength restriction ────────────────────────────────────────────────
  if (msg.includes("[facet 'maxLength']")) {
    const lenM = msg.match(/length of (\d+).*?maximum length of (\d+)/s);
    const actual = lenM?.[1] ?? '?';
    const max    = lenM?.[2] ?? '?';
    return {
      layer: 'schema', code: 'xsd-maxlength-violation', line, field,
      description: `<${field ?? '?'}>: valor excede o tamanho máximo de ${max} caracteres (tamanho atual: ${actual}).`,
      details:     `Linha ${line}`,
      suggestedFix: FIELD_HINTS[field] ?? `Reduza o conteúdo de <${field ?? '?'}> para no máximo ${max} caracteres.`,
    };
  }

  // ── minLength restriction ────────────────────────────────────────────────
  if (msg.includes("[facet 'minLength']")) {
    const lenM = msg.match(/length of (\d+).*?minimum length of (\d+)/s);
    const actual = lenM?.[1] ?? '?';
    const min    = lenM?.[2] ?? '?';
    return {
      layer: 'schema', code: 'xsd-minlength-violation', line, field,
      description: `<${field ?? '?'}>: valor muito curto (${actual} caracteres; mínimo: ${min}).`,
      details:     `Linha ${line}`,
      suggestedFix: `O campo <${field ?? '?'}> deve ter ao menos ${min} caracteres.`,
    };
  }

  // ── Enumeration restriction ──────────────────────────────────────────────
  if (msg.includes("[facet 'enumeration']")) {
    const valM = msg.match(/The value '([^']+)'/);
    const val  = valM?.[1] ?? '?';
    return {
      layer: 'schema', code: 'xsd-enumeration-violation', line, field,
      description: `<${field ?? '?'}>: valor "${val}" não pertence à tabela de domínio TISS permitida.`,
      details:     `Linha ${line}`,
      suggestedFix: `Use apenas os valores homologados pela ANS para o campo <${field ?? '?'}>.`,
    };
  }

  // ── Unexpected element ───────────────────────────────────────────────────
  if (msg.includes('This element is not expected')) {
    const expM   = msg.match(/Expected is(?:[^(]+)?\(([^)]+)\)/s);
    const expected = expM ? stripNs(expM[1]).replace(/,\s*/g, ', ') : '?';
    return {
      layer: 'schema', code: 'xsd-unexpected-element', line, field,
      description: `Elemento <${field ?? '?'}> inesperado nesta posição. Esperado: ${expected}.`,
      details:     `Linha ${line}`,
      suggestedFix: 'Verifique a ordem e completude dos elementos filhos conforme o schema TISS.',
    };
  }

  // ── Missing required child ───────────────────────────────────────────────
  if (msg.includes('Missing child element')) {
    const expM   = msg.match(/Expected is(?:[^(]+)?\(([^)]+)\)/s);
    const expected = expM ? stripNs(expM[1]).replace(/,\s*/g, ', ') : '?';
    return {
      layer: 'schema', code: 'xsd-missing-element', line, field,
      description: `Elemento <${field ?? '?'}> incompleto — filho obrigatório ausente: ${expected}.`,
      details:     `Linha ${line}`,
      suggestedFix: `Adicione o elemento obrigatório ${expected} dentro de <${field ?? '?'}>.`,
    };
  }

  // ── Type mismatch ────────────────────────────────────────────────────────
  if (msg.includes('is not a valid value') || msg.includes('is not member of the value space')) {
    const valM = msg.match(/value '([^']+)'/);
    const val  = valM?.[1] ?? '?';
    return {
      layer: 'schema', code: 'xsd-type-violation', line, field,
      description: `<${field ?? '?'}>: valor "${val}" não é válido para o tipo de dado declarado no schema.`,
      details:     `Linha ${line}`,
      suggestedFix: `Verifique o tipo esperado para o campo <${field ?? '?'}> no schema TISS.`,
    };
  }

  // ── Minimum occurrences ──────────────────────────────────────────────────
  if (msg.includes('This element is not expected') === false && msg.includes('Expected')) {
    return {
      layer: 'schema', code: 'xsd-sequence-violation', line, field,
      description: `Violação de sequência no schema XSD em <${field ?? '?'}>.`,
      details:     `Linha ${line}`,
      suggestedFix: 'Verifique a ordem dos elementos filhos conforme o schema TISS.',
    };
  }

  // ── Generic fallback ─────────────────────────────────────────────────────
  return {
    layer: 'schema', code: 'xsd-schema-violation', line, field,
    description: `Violação de schema XSD no elemento <${field ?? '?'}>.`,
    details:     `Linha ${line}`,
    suggestedFix: `Verifique o campo <${field ?? '?'}> conforme o schema TISS.`,
  };
}

// ── Layer 1: XSD Schema validation (or structural heuristics as fallback) ──────

function findClosestVersion(targetVersionStr) {
  try {
    const dirs = fs.readdirSync(SCHEMAS_BASE).filter(d => d.startsWith('v'));
    // Exact match first
    const exact = dirs.find(d => d === versionToFolder(targetVersionStr));
    if (exact) return exact.slice(1).replace(/_/g, '.');
    // Then major.minor match
    const [maj, min] = targetVersionStr.split('.');
    const partial = dirs.find(d => {
      const fv = d.slice(1).replace(/_/g, '.');
      const [fm, fn] = fv.split('.');
      return fm === maj && fn === min;
    });
    if (partial) return partial.slice(1).replace(/_/g, '.');
    // Then latest major match (pick highest version with same major)
    const sameMajor = dirs.filter(d => d.startsWith(`v${maj}_`))
      .sort().reverse();
    if (sameMajor.length > 0) return sameMajor[0].slice(1).replace(/_/g, '.');
    return null;
  } catch { return null; }
}

function validateLayer1Heuristic(root, versao) {
  // Fallback structural checks when XSD is unavailable
  const errors = [];
  if (!root || typeof root !== 'object') {
    errors.push({ layer: 'schema', code: 'missing-root-element', line: null,
      description: 'Elemento raiz mensagemTISS não encontrado.', details: null });
    return errors;
  }
  if (!root.cabecalho)
    errors.push({ layer: 'schema', code: 'missing-cabecalho', line: null,
      description: 'Elemento obrigatório <cabecalho> ausente.', details: null });
  if (!versao)
    errors.push({ layer: 'schema', code: 'missing-padrao', line: null,
      description: 'Tag <Padrao> (versão TISS) não encontrada no cabeçalho.', details: null });
  if (!root.epilogo)
    errors.push({ layer: 'schema', code: 'missing-epilogo', line: null,
      description: 'Elemento obrigatório <epilogo> ausente.', details: null });
  if (!root.prestadorParaOperadora && !root.operadoraParaPrestador)
    errors.push({ layer: 'schema', code: 'missing-transaction-body', line: null,
      description: 'Nenhum bloco de transação encontrado (prestadorParaOperadora / operadoraParaPrestador).',
      details: null });
  return errors;
}

function validateXsd(xmlString, versionStr) {
  if (!libxmljs) return null; // library not installed — skip silently

  const resolvedVersion = findClosestVersion(versionStr);
  if (!resolvedVersion) return null; // no XSD available for this major version

  const xsdDoc = loadXsdDocument(resolvedVersion);
  if (!xsdDoc) return null;

  try {
    const xmlDoc = libxmljs.parseXml(xmlString);
    xmlDoc.validate(xsdDoc);
    return xmlDoc.validationErrors.map(translateXsdError);
  } catch (err) {
    console.warn('[tissCoreValidator] XSD validation runtime error:', err.message);
    return null;
  }
}

// ── Extract version string (quick regex, no full parse needed) ─────────────────

function extractVersion(xmlString) {
  const m = xmlString.match(/<(?:[a-zA-Z]+:)?Padrao>\s*([0-9.]+)\s*<\/(?:[a-zA-Z]+:)?Padrao>/);
  return m ? m[1].trim() : null;
}

// ── Extract metadata (summary) ─────────────────────────────────────────────────

function extractMetadata(root, xmlString, fileName) {
  const cab   = root.cabecalho ?? {};
  const idTx  = cab.identificacaoTransacao ?? {};

  const versao = (
    cab.Padrao   ?? cab.padrao   ??
    idTx.Padrao  ?? idTx.padrao  ?? ''
  ).toString().trim();

  const tipoTransacao = String(idTx.tipoTransacao ?? '').trim();
  const sequencial    = String(idTx.sequencialTransacao ?? '').trim();
  const registroANS   = String(cab.destino?.identificacaoOperadora?.registroANS ?? '').trim();

  const p2o   = root.prestadorParaOperadora ?? {};
  const lotes = toArray(p2o.loteGuias ?? []);
  const numLote = lotes.length > 0 ? String(lotes[0].numeroLote ?? '1') : '—';

  const GUIA_TYPES = ['guiaSP-SADT', 'guiaConsulta', 'guiaInternacao', 'guiaHonorario'];
  let tipoGuia = '—', totalGuias = 0, valorTotal = 0;

  for (const lote of lotes) {
    const gt = lote.guiasTISS ?? {};
    for (const tipo of GUIA_TYPES) {
      const guias = toArray(gt[tipo] ?? []);
      if (guias.length > 0 && tipoGuia === '—') tipoGuia = tipo;
      totalGuias += guias.length;
      for (const g of guias) {
        valorTotal += Number(g.valorTotal?.valorTotalGeral ?? 0);
      }
    }
  }

  return {
    arquivo:    fileName ?? 'arquivo.xml',
    versao,
    lote:       numLote,
    operadora:  registroANS || '—',
    tipoGuia:   tipoGuia.replace(/^guia/, ''),
    totalGuias,
    valorTotal: fmtMoney(valorTotal) ?? 'R$ 0,00',
    tipoTransacao,
    sequencial,
  };
}

// ── Layer 2: Hash MD5 ──────────────────────────────────────────────────────────

function validateHash(root, xmlString) {
  const errors   = [];
  const epilogo  = root.epilogo ?? {};
  const hashDecl = String(epilogo.hash ?? epilogo.Hash ?? '').trim();

  if (!hashDecl) {
    errors.push({ layer: 'hash', code: 'missing-hash-element', line: null, field: 'hash',
      description: 'Elemento <epilogo><hash> não encontrado — integridade não verificável.',
      details: null, suggestedFix: 'Adicione a tag <hash> dentro de <epilogo> com o MD5 do bloco de transação.' });
    return errors;
  }

  const BODY_TAGS = ['prestadorParaOperadora', 'operadoraParaPrestador'];
  let bodyXml = null;
  for (const tag of BODY_TAGS) {
    const re = new RegExp(`<(?:[a-zA-Z]+:)?${tag}[\\s\\S]*?<\\/(?:[a-zA-Z]+:)?${tag}>`);
    const m  = xmlString.match(re);
    if (m) { bodyXml = m[0]; break; }
  }

  if (!bodyXml) {
    errors.push({ layer: 'hash', code: 'hash-body-not-extractable', line: null, field: 'hash',
      description: 'Não foi possível extrair o bloco de transação para recálculo do hash.', details: null,
      suggestedFix: 'Verifique se o elemento <prestadorParaOperadora> ou <operadoraParaPrestador> está presente.' });
    return errors;
  }

  const computed = crypto.createHash('md5').update(Buffer.from(bodyXml, 'utf-8')).digest('hex');
  if (computed.toLowerCase() !== hashDecl.toLowerCase()) {
    errors.push({ layer: 'hash', code: 'hash-integrity-validation', line: null, field: 'hash',
      description: 'Hash MD5 declarado em <epilogo> diverge do hash calculado sobre o bloco de transação.',
      details: `Declarado: ${hashDecl} | Calculado: ${computed}`,
      suggestedFix: 'Use o botão "Corrigir Hash MD5" no editor para recalcular automaticamente.' });
  }

  return errors;
}

// ── Layer 3: Mathematical audit ────────────────────────────────────────────────

function auditProcedimentos(procedimentosExecutados, guiaLabel) {
  const errors = [];
  const procs  = toArray(procedimentosExecutados?.procedimentoExecutado ?? []);
  for (const p of procs) {
    const seq   = p.sequencialItem ?? '?';
    const code  = p.procedimento?.codigoProcedimento ?? p.codigoProcedimento ?? '—';
    const qtd   = Number(p.quantidadeExecutada ?? p.quantidade ?? 1);
    const vUnit = Number(p.valorUnitario ?? 0);
    const fator = Number(p.fatorReducaoAcrescimo ?? 1);
    if (vUnit === 0 || p.valorTotal == null) continue;
    const calculado = (qtd * vUnit * fator).toFixed(2);
    const declarado = parseFloat(p.valorTotal).toFixed(2);
    if (calculado !== declarado) {
      errors.push({
        layer: 'audit', code: 'audit-procedure-math-mismatch', line: null,
        field: 'valorTotal',
        description: `${guiaLabel} · Proc. seq ${seq} (TUSS ${code}): Qtd ${qtd} × Val.Unit R$ ${vUnit.toFixed(2)} × Fator ${fator.toFixed(4)} = R$ ${calculado}, mas <valorTotal> declara R$ ${declarado}.`,
        details: `Diferença: R$ ${Math.abs(parseFloat(calculado) - parseFloat(declarado)).toFixed(2)}`,
        suggestedFix: `Corrija <valorTotal> para R$ ${calculado} ou revise os campos de quantidade e valor unitário.`,
      });
    }
  }
  return errors;
}

function auditOtrasDespesas(outrasDespesasNode, guiaLabel) {
  const errors  = [];
  const despesas = toArray(outrasDespesasNode?.despesa ?? []);
  for (const d of despesas) {
    const svc   = d.servicosExecutados ?? d;
    const seq   = d.sequencialItem ?? svc.sequencialItem ?? '?';
    const code  = svc.codigoProcedimento ?? svc.codigoDespesa ?? '—';
    const qtd   = Number(svc.quantidadeExecutada ?? svc.quantidade ?? 1);
    const vUnit = Number(svc.valorUnitario ?? 0);
    if (vUnit === 0 || svc.valorTotal == null) continue;
    const calculado = (qtd * vUnit).toFixed(2);
    const declarado = parseFloat(svc.valorTotal).toFixed(2);
    if (calculado !== declarado) {
      errors.push({
        layer: 'audit', code: 'audit-expense-math-mismatch', line: null,
        field: 'valorTotal',
        description: `${guiaLabel} · Despesa seq ${seq} (cód ${code}): Qtd ${qtd} × Val.Unit R$ ${vUnit.toFixed(2)} = R$ ${calculado}, mas <valorTotal> declara R$ ${declarado}.`,
        details: `Diferença: R$ ${Math.abs(parseFloat(calculado) - parseFloat(declarado)).toFixed(2)}`,
        suggestedFix: `Corrija <valorTotal> para R$ ${calculado}.`,
      });
    }
  }
  return errors;
}

function validateAudit(root) {
  const errors = [];
  const p2o    = root.prestadorParaOperadora ?? {};
  const lotes  = toArray(p2o.loteGuias ?? []);
  const GUIA_ENTRIES = [
    { key: 'guiaSP-SADT',    label: 'SP/SADT'     },
    { key: 'guiaConsulta',   label: 'Consulta'    },
    { key: 'guiaInternacao', label: 'Internação'  },
    { key: 'guiaHonorario',  label: 'Honorários'  },
  ];
  const EPSILON = 0.015;
  let guiaIdx = 0;
  for (const lote of lotes) {
    const gt = lote.guiasTISS ?? {};
    for (const { key, label } of GUIA_ENTRIES) {
      for (const g of toArray(gt[key] ?? [])) {
        guiaIdx++;
        const cab      = g.cabecalhoGuia ?? {};
        const numGuia  = String(cab.numeroGuiaPrestador ?? cab.numeroGuia ?? guiaIdx);
        const guiaLabel = `Guia #${guiaIdx} (${label} nº ${numGuia})`;
        errors.push(...auditProcedimentos(g.procedimentosExecutados, guiaLabel));
        errors.push(...auditOtrasDespesas(g.outrasDespesas, guiaLabel));
        const vt = g.valorTotal ?? {};
        const totalGeral = Number(vt.valorTotalGeral ?? 0);
        if (totalGeral > 0) {
          const sumParts =
            Number(vt.valorProcedimentos ?? 0) + Number(vt.valorTaxasAlugueis ?? 0) +
            Number(vt.valorMateriais     ?? 0) + Number(vt.valorMedicamentos   ?? 0) +
            Number(vt.valorOPME          ?? 0) + Number(vt.valorDiarias        ?? 0);
          if (sumParts > 0 && Math.abs(totalGeral - sumParts) > EPSILON) {
            errors.push({
              layer: 'audit', code: 'audit-total-sum-mismatch', line: null,
              field: 'valorTotalGeral',
              description: `${guiaLabel}: Soma das rubricas (R$ ${sumParts.toFixed(2)}) diverge do <valorTotalGeral> (R$ ${totalGeral.toFixed(2)}).`,
              details: `Diferença: R$ ${Math.abs(totalGeral - sumParts).toFixed(2)}`,
              suggestedFix: `Ajuste <valorTotalGeral> para R$ ${sumParts.toFixed(2)} ou revise as rubricas individuais.`,
            });
          }
        }
      }
    }
  }
  return errors;
}

// ── Build failure result for syntax-stage errors ──────────────────────────────

function buildSyntaxFailureResult(fileName, syntaxErrors) {
  return {
    valid: false,
    isValid: false,
    summary: {
      arquivo: fileName ?? 'arquivo.xml', versao: '—', lote: '—',
      operadora: '—', tipoGuia: '—', totalGuias: 0,
      valorTotal: 'R$ 0,00', tipoTransacao: '—', sequencial: '—',
    },
    errors: syntaxErrors,
    errorSummary: syntaxErrors.map(e => ({ code: e.code, count: 1, description: e.description })),
    layers: {
      schema: { status: 'FAILED',  errorCount: syntaxErrors.length },
      hash:   { status: 'SKIPPED', errorCount: 0 },
      audit:  { status: 'SKIPPED', errorCount: 0 },
    },
  };
}

// ── Main entry point ───────────────────────────────────────────────────────────

/**
 * validate(xmlBuffer, fileName) → ValidationResult
 *
 * Returns a result object compatible with the existing frontend contract, plus
 * the enriched fields (line, field, suggestedFix) on each error object.
 */
exports.validate = (xmlBuffer, fileName) => {
  const xmlString = xmlBuffer.toString('utf-8');

  // ── Layer 0: Syntax ──────────────────────────────────────────────────────
  const syntaxErrors = validateSyntax(xmlString);
  if (syntaxErrors.length > 0) {
    return buildSyntaxFailureResult(fileName, syntaxErrors);
  }

  // ── Parse (lenient, data-extraction only — syntax is already clean) ──────
  let root;
  try {
    const parsed = PARSER.parse(xmlString);
    root = parsed.mensagemTISS ?? parsed;
  } catch (e) {
    return buildSyntaxFailureResult(fileName, [{
      layer: 'schema', code: 'xml-syntax-error',
      description: `Falha no parser: ${e.message}`,
      details: null, line: null,
    }]);
  }

  const versao = extractVersion(xmlString) || (
    (root?.cabecalho?.Padrao ?? root?.cabecalho?.padrao ?? '')
  ).toString().trim();

  const metadata = extractMetadata(root, xmlString, fileName);

  // ── Layer 1: XSD or structural heuristics ────────────────────────────────
  let schemaErrors;
  if (libxmljs && versao) {
    const xsdErrors = validateXsd(xmlString, versao);
    schemaErrors = xsdErrors ?? validateLayer1Heuristic(root, versao);
  } else {
    schemaErrors = validateLayer1Heuristic(root, versao);
  }

  // ── Layer 2: Hash ────────────────────────────────────────────────────────
  const hashErrors  = validateHash(root, xmlString);

  // ── Layer 3: Math Audit ──────────────────────────────────────────────────
  const auditErrors = validateAudit(root);

  const allErrors = [...schemaErrors, ...hashErrors, ...auditErrors];

  // Build deduplication summary
  const codeCounts = {};
  for (const e of allErrors) {
    codeCounts[e.code] = (codeCounts[e.code] ?? 0) + 1;
  }
  const errorSummary = Object.entries(codeCounts).map(([code, count]) => ({
    code,
    count,
    description: allErrors.find(e => e.code === code)?.description ?? code,
  }));

  return {
    valid:   allErrors.length === 0,
    isValid: allErrors.length === 0,
    summary: {
      ...metadata,
      totalErrors: allErrors.length,
    },
    errors:       allErrors,
    errorSummary,
    layers: {
      schema: { status: schemaErrors.length === 0 ? 'OK' : 'FAILED', errorCount: schemaErrors.length },
      hash:   { status: hashErrors.length   === 0 ? 'OK' : 'FAILED', errorCount: hashErrors.length   },
      audit:  { status: auditErrors.length  === 0 ? 'OK' : 'FAILED', errorCount: auditErrors.length  },
    },
  };
};

// Keep legacy export alias so tissValidatorService.js can delegate transparently
exports.validateXml = exports.validate;
