import { useState, useMemo } from 'react';
import { X, Copy, Check, Download, ChevronRight, ChevronDown } from 'lucide-react';

// ── Syntax highlighters (inline styles — no Tailwind in dangerouslySetInnerHTML) ──

// XML: Dracula theme — tags pink (#ff79c6), attributes green (#50fa7b), values yellow (#f1fa8c), text white
function hlXml(rawLine) {
  const esc = rawLine
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // XML declaration — muted Dracula comment color
  if (/^\s*&lt;\?xml/.test(esc)) {
    return `<span style="color:#6272a4">${esc}</span>`;
  }

  const PINK   = '#ff79c6';
  const GREEN  = '#50fa7b';
  const YELLOW = '#f1fa8c';
  const WHITE  = '#f8f8f2';

  return esc
    // Closing tag: &lt;/ns:tag&gt; — entirely pink
    .replace(
      /(&lt;\/)([a-zA-Z:][a-zA-Z0-9_.-]*)(&gt;)/g,
      (_, open, name, close) =>
        `<span style="color:${PINK};font-weight:600">${open}${name}${close}</span>`,
    )
    // Opening / self-closing tag — pink delimiters+name, green attrs, yellow values
    .replace(
      /(&lt;)([a-zA-Z:][a-zA-Z0-9_.-]*)([^]*?)(\/?&gt;)/,
      (_, lt, tag, rest, close) => {
        const hRest = rest.replace(
          /([a-zA-Z:][a-zA-Z0-9_:.-]*)=&quot;([^&]*)&quot;/g,
          `<span style="color:${GREEN}">$1</span>=<span style="color:${YELLOW}">&quot;$2&quot;</span>`,
        );
        return (
          `<span style="color:${PINK};font-weight:600">${lt}${tag}</span>` +
          hRest +
          `<span style="color:${PINK};font-weight:600">${close}</span>`
        );
      },
    )
    // Text content between &gt; ... &lt; — bright white
    .replace(
      /(&gt;)([^&\n]+)(&lt;)/g,
      `$1<span style="color:${WHITE};font-weight:500">$2</span>$3`,
    );
}

// JSON: Dracula theme — keys cyan (#8be9fd), strings yellow (#f1fa8c), numbers purple (#bd93f9), brackets gray
function hlJson(rawLine) {
  let s = rawLine
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const CYAN   = '#8be9fd';
  const YELLOW = '#f1fa8c';
  const PURPLE = '#bd93f9';
  const GRAY   = '#6272a4';

  // Object key: "key":
  s = s.replace(
    /^(\s*)"([^"]+)"(\s*:)/,
    `$1<span style="color:${CYAN};font-weight:600">"$2"</span>$3`,
  );
  // String value
  s = s.replace(
    /(:\s*)"([^"]*)"(,?)$/,
    `$1<span style="color:${YELLOW}">"$2"</span>$3`,
  );
  // Numeric value
  s = s.replace(
    /(:\s*)(-?\d+\.?\d*)(,?)$/,
    `$1<span style="color:${PURPLE}">$2</span>$3`,
  );
  // Structural brackets on their own line
  s = s.replace(
    /^(\s*)([{}\[\]]),?$/,
    (m) => `<span style="color:${GRAY}">${m}</span>`,
  );

  return s;
}

// ── XML block parser ───────────────────────────────────────────────────────
// Identifies depth-1 collapsible blocks (direct children of mensagemTISS at 2-space indent)

function parseXmlBlocks(xml) {
  const lines    = xml.split('\n');
  const segments = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Depth-1 opening tag: exactly 2 spaces, then <ans:name> with NO attrs and NO self-close
    const m = /^  <(ans:[a-zA-Z][a-zA-Z0-9_.-]*)>$/.exec(line);
    if (m) {
      const fullTag  = m[1];
      const closeTag = `  </${fullTag}>`;
      let j = i + 1;
      while (j < lines.length && lines[j] !== closeTag) j++;
      segments.push({
        type:    'block',
        id:      i,
        fullTag,
        header:  line,
        inner:   lines.slice(i + 1, j),
        footer:  lines[j] ?? closeTag,
      });
      i = j + 1;
    } else {
      segments.push({ type: 'line', id: i, content: line });
      i++;
    }
  }
  return segments;
}

// ── Code line renderer ─────────────────────────────────────────────────────

function CodeLine({ content, lang, lineNum }) {
  const html = lang === 'xml' ? hlXml(content) : hlJson(content);
  return (
    <div className="flex items-start min-h-[1.45rem] hover:bg-white/[0.03] transition-colors">
      <span
        className="shrink-0 select-none text-right pr-4 pt-px"
        style={{ width: '3rem', fontSize: '10px', fontFamily: 'monospace', color: '#334155', lineHeight: '1.45rem' }}
      >
        {lineNum}
      </span>
      <span
        style={{ fontSize: '11.5px', fontFamily: 'monospace', lineHeight: '1.45rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#f8f8f2' }}
        dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }}
      />
    </div>
  );
}

// ── XML viewer with collapsible depth-1 blocks ────────────────────────────

function XmlViewer({ xml }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const segments = useMemo(() => parseXmlBlocks(xml), [xml]);

  function toggle(id) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  let lineNum = 0;
  const rows  = [];

  for (const seg of segments) {
    if (seg.type === 'line') {
      lineNum++;
      rows.push(<CodeLine key={seg.id} content={seg.content} lang="xml" lineNum={lineNum} />);
    } else {
      const isCollapsed   = collapsed.has(seg.id);
      const headerLineNum = ++lineNum;

      // Header row — clickable
      rows.push(
        <div
          key={seg.id}
          onClick={() => toggle(seg.id)}
          className="flex items-start cursor-pointer group hover:bg-white/[0.04] transition-colors"
        >
          {/* Line number */}
          <span
            className="shrink-0 select-none text-right pr-4 pt-px"
            style={{ width: '3rem', fontSize: '10px', fontFamily: 'monospace', color: '#334155', lineHeight: '1.45rem' }}
          >
            {headerLineNum}
          </span>
          {/* Toggle icon */}
          <span className="shrink-0 flex items-center justify-center" style={{ width: '14px', marginRight: '2px', paddingTop: '3px' }}>
            {isCollapsed
              ? <ChevronRight size={11} style={{ color: '#38bdf8', flexShrink: 0 }} />
              : <ChevronDown  size={11} style={{ color: '#38bdf8', flexShrink: 0 }} />}
          </span>
          <span
            style={{ fontSize: '11.5px', fontFamily: 'monospace', lineHeight: '1.45rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#f8f8f2' }}
            dangerouslySetInnerHTML={{ __html: hlXml(seg.header) }}
          />
        </div>,
      );

      if (isCollapsed) {
        // Collapsed placeholder
        lineNum++;
        rows.push(
          <div key={`${seg.id}-c`} className="flex items-center">
            <span style={{ width: '3rem', flexShrink: 0 }} />
            <span style={{ width: '16px', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#475569', fontStyle: 'italic', lineHeight: '1.45rem' }}>
              {`  /* ${seg.inner.length} linha${seg.inner.length !== 1 ? 's' : ''} */`}
            </span>
          </div>,
        );
        lineNum++;
        rows.push(<CodeLine key={`${seg.id}-f`} content={seg.footer} lang="xml" lineNum={lineNum} />);
      } else {
        // Expanded inner + footer
        for (const innerLine of seg.inner) {
          lineNum++;
          rows.push(<CodeLine key={`${seg.id}-i-${lineNum}`} content={innerLine} lang="xml" lineNum={lineNum} />);
        }
        lineNum++;
        rows.push(<CodeLine key={`${seg.id}-f`} content={seg.footer} lang="xml" lineNum={lineNum} />);
      }
    }
  }

  return <div>{rows}</div>;
}

function JsonViewer({ json }) {
  return (
    <div>
      {json.split('\n').map((line, i) => (
        <CodeLine key={i} content={line} lang="json" lineNum={i + 1} />
      ))}
    </div>
  );
}

// ── Copy / Download buttons ────────────────────────────────────────────────

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150',
        copied
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          : 'bg-slate-800 text-slate-300 border-slate-600/60 hover:bg-slate-700 hover:text-white',
      ].join(' ')}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

function DownloadBtn({ content, filename }) {
  function download() {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      type="button"
      onClick={download}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border
                 bg-blue-600/20 text-blue-300 border-blue-500/40
                 hover:bg-blue-600/30 hover:text-blue-200 transition-all duration-150"
    >
      <Download size={12} />
      Baixar
    </button>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────

export default function OutputModal({ xml, json, initialTab = 'xml', onClose }) {
  const [tab, setTab] = useState(initialTab);

  const content  = tab === 'xml' ? xml : json;
  const filename = tab === 'xml' ? 'amostra-tiss.xml' : 'amostra-tiss.json';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex flex-col w-full max-w-5xl rounded-2xl overflow-hidden"
        style={{
          height:     'min(90vh, 820px)',
          background: '#020617',
          border:     '1px solid rgba(255,255,255,0.08)',
          boxShadow:  '0 25px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* ── Title bar ──────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-3"
          style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: '#f87171', opacity: 0.7 }} />
              <span className="w-3 h-3 rounded-full" style={{ background: '#fbbf24', opacity: 0.7 }} />
              <span className="w-3 h-3 rounded-full" style={{ background: '#4ade80', opacity: 0.7 }} />
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
              amostra-tiss.{tab}
            </span>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-0.5 rounded-lg overflow-hidden" style={{ background: '#1e293b' }}>
            {['xml', 'json'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding:     '4px 16px',
                  fontSize:    '11px',
                  fontFamily:  'monospace',
                  fontWeight:  700,
                  cursor:      'pointer',
                  border:      'none',
                  transition:  'all 0.15s',
                  background:  tab === t ? '#334155' : 'transparent',
                  color:       tab === t ? '#f1f5f9' : '#64748b',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <CopyBtn text={content} />
            <DownloadBtn content={content} filename={filename} />
            <button
              type="button"
              onClick={onClose}
              className="ml-1 p-1.5 rounded-lg transition-all duration-150"
              style={{ color: '#64748b' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Code body ───────────────────────────────────────── */}
        <div className="flex-1 overflow-auto" style={{ background: '#020617', padding: '8px 0' }}>
          {tab === 'xml'
            ? <XmlViewer xml={xml} />
            : <JsonViewer json={json} />}
        </div>
      </div>
    </div>
  );
}
