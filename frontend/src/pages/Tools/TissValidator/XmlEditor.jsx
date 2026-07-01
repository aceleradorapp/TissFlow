import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, AlertCircle,
  Search, X, Zap, Save, ArrowLeft, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import api from '../../../services/api';

// ── Error → tag-name mapping ───────────────────────────────────────────────────

const ERROR_TAG_MAP = {
  'missing-cabecalho':             ['cabecalho'],
  'missing-padrao':                ['Padrao', 'padrao'],
  'missing-epilogo':               ['epilogo'],
  'missing-transaction-body':      ['prestadorParaOperadora', 'operadoraParaPrestador'],
  'hash-integrity-validation':     ['hash'],
  'missing-hash-element':          ['hash'],
  'hash-body-not-extractable':     ['prestadorParaOperadora', 'operadoraParaPrestador'],
  'audit-procedure-math-mismatch': ['valorTotal', 'quantidade', 'valorUnitario'],
  'audit-expense-math-mismatch':   ['valorTotal', 'quantidadeExecutada', 'valorUnitario'],
  'audit-total-sum-mismatch':      ['valorTotalGeral'],
};

const ERROR_HINTS = {
  'missing-cabecalho':             'Adicione o elemento <cabecalho> como filho direto de <mensagemTISS>.',
  'missing-padrao':                'Adicione <Padrao>4.00.00</Padrao> dentro de <cabecalho>.',
  'missing-epilogo':               'Adicione o elemento <epilogo> com <hash> ao final de <mensagemTISS>.',
  'hash-integrity-validation':     'Hash MD5 incorreto. Clique em "⚡ Corrigir Hash MD5" para recalcular automaticamente.',
  'missing-hash-element':          'Adicione a tag <hash> dentro de <epilogo> com o MD5 do bloco de transação.',
  'audit-procedure-math-mismatch': 'Quantidade × ValorUnitário deve ser igual ao ValorTotal declarado no procedimento.',
  'audit-expense-math-mismatch':   'Quantidade × ValorUnitário deve ser igual ao ValorTotal da despesa.',
  'audit-total-sum-mismatch':      'A soma das rubricas (procedimentos + taxas + materiais + medicamentos + OPME + diárias) deve ser igual ao valorTotalGeral.',
};

// ── DOM → React tree ───────────────────────────────────────────────────────────

function buildDomTree(rootEl) {
  let counter = 0;
  const domMap = {};                  // id → DOM Element

  function walk(el, depth) {
    const id = String(++counter);
    domMap[id] = el;

    const children = [];
    let textContent = '';

    for (const child of el.childNodes) {
      if (child.nodeType === 1) {
        children.push(walk(child, depth + 1));
      } else if (child.nodeType === 3) {
        const v = child.textContent.trim();
        if (v) textContent = child.textContent;  // keep raw (whitespace preserved)
      }
    }

    return {
      id,
      localName: el.localName ?? el.nodeName.replace(/^.*:/, ''),
      depth,
      children,
      isLeaf:      children.length === 0,
      textContent,
    };
  }

  return { tree: walk(rootEl, 0), domMap };
}

// ── Error helpers ──────────────────────────────────────────────────────────────

function buildErrorTagSet(errors = []) {
  const map = {};
  for (const e of errors) {
    for (const tag of (ERROR_TAG_MAP[e.code] ?? [])) {
      const arr = (map[tag] ??= []);
      // One hint per error code per tag — avoids repeating the same message N times
      if (!arr.some((x) => x.code === e.code)) arr.push(e);
    }
  }
  return map;  // { [localName]: error[] }
}

// Collect unique errors (by code) across an entire subtree for tooltip display
function collectNodeErrors(node, ets) {
  const seen = new Set();
  const results = [];
  function walk(n) {
    for (const e of (ets[n.localName] ?? [])) {
      if (!seen.has(e.code)) { seen.add(e.code); results.push(e); }
    }
    for (const child of n.children) walk(child);
  }
  walk(node);
  return results;
}

function nodeHasAnyError(node, ets) {
  if ((ets[node.localName] ?? []).length > 0) return true;
  return node.children.some((c) => nodeHasAnyError(c, ets));
}

function findNodeByLocalName(node, name) {
  if (node.localName === name) return node;
  for (const child of node.children) {
    const found = findNodeByLocalName(child, name);
    if (found) return found;
  }
  return null;
}

// Collect all leaf nodes whose localName or textContent matches the search term
function collectLeafMatches(node, term, path = '') {
  const myPath = path ? `${path} › ${node.localName}` : node.localName;
  const results = [];
  if (node.isLeaf) {
    if (
      node.localName.toLowerCase().includes(term) ||
      node.textContent.toLowerCase().includes(term)
    ) {
      results.push({ node, path: myPath });
    }
  }
  for (const child of node.children) {
    results.push(...collectLeafMatches(child, term, myPath));
  }
  return results;
}

// ── Non-destructive XML serializer ─────────────────────────────────────────────

function serializeToXml(doc, domMap, valueMap) {
  const clone = doc.cloneNode(true);

  // Build original → clone element mapping via parallel traversal
  const origToClone = new Map();
  function parallelWalk(o, c) {
    origToClone.set(o, c);
    const oKids = Array.from(o.childNodes).filter((n) => n.nodeType === 1);
    const cKids = Array.from(c.childNodes).filter((n) => n.nodeType === 1);
    for (let i = 0; i < oKids.length; i++) parallelWalk(oKids[i], cKids[i]);
  }
  parallelWalk(doc.documentElement, clone.documentElement);

  // Apply valueMap overrides to cloned nodes only
  for (const [id, value] of Object.entries(valueMap)) {
    const origEl  = domMap[id];
    const cloneEl = origToClone.get(origEl);
    if (!cloneEl) continue;
    const textNode = Array.from(cloneEl.childNodes).find((n) => n.nodeType === 3);
    if (textNode) textNode.textContent = value;
  }

  return new XMLSerializer().serializeToString(clone);
}

// ── Collect default-expanded IDs (depth ≤ 1) ──────────────────────────────────

function defaultExpandedIds(node, result = new Set()) {
  if (node.depth <= 1) {
    result.add(node.id);
    node.children.forEach((c) => defaultExpandedIds(c, result));
  }
  return result;
}

// ── XmlField ──────────────────────────────────────────────────────────────────

function XmlField({ node, valueMap, onValueChange, onClearError, errorTagSet, compact }) {
  const errors   = errorTagSet[node.localName] ?? [];
  const hasError = errors.length > 0;
  const value    = valueMap[node.id] ?? node.textContent ?? '';

  function handleChange(e) {
    const newValue = e.target.value;
    onValueChange(node.id, newValue);
    if (hasError && newValue.trim()) {
      onClearError(node.localName);
    }
  }

  return (
    <div className={compact ? 'mb-2' : 'mb-3'}>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1
                        text-slate-500 dark:text-slate-400 select-none">
        {node.localName}
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        spellCheck={false}
        className={[
          'w-full text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all duration-150',
          'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200',
          'border focus:outline-none focus:ring-1',
          hasError
            ? 'border-red-400/60 bg-red-500/5 dark:bg-red-500/8 focus:ring-red-500/30 focus:border-red-400'
            : 'border-slate-200 dark:border-slate-700/60 focus:ring-blue-500/30 focus:border-blue-400/60',
        ].join(' ')}
      />
      {hasError && errors.map((e, i) => (
        <div key={i}
             className="mt-1.5 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg
                        bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
          <AlertCircle size={11} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed text-red-700 dark:text-red-300">
            {ERROR_HINTS[e.code] ?? e.description}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── XmlBlock (recursive accordion) ────────────────────────────────────────────

function XmlBlock({ node, valueMap, onValueChange, onClearError, errorTagSet, expanded, toggleExpand }) {
  if (node.isLeaf) {
    return (
      <div style={{ marginLeft: `${node.depth * 14}px` }}>
        <XmlField
          node={node}
          valueMap={valueMap}
          onValueChange={onValueChange}
          onClearError={onClearError}
          errorTagSet={errorTagSet}
        />
      </div>
    );
  }

  const isOpen     = expanded.has(node.id);
  const hasError   = nodeHasAnyError(node, errorTagSet);
  const nodeErrors = hasError ? collectNodeErrors(node, errorTagSet) : [];

  return (
    <div style={{ marginLeft: `${node.depth * 14}px` }} className="mb-0.5">
      <div className="flex items-center">
        <button
          onClick={() => toggleExpand(node.id)}
          className={[
            'flex items-center gap-2 flex-1 min-w-0 text-left px-2.5 py-1.5 rounded-lg',
            'transition-all duration-150',
            hasError
              ? 'hover:bg-red-500/8 dark:hover:bg-red-900/15'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
          ].join(' ')}
        >
          <span className="shrink-0 text-slate-400 dark:text-slate-500">
            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">
            {node.localName}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
            ({node.children.length})
          </span>
        </button>

        {/* Error badge with hover tooltip — sits outside the button to avoid nesting issues */}
        {hasError && (
          <div className="relative group/errbadge shrink-0 ml-1 px-1.5 py-1">
            <span className="flex items-center gap-1 text-[10px] font-semibold
                             text-red-500 dark:text-red-400 cursor-help select-none">
              <AlertCircle size={10} />
              erro
            </span>
            <div className="pointer-events-none absolute right-0 top-full mt-1 z-50 w-72
                            opacity-0 group-hover/errbadge:opacity-100 transition-opacity duration-150
                            rounded-xl shadow-xl border border-slate-700/60
                            bg-slate-900 dark:bg-slate-800 p-3 flex flex-col gap-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                Erros neste bloco
              </p>
              {nodeErrors.map((e, i) => (
                <p key={i} className="text-[10px] text-slate-200 leading-relaxed">
                  {ERROR_HINTS[e.code] ?? e.description}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="mt-0.5 pl-3 border-l border-slate-200 dark:border-slate-700/50 ml-3 py-1.5">
          {node.children.map((child) => (
            <XmlBlock
              key={child.id}
              node={{ ...child, depth: 0 }}
              valueMap={valueMap}
              onValueChange={onValueChange}
              onClearError={onClearError}
              errorTagSet={errorTagSet}
              expanded={expanded}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main editor ────────────────────────────────────────────────────────────────

export default function XmlEditor() {
  const location = useLocation();
  const navigate = useNavigate();

  const { xml: initialXml = '', errors: initialErrors = [], fileName = 'arquivo.xml' } =
    location.state ?? {};

  // Redirect if reached without state
  useEffect(() => {
    if (!initialXml) navigate('/tools/tiss-validator', { replace: true });
  }, [initialXml, navigate]);

  // Parse once, store in refs
  const docRef    = useRef(null);
  const domMapRef = useRef(null);
  const treeRef   = useRef(null);

  if (!docRef.current && initialXml) {
    const doc = new DOMParser().parseFromString(initialXml, 'application/xml');
    if (!doc.querySelector('parsererror')) {
      docRef.current = doc;
      const { tree, domMap } = buildDomTree(doc.documentElement);
      domMapRef.current = domMap;
      treeRef.current   = tree;
    }
  }

  const [valueMap,      setValueMap]      = useState({});
  const [currentErrors, setCurrentErrors] = useState(initialErrors);
  const [expanded,      setExpanded]      = useState(() =>
    treeRef.current ? defaultExpandedIds(treeRef.current) : new Set()
  );
  const [search,       setSearch]       = useState('');
  const [revalidating, setRevalidating] = useState(false);
  const [fixingHash,   setFixingHash]   = useState(false);
  const [revalResult,  setRevalResult]  = useState(null);

  const errorTagSet = useMemo(() => buildErrorTagSet(currentErrors), [currentErrors]);

  const onValueChange = useCallback((id, value) => {
    setValueMap((prev) => ({ ...prev, [id]: value }));
  }, []);

  const clearErrorsByTag = useCallback((localName) => {
    setCurrentErrors((prev) => {
      const codesToClear = Object.entries(ERROR_TAG_MAP)
        .filter(([, tags]) => tags.includes(localName))
        .map(([code]) => code);
      return prev.filter((e) => !codesToClear.includes(e.code));
    });
  }, []);

  const toggleExpand = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Search results — flat list of matching leaf nodes
  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !treeRef.current) return null;
    return collectLeafMatches(treeRef.current, term);
  }, [search]);

  // ── Fix Hash MD5 ──────────────────────────────────────────────────────────────

  async function handleFixHash() {
    if (!docRef.current) return;
    setFixingHash(true);
    try {
      const xml  = serializeToXml(docRef.current, domMapRef.current, valueMap);
      const blob = new Blob([xml], { type: 'application/xml' });
      const form = new FormData();
      form.append('xml_file', new File([blob], fileName));

      const { data } = await api.post('/tools/validator/validate-file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.layers?.hash?.status === 'OK') {
        toast.info('Hash MD5 já está correto!');
        return;
      }

      // Extract computed hash from error details: "Declarado: X | Calculado: Y"
      const hashError     = data.errors?.find((e) => e.code === 'hash-integrity-validation');
      const computedHash  = hashError?.details?.match(/Calculado:\s*([a-f0-9]{32})/i)?.[1];

      if (computedHash) {
        const hashNode = findNodeByLocalName(treeRef.current, 'hash');
        if (hashNode) {
          setValueMap((prev) => ({ ...prev, [hashNode.id]: computedHash }));
          setCurrentErrors((prev) => prev.filter(
            (e) => e.code !== 'hash-integrity-validation' && e.code !== 'missing-hash-element'
          ));
          toast.success(`Hash MD5 atualizado: ${computedHash.slice(0, 8)}…`);
        } else {
          toast.warning('Tag <hash> não encontrada no XML — verifique o <epilogo>.');
        }
      } else {
        toast.error('Não foi possível extrair o hash correto. Corrija outros campos primeiro.');
      }
    } catch (err) {
      console.error('[fixHash]', err);
      toast.error('Erro ao recalcular o hash.');
    } finally {
      setFixingHash(false);
    }
  }

  // ── Save & Revalidate ─────────────────────────────────────────────────────────

  async function handleSaveRevalidate() {
    if (!docRef.current) return;
    setRevalidating(true);
    try {
      const xml  = serializeToXml(docRef.current, domMapRef.current, valueMap);
      const blob = new Blob([xml], { type: 'application/xml' });
      const form = new FormData();
      form.append('xml_file', new File([blob], fileName));

      const { data } = await api.post('/tools/validator/validate-file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setRevalResult(data);
      setCurrentErrors(data.errors ?? []);

      if (data.valid) {
        toast.success('Arquivo válido! Redirecionando para o relatório…');
        setTimeout(() => {
          navigate('/tools/tiss-validator', {
            state: { result: data, xml, fileName, fixedXml: xml },
          });
        }, 1000);
      } else {
        toast.warning(`${data.errors.length} irregularidade(s) restante(s). Continue corrigindo.`);
      }
    } catch (err) {
      console.error('[saveRevalidate]', err);
      toast.error('Erro ao revalidar o arquivo.');
    } finally {
      setRevalidating(false);
    }
  }

  if (!initialXml) return null;

  const tree       = treeRef.current;
  const busy       = revalidating || fixingHash;
  const errorCount = currentErrors.length;

  // ── Parse error (malformed XML) ───────────────────────────────────────────────
  if (!tree) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-24">
          <AlertCircle size={36} className="text-red-500 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
            XML inválido — não foi possível analisar a estrutura.
          </p>
          <button onClick={() => navigate('/tools/tiss-validator')}
                  className="mt-4 text-xs font-medium text-blue-600 dark:text-blue-400 underline">
            Voltar ao Validador
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>

      {/* ── Sticky toolbar ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 mb-5
                      bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm
                      border-b border-slate-200 dark:border-slate-800/60">
        <div className="max-w-4xl mx-auto flex items-center gap-2 flex-wrap">

          {/* Back */}
          <button
            onClick={() => navigate('/tools/tiss-validator')}
            className="flex items-center gap-1 text-xs font-medium shrink-0
                       text-slate-500 dark:text-slate-400
                       hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={13} />
            Voltar
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 mx-1" />

          {/* File name + status badges */}
          <div className="flex items-center gap-2 mr-auto min-w-0">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-44 shrink-0">
              {fileName}
            </span>
            {errorCount > 0 ? (
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md
                               bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20
                               transition-all duration-300">
                {errorCount} erro{errorCount !== 1 ? 's' : ''}
              </span>
            ) : revalResult?.valid ? (
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md
                               bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ✓ Válido
              </span>
            ) : null}
          </div>

          {/* Search */}
          <div className="relative shrink-0">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar tag ou valor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-7 pr-6 py-1.5 rounded-lg w-48
                         bg-slate-100 dark:bg-slate-800
                         border border-slate-200 dark:border-slate-700/60
                         text-slate-700 dark:text-slate-200
                         placeholder-slate-400 dark:placeholder-slate-500
                         focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-400/60
                         transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2
                           text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Fix Hash */}
          <button
            onClick={handleFixHash}
            disabled={busy}
            className="flex items-center gap-1.5 shrink-0 text-xs font-semibold
                       px-3 py-1.5 rounded-xl text-white
                       bg-violet-600 hover:bg-violet-500
                       shadow-[0_0_12px_rgba(139,92,246,0.4)]
                       hover:shadow-[0_0_22px_rgba(139,92,246,0.65)]
                       transition-all duration-200
                       disabled:opacity-50 disabled:cursor-wait disabled:shadow-none"
          >
            {fixingHash ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            Corrigir Hash MD5
          </button>

          {/* Save & Revalidate — glows green when all errors are resolved */}
          <button
            onClick={handleSaveRevalidate}
            disabled={busy}
            className={[
              'flex items-center gap-1.5 shrink-0 text-xs font-semibold',
              'px-3 py-1.5 rounded-xl text-white transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-wait',
              errorCount === 0
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.45)] hover:shadow-[0_0_22px_rgba(16,185,129,0.7)]'
                : 'bg-blue-600 hover:bg-blue-700',
            ].join(' ')}
          >
            {revalidating ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Salvar e Revalidar
          </button>
        </div>
      </div>

      {/* ── Page body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto">

        <div className="mb-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Editor Inteligente XML TISS
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Edite os campos diretamente. Campos com falha estão destacados em vermelho com dica de correção.
          </p>
        </div>

        {/* ── Search results (flat list) ──────────────────────────────────────── */}
        {searchResults !== null ? (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para
              <span className="font-semibold text-slate-700 dark:text-slate-300"> "{search}"</span>
            </p>
            {searchResults.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                Nenhuma tag ou valor encontrado.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {searchResults.map(({ node, path }) => (
                  <div key={node.id}
                       className="rounded-xl border border-slate-200 dark:border-slate-800
                                  bg-white dark:bg-slate-900/50 px-4 pt-3 pb-1">
                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-2">
                      {path}
                    </p>
                    <XmlField
                      node={node}
                      valueMap={valueMap}
                      onValueChange={onValueChange}
                      onClearError={clearErrorsByTag}
                      errorTagSet={errorTagSet}
                      compact
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (
          /* ── Accordion tree ──────────────────────────────────────────────────── */
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800
                          bg-white dark:bg-slate-900/50 p-4">
            <XmlBlock
              node={tree}
              valueMap={valueMap}
              onValueChange={onValueChange}
              onClearError={clearErrorsByTag}
              errorTagSet={errorTagSet}
              expanded={expanded}
              toggleExpand={toggleExpand}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
