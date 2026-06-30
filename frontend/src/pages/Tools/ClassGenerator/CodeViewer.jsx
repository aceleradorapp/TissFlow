import { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';

// ── High-contrast palette (dark-mode IDE) ───────────────────────────────────
// Vivid blue / emerald / amber / pure white only — no purple/pink, per spec.

const COLOR_CLASS = {
  blue:    'text-[#60a5fa]',
  emerald: 'text-[#34d399]',
  amber:   'text-[#fbbf24]',
  white:   'text-[#f8fafc]',
  comment: 'text-slate-500 italic',
};

// ── Code tokenizer (.NET / TypeScript / Go / Python) ───────────────────────
// Single left-to-right pass: each character of the line is classified exactly
// once, avoiding the nested-span bug of sequential regex-replace approaches.

const KEYWORDS = new Set([
  'public', 'private', 'protected', 'static', 'readonly', 'const', 'let', 'var', 'new',
  'export', 'interface', 'class', 'namespace', 'using', 'import', 'from', 'return',
  'def', 'package', 'type', 'struct', 'func', 'dataclass', 'self', 'this',
  'null', 'None', 'True', 'False', 'true', 'false', 'void', 'async', 'await',
]);

const TYPE_WORDS = new Set([
  'string', 'number', 'boolean', 'int', 'long', 'double', 'decimal', 'bool',
  'float', 'float64', 'int64', 'str',
]);

const ATTRIBUTE_LINE_RE = /^\s*(\[[A-Za-z_]\w*(?:\([^)]*\))?\]|@[A-Za-z_]\w*)\s*$/;
const CODE_TOKEN_RE = /(\/\/.*$|#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|\b([A-Za-z_]\w*)\b/gm;

function highlightCodeLine(line) {
  // Whole-line attributes/decorators ([Required], [StringLength(20)], @dataclass)
  if (ATTRIBUTE_LINE_RE.test(line)) {
    const indent = line.match(/^\s*/)[0];
    return [{ text: indent, color: null }, { text: line.trim(), color: 'amber' }];
  }

  const out = [];
  let last = 0;
  let m;
  CODE_TOKEN_RE.lastIndex = 0;
  while ((m = CODE_TOKEN_RE.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), color: null });

    if (m[1] !== undefined) {
      out.push({ text: m[1], color: 'comment' });
    } else if (m[2] !== undefined) {
      out.push({ text: m[2], color: 'amber' });
    } else if (m[3] !== undefined) {
      const word = m[3];
      if (KEYWORDS.has(word))      out.push({ text: word, color: 'blue' });
      else if (TYPE_WORDS.has(word) || /^[A-Z]/.test(word)) out.push({ text: word, color: 'emerald' });
      else                          out.push({ text: word, color: null });
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), color: null });
  return out;
}

// ── XML tokenizer ────────────────────────────────────────────────────────

const XML_TOKEN_RE = /(<\?[^?]*\?>)|(<\/?[\w:.-]+)|(\/?>)|([\w:.-]+=)|("[^"]*")|([^<>]+)/g;

function highlightXmlLine(line) {
  const out = [];
  let last = 0;
  let m;
  XML_TOKEN_RE.lastIndex = 0;
  while ((m = XML_TOKEN_RE.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), color: null });

    if (m[1] !== undefined)      out.push({ text: m[1], color: 'blue' });
    else if (m[2] !== undefined) out.push({ text: m[2], color: 'blue' });
    else if (m[3] !== undefined) out.push({ text: m[3], color: 'blue' });
    else if (m[4] !== undefined) out.push({ text: m[4], color: 'amber' });
    else if (m[5] !== undefined) out.push({ text: m[5], color: 'amber' });
    else if (m[6] !== undefined) out.push({ text: m[6], color: 'white' });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), color: null });
  return out;
}

// ── Component ────────────────────────────────────────────────────────────

export default function CodeViewer({ code, fileName, language, onDownload }) {
  const [copied, setCopied] = useState(false);
  const lines       = (code ?? '').split('\n');
  const highlighter = language === 'xml' ? highlightXmlLine : highlightCodeLine;

  function handleCopy() {
    navigator.clipboard.writeText(code ?? '').then(() => {
      setCopied(true);
      toast.success('Código copiado para a área de transferência.');
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-slate-950 overflow-hidden">
      {/* Header / floating actions */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/70">
        <span className="text-[11px] font-mono text-slate-400 truncate">{fileName || 'output'}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
                       bg-blue-500/10 text-[#60a5fa] border border-blue-500/30
                       hover:bg-blue-500/20 transition-all duration-150"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            Copiar Código
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
                       bg-emerald-500/10 text-[#34d399] border border-emerald-500/30
                       hover:bg-emerald-500/20 transition-all duration-150"
          >
            <Download size={12} />
            Baixar Arquivo
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-white/[0.03]">
                <td className="select-none text-right pr-4 pl-4 text-[11px] font-mono text-slate-600 align-top w-12 sticky left-0 bg-slate-950">
                  {i + 1}
                </td>
                <td className="pr-6 text-[12px] leading-5 font-mono whitespace-pre text-[#f8fafc] align-top">
                  {line === ''
                    ? ' '
                    : highlighter(line).map((tok, j) => (
                      tok.color
                        ? <span key={j} className={COLOR_CLASS[tok.color]}>{tok.text}</span>
                        : <span key={j}>{tok.text}</span>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
