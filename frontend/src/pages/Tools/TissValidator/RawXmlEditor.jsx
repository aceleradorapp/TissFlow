import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, CheckCircle2,
  RefreshCw, Code2, Loader2, FileCode2,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import api from '../../../services/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractLine(details = '') {
  return parseInt(details.match(/Linha\s+(\d+)/)?.[1] ?? '1', 10);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RawXmlEditor() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const textareaRef  = useRef(null);
  const lineNumsRef  = useRef(null);

  const {
    xml:      initialXml    = '',
    errors:   initialErrors = [],
    fileName: initialFile   = 'arquivo.xml',
  } = location.state ?? {};

  const [xml,        setXml]       = useState(initialXml);
  const [errors,     setErrors]    = useState(initialErrors);
  const [validating, setValidating] = useState(false);
  const [activeIdx,  setActiveIdx]  = useState(null);

  // Redirect if accessed directly without state
  useEffect(() => {
    if (!initialXml) navigate('/tools/tiss-validator', { replace: true });
  }, []); // eslint-disable-line

  const syntaxErrors = errors.filter(e => e.code === 'xml-syntax-error');
  const lineCount    = xml.split('\n').length;

  // Scroll textarea + line-numbers to a specific line
  const scrollToLine = useCallback((lineNum) => {
    const ta = textareaRef.current;
    const ln = lineNumsRef.current;
    if (!ta) return;

    const lines = xml.split('\n');
    let offset = 0;
    for (let i = 0; i < lineNum - 1 && i < lines.length; i++) offset += lines[i].length + 1;
    ta.focus();
    ta.setSelectionRange(offset, offset + (lines[lineNum - 1]?.length ?? 0));

    // 24px line height (leading-6) + 16px top padding (py-4 = 1rem)
    const scrollTop = Math.max(0, (lineNum - 1) * 24 - ta.clientHeight / 2 + 16);
    ta.scrollTop = scrollTop;
    if (ln) ln.scrollTop = scrollTop;
  }, [xml]);

  // Sync line-numbers column when user scrolls the textarea
  const handleScroll = useCallback((e) => {
    if (lineNumsRef.current) lineNumsRef.current.scrollTop = e.target.scrollTop;
  }, []);

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

      setErrors(data.errors ?? []);

      const remainingSyntax = (data.errors ?? []).filter(e => e.code === 'xml-syntax-error');

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

          {syntaxErrors.length > 0 && (
            <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                             bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400
                             border border-red-300 dark:border-red-700/50">
              <AlertTriangle size={11} />
              {syntaxErrors.length} erro{syntaxErrors.length !== 1 ? 's' : ''} de estrutura
            </span>
          )}
        </div>

        <button
          onClick={handleValidate}
          disabled={validating}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-xl
                     bg-emerald-600 hover:bg-emerald-500 text-white transition-all
                     disabled:opacity-60 disabled:cursor-wait
                     shadow-[0_0_10px_rgba(16,185,129,0.3)]"
        >
          {validating
            ? <Loader2 size={13} className="animate-spin" />
            : <RefreshCw size={13} />
          }
          Validar Sintaxe
        </button>
      </div>

      {/* ── Description ── */}
      <div className="mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          O XML possui erros de estrutura de tags (abertura/fechamento incompatíveis). Corrija diretamente no editor abaixo e clique em
          {' '}<span className="font-semibold text-emerald-500">Validar Sintaxe</span> para reprocessar.
          Quando a estrutura estiver correta, o sistema abrirá o Editor de Blocos automaticamente.
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid gap-4 h-[calc(100vh-220px)]"
           style={{ gridTemplateColumns: '1fr 320px' }}>

        {/* ── Code editor ── */}
        <div className="flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-0">
          {/* Editor header */}
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
            {/* Line numbers column */}
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

            {/* Editable textarea */}
            <textarea
              ref={textareaRef}
              value={xml}
              onChange={e => setXml(e.target.value)}
              onScroll={handleScroll}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="flex-1 resize-none bg-slate-950 text-slate-200
                         focus:outline-none overflow-auto font-mono"
              style={{
                fontSize:    '11px',
                lineHeight:  '24px',
                padding:     '16px 16px 16px 12px',
                tabSize:     2,
                whiteSpace:  'pre',
              }}
            />
          </div>
        </div>

        {/* ── Error list sidebar ── */}
        <div className="flex flex-col gap-2 overflow-y-auto min-h-0">
          <div className="flex items-center gap-2 px-1 shrink-0">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {syntaxErrors.length === 0
                ? 'Nenhum erro de estrutura'
                : `${syntaxErrors.length} ponto${syntaxErrors.length !== 1 ? 's' : ''} a corrigir`}
            </span>
          </div>

          {syntaxErrors.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 px-4
                            rounded-2xl border border-emerald-700/30 bg-emerald-900/10">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <p className="text-xs text-emerald-400 font-medium text-center">
                Estrutura XML sem erros de sintaxe.
                <br />Clique em Validar Sintaxe para prosseguir.
              </p>
            </div>
          )}

          {syntaxErrors.map((err, idx) => {
            const lineNum   = extractLine(err.details);
            const isActive  = activeIdx === idx;

            return (
              <button
                key={idx}
                onClick={() => { setActiveIdx(idx); scrollToLine(lineNum); }}
                className={[
                  'w-full text-left rounded-xl border px-3 py-2.5 transition-all',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                  isActive
                    ? 'border-amber-500/60 bg-amber-900/20 shadow-[0_0_8px_rgba(217,119,6,0.2)]'
                    : 'border-slate-700/50 bg-slate-900/60 hover:border-amber-700/40 hover:bg-amber-900/10',
                ].join(' ')}
              >
                {/* Line chip + details */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="shrink-0 text-xs font-bold font-mono px-2 py-0.5 rounded-full
                                   bg-amber-600/20 text-amber-400 border border-amber-600/30">
                    L{lineNum}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-500 truncate">
                    {err.details}
                  </span>
                </div>
                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {err.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
