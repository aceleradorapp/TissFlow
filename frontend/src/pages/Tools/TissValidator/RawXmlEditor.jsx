import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2,
  Code2, Loader2, FileCode2, Zap, PauseCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import api from '../../../services/api';

// ── Client-side XML syntax linter ─────────────────────────────────────────────
// Mirrors the backend's collectSyntaxErrors() stack-scanner so the panel
// updates in real-time without a network round-trip.

function lintXml(xmlString) {
  if (!xmlString.trim()) return [];

  const errors = [];
  const stack  = [];

  // Precompute line-start offsets for O(log n) line lookup
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

  // Matches: comments, PIs, closing tags, opening/self-closing tags
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([a-zA-Z][a-zA-Z0-9:._-]*)\s*>|<([a-zA-Z][a-zA-Z0-9:._-]*)([^>]*)>/g;

  let m;
  while ((m = re.exec(xmlString)) !== null) {
    const closeName = m[1];
    const openName  = m[2];
    const attrs     = m[3] ?? '';

    if (!openName && !closeName) continue; // comment or PI

    if (closeName) {
      if (stack.length === 0) {
        errors.push({
          code: 'xml-syntax-error',
          description: `Tag de fechamento '</${closeName}>' inesperada — nenhum elemento aberto`,
          details: `Linha ${lineOf(m.index)}`,
        });
      } else {
        const top = stack[stack.length - 1];
        if (top.name !== closeName) {
          errors.push({
            code: 'xml-syntax-error',
            description: `Fechamento '</${closeName}>' não corresponde à abertura '<${top.name}>' (linha ${top.line})`,
            details: `Linha ${lineOf(m.index)}`,
          });
          // Recovery: pop until we find a matching opener
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
      code: 'xml-syntax-error',
      description: `Tag '<${t.name}>' foi aberta mas nunca fechada`,
      details: `Linha ${t.line}`,
    });
  }

  return errors;
}

function extractLine(details = '') {
  return parseInt(details.match(/Linha\s+(\d+)/)?.[1] ?? '1', 10);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RawXmlEditor() {
  const location     = useLocation();
  const navigate     = useNavigate();
  const textareaRef  = useRef(null);
  const lineNumsRef  = useRef(null);
  const lintTimerRef = useRef(null);

  const {
    xml:      initialXml    = '',
    errors:   initialErrors = [],
    fileName: initialFile   = 'arquivo.xml',
  } = location.state ?? {};

  // syntaxErrors is kept in its own slice so the linter can update it
  // independently of the full `errors` list returned by the backend
  const [syntaxErrors, setSyntaxErrors] = useState(
    () => initialErrors.filter(e => e.code === 'xml-syntax-error')
  );
  const [xml,        setXml]       = useState(initialXml);
  const [validating, setValidating] = useState(false);
  const [activeIdx,  setActiveIdx]  = useState(null);

  useEffect(() => {
    if (!initialXml) navigate('/tools/tiss-validator', { replace: true });
    return () => clearTimeout(lintTimerRef.current);
  }, []); // eslint-disable-line

  const lineCount  = xml.split('\n').length;
  const syntaxClean = syntaxErrors.length === 0;

  // ── Debounced client-side lint ─────────────────────────────────────────────

  const handleXmlChange = useCallback((e) => {
    const newXml = e.target.value;
    setXml(newXml);

    clearTimeout(lintTimerRef.current);
    lintTimerRef.current = setTimeout(() => {
      setSyntaxErrors(lintXml(newXml));
      setActiveIdx(null);
    }, 450);
  }, []);

  // ── Scroll helpers ─────────────────────────────────────────────────────────

  const scrollToLine = useCallback((lineNum) => {
    const ta = textareaRef.current;
    const ln = lineNumsRef.current;
    if (!ta) return;

    const lines = xml.split('\n');
    let offset = 0;
    for (let i = 0; i < lineNum - 1 && i < lines.length; i++) offset += lines[i].length + 1;
    ta.focus();
    ta.setSelectionRange(offset, offset + (lines[lineNum - 1]?.length ?? 0));

    // 24px line height + 16px top padding
    const scrollTop = Math.max(0, (lineNum - 1) * 24 - ta.clientHeight / 2 + 16);
    ta.scrollTop = scrollTop;
    if (ln) ln.scrollTop = scrollTop;
  }, [xml]);

  const handleScroll = useCallback((e) => {
    if (lineNumsRef.current) lineNumsRef.current.scrollTop = e.target.scrollTop;
  }, []);

  // ── Backend validation + navigation ───────────────────────────────────────

  async function handleValidate() {
    setValidating(true);
    setActiveIdx(null);
    try {
      const blob = new Blob([xml], { type: 'application/xml' });
      const form = new FormData();
      form.append('xml_file', new File([blob], initialFile));

      const { data } = await api.post('/tools/validator/validate-file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const remainingSyntax = (data.errors ?? []).filter(e => e.code === 'xml-syntax-error');
      setSyntaxErrors(remainingSyntax);

      if (remainingSyntax.length === 0) {
        if (data.valid) {
          toast.success('XML válido! Retornando para o relatório…');
          setTimeout(() => {
            navigate('/tools/tiss-validator', {
              state: { result: data, xml, fileName: initialFile, fixedXml: xml },
            });
          }, 800);
        } else {
          toast.success('Estrutura corrigida! Abrindo editor de blocos para os demais erros…');
          setTimeout(() => {
            navigate('/tools/tiss-validator/editor', {
              state: { xml, errors: data.errors, fileName: initialFile },
            });
          }, 800);
        }
      } else {
        toast.warning(`${remainingSyntax.length} erro(s) de estrutura ainda presente(s). Continue corrigindo.`);
      }
    } catch {
      toast.error('Erro ao revalidar o arquivo. Tente novamente.');
    } finally {
      setValidating(false);
    }
  }

  if (!initialXml) return null;

  // ── Toolbar button — changes when linter clears all errors ─────────────────
  const advanceButton = syntaxClean
    ? {
        label:     'Avançar para o Editor de Faturamento',
        Icon:      ArrowRight,
        className: 'bg-violet-600 hover:bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]',
      }
    : {
        label:     'Validar Sintaxe',
        Icon:      Zap,
        className: 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
      };

  return (
    <DashboardLayout>
      {/* ── Sticky toolbar ── */}
      <div className="sticky top-0 z-30 -mx-6 px-6 py-3 mb-4
                      bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm
                      border-b border-slate-200 dark:border-slate-800
                      flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/tools/tiss-validator')}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl
                       bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
                       hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
          >
            <ArrowLeft size={13} />
            Voltar
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <FileCode2 size={15} className="text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                Editor de Estrutura Bruta
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-tight font-mono">
                {initialFile}
              </p>
            </div>
          </div>

          {/* Live error counter badge */}
          {syntaxClean ? (
            <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                             bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400
                             border border-emerald-300 dark:border-emerald-700/50 transition-all">
              <CheckCircle2 size={11} />
              Estrutura OK
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                             bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400
                             border border-red-300 dark:border-red-700/50 transition-all">
              <AlertTriangle size={11} />
              {syntaxErrors.length} erro{syntaxErrors.length !== 1 ? 's' : ''} de estrutura
            </span>
          )}
        </div>

        <button
          onClick={handleValidate}
          disabled={validating}
          className={[
            'shrink-0 flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-xl',
            'text-white transition-all disabled:opacity-60 disabled:cursor-wait',
            advanceButton.className,
          ].join(' ')}
        >
          {validating
            ? <Loader2 size={13} className="animate-spin" />
            : <advanceButton.Icon size={13} />
          }
          {validating ? 'Validando…' : advanceButton.label}
        </button>
      </div>

      {/* ── Description ── */}
      <div className="mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          O XML possui erros de estrutura de tags (abertura/fechamento incompatíveis). Corrija diretamente no editor —
          o painel lateral atualiza em tempo real conforme você digita.
          Quando a estrutura estiver correta, clique em{' '}
          <span className="font-semibold text-violet-400">Avançar para o Editor de Faturamento</span>.
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid gap-4 h-[calc(100vh-220px)]"
           style={{ gridTemplateColumns: '1fr 320px' }}>

        {/* ── Code editor ── */}
        <div className="flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-0">
          <div className="flex items-center justify-between px-4 py-2
                          bg-slate-100 dark:bg-slate-900
                          border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <Code2 size={13} className="text-slate-400" />
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {initialFile} — {lineCount} linha{lineCount !== 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-600 select-none">
              Ctrl+Z para desfazer
            </span>
          </div>

          {/* Line numbers + textarea */}
          <div className="relative flex flex-1 overflow-hidden bg-slate-950">
            <div
              ref={lineNumsRef}
              className="shrink-0 w-11 overflow-hidden select-none
                         bg-slate-900 border-r border-slate-800
                         text-right text-slate-600 font-mono"
              style={{ fontSize: '11px', lineHeight: '24px', paddingTop: '16px', paddingRight: '8px' }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} style={{ height: '24px' }}>{i + 1}</div>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={xml}
              onChange={handleXmlChange}
              onScroll={handleScroll}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="flex-1 resize-none bg-slate-950 text-slate-200
                         focus:outline-none overflow-auto font-mono"
              style={{
                fontSize:   '11px',
                lineHeight: '24px',
                padding:    '16px 16px 16px 12px',
                tabSize:    2,
                whiteSpace: 'pre',
              }}
            />
          </div>
        </div>

        {/* ── Error list sidebar ── */}
        <div className="flex flex-col gap-2 overflow-y-auto min-h-0">
          <div className="flex items-center gap-2 px-1 shrink-0">
            {syntaxClean
              ? <CheckCircle2 size={14} className="text-emerald-500" />
              : <AlertTriangle size={14} className="text-amber-500" />
            }
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {syntaxClean
                ? 'Estrutura correta!'
                : `${syntaxErrors.length} ponto${syntaxErrors.length !== 1 ? 's' : ''} a corrigir`}
            </span>
          </div>

          {syntaxClean ? (
            <div className="flex flex-col items-center gap-3 py-8 px-4
                            rounded-2xl border border-emerald-700/30 bg-emerald-900/10">
              <CheckCircle2 size={32} className="text-emerald-400" />
              <p className="text-xs text-emerald-400 font-medium text-center leading-relaxed">
                Todos os erros de estrutura foram corrigidos.
                <br /><br />
                Clique em{' '}
                <span className="font-bold text-violet-400">Avançar</span>{' '}
                para confirmar e abrir o Editor de Faturamento.
              </p>
            </div>
          ) : (
            syntaxErrors.map((err, idx) => {
              const lineNum  = extractLine(err.details);
              const isActive = activeIdx === idx;

              return (
                <button
                  key={`${err.description}-${idx}`}
                  onClick={() => { setActiveIdx(idx); scrollToLine(lineNum); }}
                  className={[
                    'w-full text-left rounded-xl border px-3 py-2.5 transition-all',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                    isActive
                      ? 'border-amber-500/60 bg-amber-900/20 shadow-[0_0_8px_rgba(217,119,6,0.2)]'
                      : 'border-slate-700/50 bg-slate-900/60 hover:border-amber-700/40 hover:bg-amber-900/10',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="shrink-0 text-xs font-bold font-mono px-2 py-0.5 rounded-full
                                     bg-amber-600/20 text-amber-400 border border-amber-600/30">
                      L{lineNum}
                    </span>
                    <span className="text-xs text-slate-500 truncate">
                      {err.details}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {err.description}
                  </p>
                </button>
              );
            })
          )}

          {/* Suspended-layers notice — always visible while syntax errors exist */}
          {!syntaxClean && (
            <div className="mt-2 flex items-start gap-2.5 px-3 py-2.5 rounded-xl
                            border border-slate-700/40 bg-slate-900/50">
              <PauseCircle size={13} className="text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-400">Integridade MD5</span> e{' '}
                <span className="font-semibold text-slate-400">Auditoria Matemática</span>{' '}
                suspensas por erro de estrutura. Corrija as tags acima para que os dados internos sejam auditados.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
