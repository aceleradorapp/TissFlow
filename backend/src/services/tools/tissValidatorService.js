'use strict';

const crypto      = require('crypto');
const fs          = require('fs');
const path        = require('path');
const { XMLParser, XMLValidator } = require('fast-xml-parser');

const SCHEMAS_BASE = path.join(__dirname, '..', '..', 'storage', 'schemas');

// ── Shared XML parser ──────────────────────────────────────────────────────────

const PARSER = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  removeNSPrefix:      true,
  processEntities:     false,
  parseAttributeValue: false,
  parseTagValue:       false,
  trimValues:          true,
});

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function schemaExists(versionStr) {
  const folder = path.join(SCHEMAS_BASE, versionToFolder(versionStr));
  return fs.existsSync(folder);
}

// ── Layer 0: strict syntax check (must run before lenient PARSER.parse) ────────

function validateSyntax(xmlString) {
  const result = XMLValidator.validate(xmlString, { allowBooleanAttributes: true });
  if (result === true) return [];
  const { code, msg, line, col } = result.err;
  return [{
    layer:       'schema',
    code:        'xml-syntax-error',
    description: `XML malformado — ${msg}`,
    details:     `Linha ${line}, coluna ${col}`,
  }];
}

function buildSyntaxFailureResult(fileName, syntaxErrors) {
  return {
    valid: false,
    summary: {
      arquivo: fileName ?? 'arquivo.xml',
      versao: '—', lote: '—', operadora: '—', tipoGuia: '—',
      totalGuias: 0, valorTotal: 'R$ 0,00', tipoTransacao: '—', sequencial: '—',
    },
    errors: syntaxErrors,
    errorSummary: syntaxErrors.map((e) => ({ code: e.code, count: 1, description: e.description })),
    layers: {
      schema: { status: 'FAILED',  errorCount: syntaxErrors.length },
      hash:   { status: 'SKIPPED', errorCount: 0 },
      audit:  { status: 'SKIPPED', errorCount: 0 },
    },
  };
}

// ── Parse raw XML (lenient — only called after validateSyntax passes) ──────────

function parseRaw(xmlString) {
  let raw;
  try {
    raw = PARSER.parse(xmlString);
  } catch (e) {
    throw Object.assign(new Error('XML mal-formado: ' + e.message), { code: 'PARSE_ERROR' });
  }
  const root = raw.mensagemTISS ?? raw;
  return { root };
}

// ── Extract envelope metadata ──────────────────────────────────────────────────

function extractMetadata(root, xmlString, fileName) {
  const cab   = root.cabecalho ?? {};
  const idTx  = cab.identificacaoTransacao ?? {};

  // version: try Padrao (case-insensitive — some generators use padrao)
  const versao = (
    cab.Padrao   ??
    cab.padrao   ??
    idTx.Padrao  ??
    idTx.padrao  ??
    ''
  ).toString().trim();

  const tipoTransacao   = String(idTx.tipoTransacao ?? '').trim();
  const sequencial      = String(idTx.sequencialTransacao ?? '').trim();
  const registroANS     = String(cab.destino?.identificacaoOperadora?.registroANS ?? '').trim();

  const p2o    = root.prestadorParaOperadora ?? {};
  const lotes  = toArray(p2o.loteGuias ?? []);
  const numLote = lotes.length > 0 ? String(lotes[0].numeroLote ?? '1') : '—';

  // Detect guia type and count
  const GUIA_TYPES = ['guiaSP-SADT', 'guiaConsulta', 'guiaInternacao', 'guiaHonorario'];
  let tipoGuia  = '—';
  let totalGuias = 0;
  let valorTotal = 0;

  for (const lote of lotes) {
    const gt = lote.guiasTISS ?? {};
    for (const tipo of GUIA_TYPES) {
      const guias = toArray(gt[tipo] ?? []);
      if (guias.length > 0 && tipoGuia === '—') tipoGuia = tipo;
      totalGuias += guias.length;
      for (const g of guias) {
        const vt = g.valorTotal ?? {};
        valorTotal += Number(vt.valorTotalGeral ?? 0);
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

// ── Layer 1: Structural / schema presence validation ───────────────────────────

function validateLayer1(root, versao) {
  const errors = [];

  if (!root || typeof root !== 'object') {
    errors.push({
      layer: 'schema',
      code:  'missing-root-element',
      description: 'Elemento raiz mensagemTISS não encontrado.',
      details: null,
    });
    return errors;
  }

  if (!root.cabecalho) {
    errors.push({
      layer: 'schema',
      code:  'missing-cabecalho',
      description: 'Elemento obrigatório <cabecalho> ausente na mensagem TISS.',
      details: null,
    });
  }

  if (!versao) {
    errors.push({
      layer: 'schema',
      code:  'missing-padrao',
      description: 'Tag <Padrao> (versão TISS) não encontrada no cabeçalho.',
      details: null,
    });
  } else if (!schemaExists(versao)) {
    // Tolerant: check major.minor match
    const majorMinor = versao.split('.').slice(0, 2).join('.');
    const schemasOnDisk = fs.existsSync(SCHEMAS_BASE)
      ? fs.readdirSync(SCHEMAS_BASE).filter((d) => d.startsWith('v'))
      : [];
    const found = schemasOnDisk.some((folder) => {
      const fv = folder.slice(1).replace(/_/g, '.');
      return fv.startsWith(majorMinor);
    });
    if (!found) {
      errors.push({
        layer: 'schema',
        code:  'unknown-tiss-version',
        description: `Versão TISS "${versao}" não possui schema registrado no sistema.`,
        details: `Versões disponíveis: ${schemasOnDisk.map(f => f.slice(1).replace(/_/g, '.')).join(', ')}`,
      });
    }
  }

  if (!root.epilogo) {
    errors.push({
      layer: 'schema',
      code:  'missing-epilogo',
      description: 'Elemento obrigatório <epilogo> ausente na mensagem TISS.',
      details: null,
    });
  }

  const hasP2O = !!root.prestadorParaOperadora;
  const hasO2P = !!root.operadoraParaPrestador;
  if (!hasP2O && !hasO2P) {
    errors.push({
      layer: 'schema',
      code:  'missing-transaction-body',
      description: 'Nenhum bloco de transação encontrado (prestadorParaOperadora / operadoraParaPrestador).',
      details: null,
    });
  }

  return errors;
}

// ── Layer 2: Hash MD5 integrity ────────────────────────────────────────────────

function validateLayer2(root, xmlString) {
  const errors = [];

  const epilogo  = root.epilogo ?? {};
  const hashDeclared = String(epilogo.hash ?? epilogo.Hash ?? '').trim();

  if (!hashDeclared) {
    errors.push({
      layer: 'hash',
      code:  'missing-hash-element',
      description: 'Elemento <epilogo><hash> não encontrado — integridade não verificável.',
      details: null,
    });
    return errors;
  }

  // Extract transaction body from raw XML string (with any namespace prefix)
  const BODY_TAGS = ['prestadorParaOperadora', 'operadoraParaPrestador'];
  let bodyXml = null;
  for (const tag of BODY_TAGS) {
    // Matches <ans:tag ...>...</ans:tag> or <tag ...>...</tag>
    const re = new RegExp(
      `<(?:[a-zA-Z]+:)?${tag}[\\s\\S]*?<\\/(?:[a-zA-Z]+:)?${tag}>`,
    );
    const m = xmlString.match(re);
    if (m) { bodyXml = m[0]; break; }
  }

  if (!bodyXml) {
    errors.push({
      layer: 'hash',
      code:  'hash-body-not-extractable',
      description: 'Não foi possível extrair o bloco de transação do XML para recálculo do hash.',
      details: null,
    });
    return errors;
  }

  const computedHash = crypto.createHash('md5').update(Buffer.from(bodyXml, 'utf-8')).digest('hex');

  if (computedHash.toLowerCase() !== hashDeclared.toLowerCase()) {
    errors.push({
      layer: 'hash',
      code:  'hash-integrity-validation',
      description: 'Hash MD5 declarado no <epilogo> diverge do hash calculado sobre o bloco de transação.',
      details: `Declarado: ${hashDeclared} | Calculado: ${computedHash}`,
    });
  }

  return errors;
}

// ── Layer 3: Mathematical audit of guias and procedures ────────────────────────

const EPSILON = 0.015; // tolerance: R$ 0,015 (rounding artefacts in TISS floats)

function auditProcedimentos(procedimentosExecutados, guiaLabel) {
  const errors = [];
  const procs  = toArray(procedimentosExecutados?.procedimentoExecutado ?? []);

  for (const p of procs) {
    const seq   = p.sequencialItem ?? '?';
    const code  = p.procedimento?.codigoProcedimento ?? p.codigoProcedimento ?? '—';
    // TISS SP-SADT uses quantidadeExecutada; fallback to quantidade for other guia types
    const qtd   = Number(p.quantidadeExecutada ?? p.quantidade ?? 1);
    const vUnit = Number(p.valorUnitario ?? 0);
    const fator = Number(p.fatorReducaoAcrescimo ?? 1);

    if (vUnit === 0) continue; // nothing to audit
    if (p.valorTotal == null) continue; // declared total absent — can't compare

    const calculado = (qtd * vUnit * fator).toFixed(2);
    const declarado = parseFloat(p.valorTotal).toFixed(2);

    if (calculado !== declarado) {
      errors.push({
        layer: 'audit',
        code:  'audit-procedure-math-mismatch',
        description: `${guiaLabel} · Proc. seq ${seq} (TUSS ${code}): Qtd ${qtd} × Val.Unit R$ ${vUnit.toFixed(2)} × Fator ${fator.toFixed(4)} = R$ ${calculado}, mas <valorTotal> declara R$ ${declarado}.`,
        details: `Diferença: R$ ${Math.abs(parseFloat(calculado) - parseFloat(declarado)).toFixed(2)}`,
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

    if (vUnit === 0) continue;
    if (svc.valorTotal == null) continue;

    const calculado = (qtd * vUnit).toFixed(2);
    const declarado = parseFloat(svc.valorTotal).toFixed(2);

    if (calculado !== declarado) {
      errors.push({
        layer: 'audit',
        code:  'audit-expense-math-mismatch',
        description: `${guiaLabel} · Despesa seq ${seq} (cód ${code}): Qtd ${qtd} × Val.Unit R$ ${vUnit.toFixed(2)} = R$ ${calculado}, mas <valorTotal> declara R$ ${declarado}.`,
        details: `Diferença: R$ ${Math.abs(parseFloat(calculado) - parseFloat(declarado)).toFixed(2)}`,
      });
    }
  }

  return errors;
}

function validateLayer3(root) {
  const errors = [];

  const p2o  = root.prestadorParaOperadora ?? {};
  const lotes = toArray(p2o.loteGuias ?? []);

  const GUIA_ENTRIES = [
    { key: 'guiaSP-SADT',    label: 'SP/SADT' },
    { key: 'guiaConsulta',   label: 'Consulta' },
    { key: 'guiaInternacao', label: 'Internação' },
    { key: 'guiaHonorario',  label: 'Honorários' },
  ];

  let guiaIdx = 0;
  for (const lote of lotes) {
    const gt = lote.guiasTISS ?? {};
    for (const { key, label } of GUIA_ENTRIES) {
      for (const g of toArray(gt[key] ?? [])) {
        guiaIdx++;
        const cab    = g.cabecalhoGuia ?? {};
        const numGuia = String(cab.numeroGuiaPrestador ?? cab.numeroGuia ?? guiaIdx);
        const guiaLabel = `Guia #${guiaIdx} (${label} nº ${numGuia})`;

        // Audit procedures
        errors.push(...auditProcedimentos(g.procedimentosExecutados, guiaLabel));
        errors.push(...auditOtrasDespesas(g.outrasDespesas, guiaLabel));

        // Audit valorTotalGeral vs sum of known sub-totals
        const vt = g.valorTotal ?? {};
        const totalGeral = Number(vt.valorTotalGeral ?? 0);
        if (totalGeral > 0) {
          const sumParts =
            Number(vt.valorProcedimentos  ?? 0) +
            Number(vt.valorTaxasAlugueis  ?? 0) +
            Number(vt.valorMateriais      ?? 0) +
            Number(vt.valorMedicamentos   ?? 0) +
            Number(vt.valorOPME          ?? 0) +
            Number(vt.valorDiarias       ?? 0);

          if (sumParts > 0) {
            const diff = Math.abs(totalGeral - sumParts);
            if (diff > EPSILON) {
              errors.push({
                layer: 'audit',
                code:  'audit-total-sum-mismatch',
                description: `${guiaLabel}: Soma das rubricas (R$ ${sumParts.toFixed(2)}) diverge do <valorTotalGeral> (R$ ${totalGeral.toFixed(2)}).`,
                details: `Diferença: R$ ${diff.toFixed(2)}`,
              });
            }
          }
        }
      }
    }
  }

  return errors;
}

// ── Public entry point ─────────────────────────────────────────────────────────

exports.validateXml = (xmlBuffer, fileName) => {
  const xmlString = xmlBuffer.toString('utf-8');

  // ── Layer 0: strict XML well-formedness (catches mismatched tags, illegal chars…)
  const syntaxErrors = validateSyntax(xmlString);
  if (syntaxErrors.length > 0) {
    return buildSyntaxFailureResult(fileName, syntaxErrors);
  }

  // Syntax is clean — proceed with lenient parser for data extraction
  const { root } = parseRaw(xmlString);

  const cab    = root.cabecalho ?? {};
  const idTx   = cab.identificacaoTransacao ?? {};
  const versao = (
    cab.Padrao  ?? cab.padrao  ??
    idTx.Padrao ?? idTx.padrao ?? ''
  ).toString().trim();

  const metadata = extractMetadata(root, xmlString, fileName);

  const schemaErrors = validateLayer1(root, versao);
  const hashErrors   = validateLayer2(root, xmlString);
  const auditErrors  = validateLayer3(root);

  const allErrors = [...schemaErrors, ...hashErrors, ...auditErrors];

  // Deduplicate error codes for summary count table
  const codeCounts = {};
  for (const e of allErrors) {
    codeCounts[e.code] = (codeCounts[e.code] ?? 0) + 1;
  }
  const errorSummary = Object.entries(codeCounts).map(([code, count]) => ({
    code,
    count,
    description: allErrors.find((e) => e.code === code)?.description ?? code,
  }));

  return {
    valid:    allErrors.length === 0,
    summary:  metadata,
    errors:   allErrors,
    errorSummary,
    layers: {
      schema: { status: schemaErrors.length === 0 ? 'OK' : 'FAILED', errorCount: schemaErrors.length },
      hash:   { status: hashErrors.length   === 0 ? 'OK' : 'FAILED', errorCount: hashErrors.length   },
      audit:  { status: auditErrors.length  === 0 ? 'OK' : 'FAILED', errorCount: auditErrors.length  },
    },
  };
};
