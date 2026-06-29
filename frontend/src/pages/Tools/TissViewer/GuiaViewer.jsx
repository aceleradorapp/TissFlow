import { Fragment, useState } from 'react';
import {
  User, Building2, Stethoscope, Calendar,
  Package, ChevronDown, ChevronRight,
  AlertTriangle, Key, DollarSign,
} from 'lucide-react';

// ── Accordion ─────────────────────────────────────────────────────────────────

function Accordion({ icon: Icon, title, badge, colorClass = 'text-slate-500', defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5
                   bg-slate-50 dark:bg-slate-900/50
                   hover:bg-slate-100 dark:hover:bg-slate-800/40
                   transition-colors duration-150 text-left"
      >
        <Icon size={14} className={`shrink-0 ${colorClass}`} />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex-1">{title}</span>
        {badge != null && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500">
            {badge}
          </span>
        )}
        {open
          ? <ChevronDown  size={14} className="text-slate-400 shrink-0" />
          : <ChevronRight size={14} className="text-slate-400 shrink-0" />
        }
      </button>
      {open && (
        <div className="px-5 py-4 bg-white dark:bg-slate-950/30">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Grid cell (compact info layout) ──────────────────────────────────────────

function Grid({ children }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
      {children}
    </div>
  );
}

function Cell({ label, value, mono = false, wide = false }) {
  if (!value) return null;
  return (
    <div className={`flex flex-col gap-0.5 ${wide ? 'col-span-2 md:col-span-3' : ''}`}>
      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-sm font-semibold text-slate-900 dark:text-white break-words ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// ── Row (list-style for sub-sections) ────────────────────────────────────────

function Row({ label, value, mono = false }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800/40 last:border-0">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-300 w-36 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm font-semibold text-slate-900 dark:text-white min-w-0 break-words ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ text, mt = false }) {
  return (
    <p className={`text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 ${mt ? 'mt-3' : ''}`}>
      {text}
    </p>
  );
}

// ── Procedures table ──────────────────────────────────────────────────────────

function ProceduresTable({ rows, emptyText = 'Nenhum registro encontrado.' }) {
  if (!rows?.length) {
    return <p className="text-xs text-slate-400 dark:text-slate-600 py-2 italic">{emptyText}</p>;
  }
  const hasDate  = rows.some((p) => p.dataExecucao);
  const hasEquipe = rows.some((p) => p.equipe?.length > 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/60">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
            <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider w-8">#</th>
            {hasDate && (
              <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Data/Hora</th>
            )}
            <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Tab.</th>
            <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Código</th>
            <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Descrição</th>
            <th className="text-right px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Qtd</th>
            <th className="text-right px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Unit.</th>
            <th className="text-right px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <Fragment key={i}>
              <tr className={[
                'border-b border-slate-100 dark:border-slate-800/40',
                (!hasEquipe || !p.equipe?.length) ? 'last:border-0' : '',
                i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-slate-900/20',
              ].join(' ')}>
                <td className="px-3 py-2.5 text-slate-400 dark:text-slate-600 tabular-nums">{p.seq}</td>
                {hasDate && (
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 font-mono">
                    {p.dataExecucao ?? '—'}
                    {(p.horaInicial || p.horaFinal) && (
                      <span className="block text-[9px] text-slate-400 dark:text-slate-600 mt-0.5">
                        {p.horaInicial ?? ''}{p.horaFinal ? `–${p.horaFinal}` : ''}
                      </span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2.5">
                  <span className="font-mono text-slate-600 dark:text-slate-400">{p.tabela || '—'}</span>
                  {p.tabelaLabel && (
                    <span className="block text-[9px] text-slate-400 dark:text-slate-600 mt-0.5">{p.tabelaLabel}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-blue-700 dark:text-blue-400 tabular-nums">{p.codigo || '—'}</td>
                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 max-w-[180px] truncate" title={p.descricao ?? undefined}>
                  {p.descricao || '—'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">{p.quantidade ?? 1}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-400">{p.valorUnit$ ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">{p.valorTotal$ ?? '—'}</td>
              </tr>
              {p.equipe?.length > 0 && (
                <tr className="border-b border-slate-100 dark:border-slate-800/40 last:border-0
                                bg-slate-50/30 dark:bg-indigo-950/10">
                  <td colSpan={hasDate ? 8 : 7} className="px-3 py-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider mr-2">
                      Equipe:
                    </span>
                    {p.equipe.map((e, j) => (
                      <span key={j} className="text-[10px] text-slate-500 dark:text-slate-400">
                        {e.nome}
                        {e.conselho && ` (${e.conselho} ${e.numero ?? ''}${e.uf ? `/${e.uf}` : ''})`}
                        {j < p.equipe.length - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Despesas table ────────────────────────────────────────────────────────────

function DespesasTable({ rows, emptyText = 'Nenhuma despesa registrada.' }) {
  if (!rows?.length) {
    return <p className="text-xs text-slate-400 dark:text-slate-600 py-2 italic">{emptyText}</p>;
  }
  const hasAnvisa = rows.some((d) => d.registroANVISA);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/60">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
            <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider w-8">#</th>
            <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Tab.</th>
            <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Código</th>
            <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Descrição</th>
            <th className="text-right px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Qtd</th>
            <th className="text-right px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Unit.</th>
            <th className="text-right px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">Total</th>
            {hasAnvisa && (
              <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wider">ANVISA</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr
              key={i}
              className={[
                'border-b border-slate-100 dark:border-slate-800/40 last:border-0',
                i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-slate-900/20',
              ].join(' ')}
            >
              <td className="px-3 py-2.5 text-slate-400 dark:text-slate-600 tabular-nums">{d.seq}</td>
              <td className="px-3 py-2.5">
                <span className="font-mono text-slate-600 dark:text-slate-400">{d.codigoTabela || '—'}</span>
                {d.tabelaLabel && (
                  <span className="block text-[9px] text-slate-400 dark:text-slate-600 mt-0.5">{d.tabelaLabel}</span>
                )}
              </td>
              <td className="px-3 py-2.5 font-mono text-blue-700 dark:text-blue-400 tabular-nums">{d.codigoDespesa || '—'}</td>
              <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 max-w-[180px] truncate" title={d.descricao ?? undefined}>
                {d.descricao || '—'}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">{d.quantidade}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-400">{d.valorUnit$ ?? '—'}</td>
              <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">{d.valorTotal$ ?? '—'}</td>
              {hasAnvisa && (
                <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">{d.registroANVISA ?? '—'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Warnings block ────────────────────────────────────────────────────────────

function WarningsBlock({ warnings }) {
  const [open, setOpen] = useState(false);
  if (!warnings?.length) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left
                   hover:bg-amber-500/5 transition-colors duration-150"
      >
        <AlertTriangle size={14} className="text-amber-400 shrink-0" />
        <span className="text-sm font-semibold text-amber-400 flex-1">
          {warnings.length} aviso{warnings.length !== 1 ? 's' : ''} estrutural{warnings.length !== 1 ? 'is' : ''} encontrado{warnings.length !== 1 ? 's' : ''}
        </span>
        {open
          ? <ChevronDown  size={13} className="text-amber-400/70 shrink-0" />
          : <ChevronRight size={13} className="text-amber-400/70 shrink-0" />
        }
      </button>
      {open && (
        <ul className="px-4 pb-3 flex flex-col gap-1.5 border-t border-amber-500/20">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2 pt-1.5 text-xs text-amber-300/90">
              <span className="text-amber-500 shrink-0 mt-0.5 font-bold">·</span>
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function GuiaViewer({ guia, warnings }) {
  if (!guia) return null;

  const vt = guia.valorTotal ?? {};

  const totaisItems = [
    { label: 'Procedimentos',    value: vt.proc         },
    { label: 'Taxas / Aluguéis', value: vt.taxas        },
    { label: 'Materiais',        value: vt.materiais    },
    { label: 'Medicamentos',     value: vt.medicamentos },
    { label: 'OPME',             value: vt.opme         },
    { label: 'Diárias',         value: vt.diarias      },
  ].filter((i) => i.value);

  const hasPrestadores = guia.executante?.nome
    || guia.solicitante?.nome
    || guia.solicitante?.profissionalNome
    || guia.solicitante?.codigoNaOperadora;

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Guia {guia.tipoLabel}
            </h2>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-0.5">
              Nº {guia.numeroGuia}
              {guia.registroANS && ` · ANS: ${guia.registroANS}`}
              {guia.lote && ` · Lote ${guia.lote}`}
            </p>
          </div>

          {vt.geral && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Total Geral
              </p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {vt.geral}
              </p>
            </div>
          )}
        </div>

        {/* Autorização */}
        {(guia.autorizacao?.senha || guia.autorizacao?.dataAutorizacao || guia.autorizacao?.numeroGuia) && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {guia.autorizacao.senha && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                               text-[11px] font-mono font-semibold
                               bg-green-500/10 border border-green-500/20
                               text-green-600 dark:text-green-400">
                <Key size={10} className="shrink-0" />
                Senha: {guia.autorizacao.senha}
              </span>
            )}
            {guia.autorizacao.numeroGuia && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg
                               text-[11px] font-mono
                               bg-slate-100 dark:bg-slate-800/60
                               border border-slate-300 dark:border-slate-700/60
                               text-slate-600 dark:text-slate-400">
                Guia Op.: {guia.autorizacao.numeroGuia}
              </span>
            )}
            {guia.autorizacao.dataAutorizacao && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Autorizado em {guia.autorizacao.dataAutorizacao}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Warnings */}
      <WarningsBlock warnings={warnings} />

      {/* ── Beneficiário ──────────────────────────────────────── */}
      <Accordion icon={User} title="Dados do Beneficiário" colorClass="text-blue-500" defaultOpen>
        <Grid>
          <Cell label="Nome"               value={guia.beneficiario?.nome}          wide />
          <Cell label="Nº Carteira"        value={guia.beneficiario?.carteira}      mono />
          <Cell label="Data Nascimento"    value={guia.beneficiario?.nascimento} />
          <Cell label="Cartão Nac. Saúde"  value={guia.beneficiario?.cartaoNac}     mono />
          <Cell label="Atend. RN"          value={guia.beneficiario?.atendimentoRN} />
        </Grid>
      </Accordion>

      {/* ── Prestadores ───────────────────────────────────────── */}
      {hasPrestadores && (
        <Accordion icon={Building2} title="Prestadores" colorClass="text-purple-500" defaultOpen>
          {(guia.solicitante?.nome || guia.solicitante?.codigoNaOperadora) && (
            <>
              <SectionLabel text="Estabelecimento Solicitante" />
              <Row label="Nome"     value={guia.solicitante.nome} />
              <Row label="CNPJ"     value={guia.solicitante.cnpj} mono />
              <Row label="Cód. Op." value={guia.solicitante.codigoNaOperadora} mono />
            </>
          )}
          {(guia.solicitante?.profissionalNome || guia.solicitante?.conselho) && (
            <>
              <SectionLabel text="Profissional Solicitante" mt={!!guia.solicitante?.nome} />
              <Row label="Nome"        value={guia.solicitante.profissionalNome} />
              <Row label="Conselho"    value={guia.solicitante.conselho} mono />
              <Row label="Nº Conselho" value={guia.solicitante.numeroConselho} mono />
              <Row label="UF"          value={guia.solicitante.ufConselho} />
              <Row label="CBOS / CBO"  value={guia.solicitante.cbos} mono />
            </>
          )}
          {guia.executante?.nome && (
            <>
              <SectionLabel
                text="Contratado Executante"
                mt={!!(guia.solicitante?.nome || guia.solicitante?.profissionalNome)}
              />
              <Row label="Nome"     value={guia.executante.nome} />
              <Row label="CNPJ"     value={guia.executante.cnpj} mono />
              <Row label="CNES"     value={guia.executante.cnes} mono />
              <Row label="Cód. Op." value={guia.executante.codigoNaOperadora} mono />
            </>
          )}
        </Accordion>
      )}

      {/* ── Atendimento ───────────────────────────────────────── */}
      <Accordion icon={Calendar} title="Dados do Atendimento" colorClass="text-amber-500" defaultOpen>
        <Grid>
          <Cell label="Data"             value={guia.atendimento?.data} />
          <Cell label="Tipo Atendimento" value={guia.atendimento?.tipoLabel ?? guia.atendimento?.tipo} />
          <Cell label="Regime"           value={guia.atendimento?.regime} />
          <Cell label="Tipo Consulta"    value={guia.atendimento?.tipoConsultaLabel ?? guia.atendimento?.tipoConsulta} />
          <Cell label="Indicação Acidente" value={guia.atendimento?.acidente} />
          <Cell label="CBO"              value={guia.atendimento?.cbo} mono />
          <Cell label="Profissional"     value={guia.atendimento?.profissional} wide />
        </Grid>
      </Accordion>

      {/* ── Procedimentos ─────────────────────────────────────── */}
      <Accordion
        icon={Stethoscope}
        title="Procedimentos Executados"
        colorClass="text-emerald-500"
        badge={guia.procedimentos?.length ?? 0}
        defaultOpen
      >
        <ProceduresTable rows={guia.procedimentos} emptyText="Nenhum procedimento registrado." />
      </Accordion>

      {/* ── Outras Despesas ────────────────────────────────────── */}
      {guia.outrasDespesas?.length > 0 && (
        <Accordion
          icon={Package}
          title="Outras Despesas / Taxas"
          colorClass="text-orange-500"
          badge={guia.outrasDespesas.length}
          defaultOpen
        >
          <DespesasTable rows={guia.outrasDespesas} />
        </Accordion>
      )}

      {/* ── Totais e Observações ──────────────────────────────── */}
      {(totaisItems.length > 0 || guia.observacao) && (
        <Accordion
          icon={DollarSign}
          title="Totais e Observações"
          colorClass="text-emerald-600"
          defaultOpen
        >
          {totaisItems.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {totaisItems.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-0.5 p-3 rounded-xl
                             bg-slate-50 dark:bg-slate-900/50
                             border border-slate-200 dark:border-slate-800/50"
                >
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {guia.observacao && (
            <div className="p-3 rounded-xl
                            bg-slate-100 dark:bg-slate-800/50
                            border border-slate-200 dark:border-slate-700/40">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Observação
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {guia.observacao}
              </p>
            </div>
          )}
        </Accordion>
      )}

    </div>
  );
}
