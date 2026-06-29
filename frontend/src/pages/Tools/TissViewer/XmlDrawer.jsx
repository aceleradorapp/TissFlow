import { useEffect, useRef } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';

// ── Pretty-print XML ──────────────────────────────────────────────────────────

function formatXml(xml) {
  let formatted = '';
  let indent    = 0;
  const tab     = '  ';
  const tokens  = xml.replace(/>\s*</g, '><').split(/(?<=>)(?=<)/);

  for (const token of tokens) {
    if (/^<\//.test(token)) {                   // closing tag
      indent = Math.max(0, indent - 1);
      formatted += tab.repeat(indent) + token + '\n';
    } else if (/\/>$/.test(token)) {            // self-closing
      formatted += tab.repeat(indent) + token + '\n';
    } else if (/^<[^?!]/.test(token) && !/<\//.test(token)) { // opening tag
      formatted += tab.repeat(indent) + token + '\n';
      if (!token.includes('</')) indent++;
    } else {
      formatted += tab.repeat(indent) + token + '\n';
    }
  }
  return formatted.trim();
}

// ── Syntax highlight (Dracula theme, safe HTML) ───────────────────────────────

function hlXml(line) {
  const PINK   = '#ff79c6';
  const GREEN  = '#50fa7b';
  const YELLOW = '#f1fa8c';
  const CYAN   = '#8be9fd';
  const MUTED  = '#6272a4';
  const WHITE  = '#f8f8f2';

  // XML declaration
  if (/^<\?/.test(line)) {
    return `<span style="color:${MUTED}">${esc(line)}</span>`;
  }
  // Comments
  if (/^<!--/.test(line)) {
    return `<span style="color:${MUTED};font-style:italic">${esc(line)}</span>`;
  }
  // Tags
  return esc(line)
    // closing tags
    .replace(/(&lt;\/)([\w:.-]+)(&gt;)/g,
      `<span style="color:${PINK}">$1</span><span style="color:${PINK};font-weight:600">$2</span><span style="color:${PINK}">$3</span>`)
    // self-closing tags
    .replace(/(&lt;)([\w:.-]+)([^&]*?)(\/)(&gt;)/g,
      `<span style="color:${PINK}">$1</span><span style="color:${PINK};font-weight:600">$2</span><span style="color:${GREEN}">$3</span><span style="color:${PINK}">$4$5</span>`)
    // opening tags with attributes
    .replace(/(&lt;)([\w:.-]+)((?:\s[^&]*)?)(&gt;)/g, (_, lt, name, attrs, gt) => {
      const styledAttrs = attrs.replace(/([\w:.-]+)(=)(&quot;)([^&]*)(&quot;)/g,
        `<span style="color:${GREEN}">$1</span><span style="color:${MUTED}">$2</span><span style="color:${MUTED}">$3</span><span style="color:${YELLOW}">$4</span><span style="color:${MUTED}">$5</span>`);
      return `<span style="color:${PINK}">${lt}</span><span style="color:${PINK};font-weight:600">${name}</span>${styledAttrs}<span style="color:${PINK}">${gt}</span>`;
    })
    // text content between tags: colour white
    .replace(/^([^<].*[^>])$/, `<span style="color:${WHITE};font-weight:500">$1</span>`)
    // inline text content after a tag
    .replace(/(>[^<]+)(<)/g,
      (_, text, lt) => `<span style="color:${WHITE}">${text}</span>${lt}`);
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Copy button ───────────────────────────────────────────────────────────────

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
      onClick={copy}
      type="button"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                 transition-all duration-150
                 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-700/60
                 border border-slate-700/60"
    >
      {copied
        ? <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copiado</span></>
        : <><Copy size={11} /><span>Copiar XML</span></>
      }
    </button>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export default function XmlDrawer({ xml, open, onClose }) {
  const overlayRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pretty = xml ? formatXml(xml) : '';
  const lines  = pretty.split('\n');

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{ width: 'min(680px, 92vw)' }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3
                        bg-slate-900 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[11px] font-mono text-slate-400 flex-1 truncate">
            XML Bruto · {lines.length} linhas
          </span>
          <CopyBtn text={pretty} />
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800
                       transition-all duration-150"
          >
            <X size={15} />
          </button>
        </div>

        {/* Code body */}
        <div className="flex-1 overflow-auto bg-slate-950 font-mono text-[11.5px] leading-[1.65]">
          <table className="w-full border-collapse" style={{ minWidth: 'max-content' }}>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-white/[0.03] group">
                  <td
                    className="select-none text-right pr-4 pl-4 py-0 text-slate-600 group-hover:text-slate-500 tabular-nums"
                    style={{ minWidth: '3rem', borderRight: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    {i + 1}
                  </td>
                  <td
                    className="pl-4 pr-6 py-0 whitespace-pre"
                    style={{ color: '#f8f8f2' }}
                    dangerouslySetInnerHTML={{ __html: hlXml(line) || '&nbsp;' }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
