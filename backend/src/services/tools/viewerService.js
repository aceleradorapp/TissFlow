'use strict';

const { XMLParser } = require('fast-xml-parser');

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCnpj(v) {
  if (!v) return null;
  const s = String(v).replace(/\D/g, '').padStart(14, '0');
  return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8,12)}-${s.slice(12)}`;
}

function fmtDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return s;
}

function fmtMoney(v) {
  if (v == null) return null;
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Array coercion (fast-xml-parser returns object when only one element) ────

function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

// ── Labels ────────────────────────────────────────────────────────────────────

const TIPO_TRANSACAO_LABEL = {
  ENVIO_LOTE_GUIAS:           'Envio de Lote de Guias',
  ENVIO_RECURSO_GLOSA:        'Recurso de Glosa',
  SOLICITACAO_ELEGIBILIDADE:  'Solicitação de Elegibilidade',
  RESPOSTA_ELEGIBILIDADE:     'Resposta de Elegibilidade',
  AUTORIZACAO_SOLICITACAO:    'Autorização de Solicitação',
};

const TABELA_LABEL = {
  '0':  'TUSS',
  '10': 'Honorários Médicos',
  '18': 'Materiais e OPMEs',
  '19': 'Soluções Parenterais',
  '20': 'Taxas e Diárias',
  '22': 'TUSS-Terminologia',
  '90': 'Tabela Própria da Operadora',
  '98': 'CBHPM',
  '99': 'Tabela Própria',
};

const TIPO_CONSULTA_LABEL = {
  '1': 'Primeira consulta',
  '2': 'Retorno',
  '3': 'Pré-natal',
};

const TIPO_ATEND_LABEL = {
  '01': 'Remoção',
  '02': 'Pequena cirurgia',
  '03': 'Terapias',
  '04': 'Consulta',
  '05': 'Exame isolado',
  '06': 'Atendimento domiciliar',
  '07': 'Internação',
  '08': 'Quimioterapia',
  '09': 'Radioterapia',
  '10': 'TRS-Terapia Renal Substitutiva',
  '11': 'Pronto socorro',
  '12': 'Ocupacional',
  '13': 'Buco-dental',
  '14': 'Diagnose',
  '15': 'Parto',
};

const REGIME_LABEL = {
  '01': 'Ambulatorial',
  '02': 'Internação',
  '03': 'SADT',
  '04': 'Urgência',
  '05': 'Internação domiciliar',
  '06': 'Internação-dia',
  '07': 'Internação parcial manhã',
  '08': 'Internação parcial tarde',
  '09': 'Internação parcial noite',
  '10': 'Hospital-dia',
};

const ACIDENTE_LABEL = {
  '0': 'Não acidente',
  '1': 'Acidente / doença do trabalho',
  '2': 'Acidente no trajeto',
  '3': 'Outro tipo de acidente',
  '9': 'Não identificado',
};

// ── Guia parsers ──────────────────────────────────────────────────────────────

function parseProcedimentos(executados) {
  return toArray(executados?.procedimentoExecutado ?? []).map((p, i) => {
    const equipe = toArray(p.equipeSadt ?? []).map((e) => ({
      nome:    e.nomeProf ?? null,
      conselho: e.conselho ? String(e.conselho) : null,
      numero:   e.numeroConselhoProfissional ? String(e.numeroConselhoProfissional) : null,
      uf:       e.UF ? String(e.UF) : null,
      cbos:     e.CBOS ? String(e.CBOS) : null,
    }));

    return {
      seq:          Number(p.sequencialItem ?? i + 1),
      dataExecucao: fmtDate(p.dataExecucao),
      horaInicial:  p.horaInicial ? String(p.horaInicial) : null,
      horaFinal:    p.horaFinal   ? String(p.horaFinal)   : null,
      tabela:       String(p.procedimento?.codigoTabela ?? ''),
      tabelaLabel:  TABELA_LABEL[String(p.procedimento?.codigoTabela ?? '')] ?? null,
      codigo:       String(p.procedimento?.codigoProcedimento ?? p.codigoProcedimento ?? ''),
      descricao:    p.procedimento?.descricaoProcedimento ?? p.descricaoProcedimento ?? null,
      quantidade:   Number(p.quantidade ?? 1),
      valorUnit$:   fmtMoney(p.valorUnitario),
      valorTotal$:  fmtMoney(Number(p.valorUnitario ?? 0) * Number(p.quantidade ?? 1)),
      fatorUc:      p.fatorMultiplicador ?? null,
      via:          p.viaAcesso ?? null,
      tecnica:      p.tecnicaUtilizada ?? null,
      equipe,
    };
  });
}

// outrasDespesas structure: outrasDespesas > despesa > servicosExecutados
function parseOutrasDespesas(outrasDespesasNode) {
  const despesas = toArray(outrasDespesasNode?.despesa ?? []);
  return despesas.map((d, i) => {
    // servicosExecutados holds the item data; fall back to despesa root for older layouts
    const svc = d.servicosExecutados ?? d;
    const qtd = Number(svc.quantidadeExecutada ?? svc.quantidade ?? 1);
    const vUnit = Number(svc.valorUnitario ?? 0);
    const vTotal = svc.valorTotal != null ? Number(svc.valorTotal) : vUnit * qtd;
    return {
      seq:            Number(d.sequencialItem ?? svc.sequencialItem ?? i + 1),
      codigoTabela:   String(svc.codigoTabela ?? ''),
      tabelaLabel:    TABELA_LABEL[String(svc.codigoTabela ?? '')] ?? null,
      codigoDespesa:  String(svc.codigoProcedimento ?? svc.codigoDespesa ?? ''),
      descricao:      svc.descricaoProcedimento ?? svc.descricao ?? null,
      quantidade:     qtd,
      valorUnit$:     fmtMoney(svc.valorUnitario),
      valorTotal$:    fmtMoney(vTotal),
      registroANVISA: svc.registroANVISA ? String(svc.registroANVISA) : null,
      unidadeMedida:  svc.unidadeMedida ?? null,
    };
  });
}

function parseGuiaSPSADT(g) {
  const cab     = g.cabecalhoGuia ?? {};
  const aut     = g.dadosAutorizacao ?? {};
  const ben     = g.dadosBeneficiario ?? {};
  const sol     = g.dadosSolicitante ?? {};
  const contSol = sol.contratadoSolicitante ?? {};
  const profSol = sol.profissionalSolicitante ?? {};
  // dadosExecutante wraps contratadoExecutante per TISS XSD
  const dExe    = g.dadosExecutante ?? {};
  const exe     = dExe.contratadoExecutante ?? dExe;
  const atd     = g.dadosAtendimento ?? {};
  const vl      = g.valorTotal ?? {};

  // tipoAtendimento uses different tag names across TISS versions
  const tipoAtdCode = String(atd.tipoAtendimento ?? atd.tpAtendimento ?? '');
  const acidenteCode = String(atd.indicacaoAcidente ?? '');
  const regimeCode   = String(atd.regimeAtendimento ?? '');

  return {
    tipo:      'SP-SADT',
    tipoLabel: 'SP/SADT',
    numeroGuia:  String(cab.numeroGuiaPrestador ?? cab.numeroGuia ?? '—'),
    registroANS: cab.registroANS ? String(cab.registroANS) : null,

    autorizacao: {
      numeroGuia:      aut.numeroGuiaOperadora ? String(aut.numeroGuiaOperadora)
                         : (cab.numeroGuiaOperadora ? String(cab.numeroGuiaOperadora) : null),
      dataAutorizacao: fmtDate(aut.dataAutorizacao),
      senha:           aut.senha ? String(aut.senha) : null,
    },

    beneficiario: {
      carteira:      ben.numeroCarteira ? String(ben.numeroCarteira) : null,
      nome:          ben.nomeBeneficiario ?? null,
      nascimento:    fmtDate(ben.dataNascimento),
      cartaoNac:     ben.cartaoNacionalSaude ? String(ben.cartaoNacionalSaude) : null,
      atendimentoRN: ben.atendimentoRN ? String(ben.atendimentoRN) : null,
    },

    solicitante: {
      nome:              contSol.nomeContratado ?? null,
      cnpj:              fmtCnpj(contSol.cnpjContratado),
      codigoNaOperadora: contSol.codigoPrestadorNaOperadora
                           ? String(contSol.codigoPrestadorNaOperadora) : null,
      profissionalNome:  profSol.nomeProfissional ?? null,
      conselho:          profSol.conselho ? String(profSol.conselho) : null,
      numeroConselho:    profSol.numeroConselho ? String(profSol.numeroConselho) : null,
      ufConselho:        profSol.UF ? String(profSol.UF) : null,
      cbos:              profSol.CBOS ? String(profSol.CBOS)
                           : (profSol.codigoCBO ? String(profSol.codigoCBO) : null),
    },

    executante: {
      nome:              exe.nomeContratado ?? null,
      cnpj:              fmtCnpj(exe.cnpjContratado),
      cnes:              exe.codigoCNES ? String(exe.codigoCNES) : null,
      codigoNaOperadora: exe.codigoPrestadorNaOperadora ? String(exe.codigoPrestadorNaOperadora) : null,
    },

    atendimento: {
      data:             fmtDate(atd.dataAtendimento ?? atd.periodoAtendimento?.dataInicial),
      tipo:             tipoAtdCode || null,
      tipoLabel:        TIPO_ATEND_LABEL[tipoAtdCode] ?? null,
      regime:           REGIME_LABEL[regimeCode] ?? (regimeCode || null),
      tipoConsulta:     atd.tipoConsulta ? String(atd.tipoConsulta) : null,
      tipoConsultaLabel: TIPO_CONSULTA_LABEL[String(atd.tipoConsulta ?? '')] ?? null,
      acidente:         ACIDENTE_LABEL[acidenteCode] ?? (acidenteCode || null),
      profissional:     atd.nomeProfissional ?? null,
      cbo:              atd.codigoCBO ? String(atd.codigoCBO) : null,
    },

    procedimentos:  parseProcedimentos(g.procedimentosExecutados),
    outrasDespesas: parseOutrasDespesas(g.outrasDespesas),
    observacao:     g.observacao ? String(g.observacao) : null,

    valorTotal: {
      geral:        fmtMoney(vl.valorTotalGeral),
      proc:         fmtMoney(vl.valorProcedimentos),
      taxas:        fmtMoney(vl.valorTaxasAlugueis),
      materiais:    fmtMoney(vl.valorMateriais),
      medicamentos: fmtMoney(vl.valorMedicamentos),
      opme:         fmtMoney(vl.valorOPME),
      diarias:      fmtMoney(vl.valorDiarias),
    },
  };
}

function parseGuiaConsulta(g) {
  const cab = g.cabecalhoGuia ?? {};
  const aut = g.dadosAutorizacao ?? {};
  const ben = g.dadosBeneficiario ?? {};
  const dad = g.dadosConsulta ?? {};
  const vl  = g.valorTotal ?? {};

  const contExe = dad.contratadoExecutante ?? {};

  return {
    tipo:      'CONSULTA',
    tipoLabel: 'Consulta',
    numeroGuia:  String(cab.numeroGuiaPrestador ?? '—'),
    registroANS: cab.registroANS ? String(cab.registroANS) : null,

    autorizacao: {
      numeroGuia:      aut.numeroGuiaOperadora ? String(aut.numeroGuiaOperadora)
                         : (cab.numeroGuiaOperadora ? String(cab.numeroGuiaOperadora) : null),
      dataAutorizacao: fmtDate(aut.dataAutorizacao),
      senha:           aut.senha ? String(aut.senha) : null,
    },

    beneficiario: {
      carteira:   ben.numeroCarteira ? String(ben.numeroCarteira) : null,
      nome:       ben.nomeBeneficiario ?? null,
      nascimento: fmtDate(ben.dataNascimento),
      cartaoNac:  ben.cartaoNacionalSaude ? String(ben.cartaoNacionalSaude) : null,
    },

    solicitante: null,

    executante: {
      nome: contExe.nomeContratado ?? null,
      cnpj: fmtCnpj(contExe.cnpjContratado),
      cnes: contExe.codigoCNES ? String(contExe.codigoCNES) : null,
      codigoNaOperadora: contExe.codigoPrestadorNaOperadora ? String(contExe.codigoPrestadorNaOperadora) : null,
    },

    atendimento: {
      data:             fmtDate(dad.dataAtendimento),
      tipo:             dad.tipoConsulta ? String(dad.tipoConsulta) : null,
      tipoLabel:        null,
      tipoConsulta:     dad.tipoConsulta ? String(dad.tipoConsulta) : null,
      tipoConsultaLabel: TIPO_CONSULTA_LABEL[String(dad.tipoConsulta ?? '')] ?? null,
      acidente:         null,
      regime:           null,
      profissional:     dad.nomeProfissional ?? null,
      cbo:              dad.codigoCBO ? String(dad.codigoCBO) : null,
    },

    procedimentos: toArray(dad.procedimento ?? []).map((p, i) => ({
      seq:         i + 1,
      dataExecucao: null,
      horaInicial: null,
      horaFinal:   null,
      tabela:      String(p.codigoTabela ?? ''),
      tabelaLabel: TABELA_LABEL[String(p.codigoTabela ?? '')] ?? null,
      codigo:      String(p.codigoProcedimento ?? ''),
      descricao:   p.descricaoProcedimento ?? null,
      quantidade:  1,
      valorUnit$:  null,
      valorTotal$: null,
      equipe:      [],
    })),

    outrasDespesas: [],
    observacao:     g.observacao ? String(g.observacao) : null,
    valorTotal: {
      geral:        fmtMoney(vl.valorTotalGeral),
      proc:         fmtMoney(vl.valorProcedimentos),
      taxas:        null,
      materiais:    null,
      medicamentos: null,
      opme:         null,
      diarias:      null,
    },
  };
}

function parseGuiaInternacao(g) {
  const cab = g.cabecalhoGuia ?? {};
  const aut = g.dadosAutorizacao ?? {};
  const ben = g.dadosBeneficiario ?? {};
  const dad = g.dadosInternacao ?? {};
  const vl  = g.valorTotal ?? {};

  return {
    tipo:      'INTERNACAO',
    tipoLabel: 'Internação',
    numeroGuia:  String(cab.numeroGuiaPrestador ?? '—'),
    registroANS: null,

    autorizacao: {
      numeroGuia:      aut.numeroGuiaOperadora ? String(aut.numeroGuiaOperadora) : null,
      dataAutorizacao: fmtDate(aut.dataAutorizacao),
      senha:           aut.senha ? String(aut.senha) : null,
    },

    beneficiario: {
      carteira:   ben.numeroCarteira ? String(ben.numeroCarteira) : null,
      nome:       ben.nomeBeneficiario ?? null,
      nascimento: fmtDate(ben.dataNascimento),
      cartaoNac:  ben.cartaoNacionalSaude ? String(ben.cartaoNacionalSaude) : null,
    },

    solicitante: null,
    executante:  null,

    atendimento: {
      data:         fmtDate(dad.dataInicial ?? dad.dataInicioInternacao),
      tipo:         null,
      tipoLabel:    null,
      regime:       null,
      tipoConsulta: null,
      tipoConsultaLabel: null,
      acidente:     null,
      profissional: null,
      cbo:          null,
    },

    procedimentos:  parseProcedimentos(g.procedimentosExecutados),
    outrasDespesas: parseOutrasDespesas(g.outrasDespesas),
    observacao:     g.observacao ? String(g.observacao) : null,
    valorTotal: {
      geral:        fmtMoney(vl.valorTotalGeral),
      proc:         fmtMoney(vl.valorProcedimentos),
      taxas:        fmtMoney(vl.valorTaxasAlugueis),
      materiais:    fmtMoney(vl.valorMateriais),
      medicamentos: fmtMoney(vl.valorMedicamentos),
      opme:         fmtMoney(vl.valorOPME),
      diarias:      fmtMoney(vl.valorDiarias),
    },
  };
}

// ── Validação estrutural básica ────────────────────────────────────────────────

function validateGuia(g, idx) {
  const warnings = [];
  const prefix = `Guia #${idx + 1} (${g.tipoLabel} nº ${g.numeroGuia})`;

  if (!g.beneficiario?.nome)     warnings.push(`${prefix}: nome do beneficiário ausente.`);
  if (!g.beneficiario?.carteira) warnings.push(`${prefix}: número de carteira ausente.`);
  if (!g.atendimento?.data)      warnings.push(`${prefix}: data de atendimento ausente.`);
  if (!g.procedimentos?.length)  warnings.push(`${prefix}: nenhum procedimento encontrado.`);
  if (!g.valorTotal?.geral)      warnings.push(`${prefix}: valor total não informado.`);

  return warnings;
}

// ── Exportação principal ──────────────────────────────────────────────────────

exports.parseXml = (xmlBuffer) => {
  const xmlString = xmlBuffer.toString('utf-8');

  const parser = new XMLParser({
    ignoreAttributes:    false,
    attributeNamePrefix: '@_',
    removeNSPrefix:      true,
    processEntities:     false,
    parseAttributeValue: false,
    parseTagValue:       false,
    trimValues:          true,
    cdataPropName:       '__cdata',
  });

  let raw;
  try {
    raw = parser.parse(xmlString);
  } catch (e) {
    throw Object.assign(new Error('XML inválido: ' + e.message), { code: 'PARSE_ERROR' });
  }

  const root = raw.mensagemTISS ?? raw;
  if (!root || typeof root !== 'object') {
    throw Object.assign(new Error('Estrutura mensagemTISS não encontrada.'), { code: 'INVALID_TISS' });
  }

  const cab  = root.cabecalho ?? {};
  const idTx = cab.identificacaoTransacao ?? {};

  const versao        = String(cab.Padrao ?? '').trim();
  const tipoTransacao = String(idTx.tipoTransacao ?? '').trim();
  const dataRegistro  = fmtDate(String(idTx.dataRegistroTransacao ?? '').trim());
  const cnpjPrestador = fmtCnpj(cab.origem?.identificacaoPrestador?.cnpjContratado ?? '');
  const registroANS   = String(cab.destino?.identificacaoOperadora?.registroANS ?? '').trim();

  const p2o   = root.prestadorParaOperadora ?? {};
  const lotes = toArray(p2o.loteGuias ?? []);

  const PARSERS = {
    'guiaSP-SADT':    parseGuiaSPSADT,
    'guiaConsulta':   parseGuiaConsulta,
    'guiaInternacao': parseGuiaInternacao,
  };

  const guias    = [];
  const warnings = [];

  for (const lote of lotes) {
    const numLote   = lote.numeroLote ? String(lote.numeroLote) : '1';
    const guiasTISS = lote.guiasTISS ?? {};

    for (const [key, parser] of Object.entries(PARSERS)) {
      for (const item of toArray(guiasTISS[key] ?? [])) {
        const parsed = parser(item);
        parsed.lote  = numLote;
        parsed.id    = `${key}-${guias.length}`;
        guias.push(parsed);
        warnings.push(...validateGuia(parsed, guias.length - 1));
      }
    }
  }

  return {
    versao,
    tipoTransacao,
    tipoTransacaoLabel: TIPO_TRANSACAO_LABEL[tipoTransacao] ?? tipoTransacao,
    dataRegistro,
    cnpjPrestador,
    registroANS,
    totalGuias: guias.length,
    guias,
    warnings,
    xmlOriginal: xmlString,
  };
};
