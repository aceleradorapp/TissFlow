import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '../../../components/DashboardLayout';
import api             from '../../../services/api';
import VersionSelector from './VersionSelector';
import TreePanel       from './TreePanel';
import InspectorPanel  from './InspectorPanel';

export default function SwaggerVisual() {
  const [versions,          setVersions]          = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [rootNode,          setRootNode]          = useState(null);
  // nodeCache: { [fieldId]: { isOpen, children: TissField[]|null, isLoading } }
  const [nodeCache,         setNodeCache]         = useState({});
  const nodeCacheRef = useRef({});
  const [selectedField,     setSelectedField]     = useState(null);
  const [highlightedId,     setHighlightedId]     = useState(null);
  const [loadingVersions,   setLoadingVersions]   = useState(true);
  const [loadingRoot,       setLoadingRoot]       = useState(false);
  const [isSearching,       setIsSearching]       = useState(false);
  const [searchResults,     setSearchResults]     = useState(null); // null = no search, [] = none found

  // ── Versions on mount ────────────────────────────────────────────
  useEffect(() => {
    api.get('/tools/swagger/versions')
      .then(({ data }) => setVersions(data.versions))
      .catch((err) => {
        const msg = err.response?.data?.error ?? 'Erro ao carregar versões TISS.';
        toast.error(msg);
      })
      .finally(() => setLoadingVersions(false));
  }, []);

  // ── Root node when version changes ───────────────────────────────
  useEffect(() => {
    if (!selectedVersionId) {
      setRootNode(null);
      setNodeCache({});
      setSelectedField(null);
      setHighlightedId(null);
      setSearchResults(null);
      return;
    }
    setLoadingRoot(true);
    setRootNode(null);
    setNodeCache({});
    setSelectedField(null);
    setHighlightedId(null);
    setSearchResults(null);
    // No node_path = get root (mensagemTISS)
    api.get(`/tools/swagger/tree?version_id=${selectedVersionId}`)
      .then(({ data }) => {
        if (data.root) setRootNode({ ...data.root, path: data.root.name });
      })
      .catch(() => setRootNode(null))
      .finally(() => setLoadingRoot(false));
  }, [selectedVersionId]);

  // Keep ref in sync so handleSearch always sees the latest cache without being a dep.
  useEffect(() => { nodeCacheRef.current = nodeCache; }, [nodeCache]);

  // ── Expand / collapse (lazy-loads children via XSD type name) ────
  const handleExpand = useCallback(async (node, state) => {
    if (state.isLoading) return;

    if (state.isOpen) {
      setNodeCache((prev) => ({ ...prev, [node.path]: { ...prev[node.path], isOpen: false } }));
      return;
    }

    if (state.children !== null) {
      setNodeCache((prev) => ({ ...prev, [node.path]: { ...prev[node.path], isOpen: true } }));
      return;
    }

    // Fetch children for this XSD type (node.type = e.g. "ct_mensagemTISS")
    setNodeCache((prev) => ({ ...prev, [node.path]: { ...prev[node.path], isOpen: true, isLoading: true } }));
    try {
      const { data } = await api.get(
        `/tools/swagger/tree?version_id=${selectedVersionId}&node_path=${encodeURIComponent(node.type)}`,
      );
      // Unwrap the array from the response envelope; guard against unexpected shapes.
      const rawChildren = Array.isArray(data) ? data : (Array.isArray(data.children) ? data.children : []);
      const children = rawChildren.map((c) => ({ ...c, path: `${node.path}.${c.name}` }));
      setNodeCache((prev) => ({
        ...prev,
        [node.path]: { isOpen: true, children, isLoading: false },
      }));
    } catch {
      setNodeCache((prev) => ({ ...prev, [node.path]: { isOpen: false, children: null, isLoading: false } }));
    }
  }, [selectedVersionId]);

  // ── Smart search: locate field + auto-expand ancestor path ───────
  // ancestorPath from backend: [{name, type}] from root → parent of found field
  const handleSearch = useCallback(async (query) => {
    if (!query.trim() || !selectedVersionId) {
      setHighlightedId(null);
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await api.get(
        `/tools/swagger/search?version_id=${selectedVersionId}&q=${encodeURIComponent(query)}`,
      );
      setSearchResults(data.results);

      if (!data.results.length) {
        setHighlightedId(null);
        return;
      }

      const first  = data.results[0];
      const cache  = nodeCacheRef.current;
      const updates = {};

      // Walk the ancestor path, building full tree positions
      // e.g. [{name:'mensagemTISS', type:'ct_mensagemTISS'}, {name:'cabecalho', type:'ct_cabecalho'}]
      let builtPath = '';
      for (const ancestor of first.ancestorPath) {
        builtPath = builtPath ? `${builtPath}.${ancestor.name}` : ancestor.name;

        const existing = cache[builtPath] ?? { isOpen: false, children: null, isLoading: false };
        if (existing.children !== null) {
          updates[builtPath] = { ...existing, isOpen: true };
        } else {
          try {
            const { data: cd } = await api.get(
              `/tools/swagger/tree?version_id=${selectedVersionId}&node_path=${encodeURIComponent(ancestor.type)}`,
            );
            const parentPath  = builtPath;
            const rawCd       = Array.isArray(cd) ? cd : (Array.isArray(cd.children) ? cd.children : []);
            const children    = rawCd.map((c) => ({ ...c, path: `${parentPath}.${c.name}` }));
            updates[builtPath] = { isOpen: true, children, isLoading: false };
          } catch { /* skip if ancestor fetch fails */ }
        }
      }

      setNodeCache((prev) => ({ ...prev, ...updates }));

      // Highlight & select the found field (compute its full path)
      const foundPath = builtPath ? `${builtPath}.${first.field.name}` : first.field.name;
      setHighlightedId(foundPath);
      setSelectedField({ ...first.field, path: foundPath });
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedVersionId]);

  return (
    <DashboardLayout>
      {/* -m-6 cancels DashboardLayout p-6; height fills viewport minus 64px header */}
      <div className="flex overflow-hidden -m-6" style={{ height: 'calc(100vh - 64px)' }}>

        {/* Left: version selector */}
        <div className="w-52 shrink-0 border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950/70">
          <VersionSelector
            versions={versions}
            versionId={selectedVersionId}
            onVersionChange={(v) => setSelectedVersionId(v)}
            loadingVersions={loadingVersions}
          />
        </div>

        {/* Center: lazy tree */}
        <div className="flex-1 min-w-0 border-r border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/40">
          <TreePanel
            rootNode={rootNode}
            loading={loadingRoot}
            nodeCache={nodeCache}
            onExpand={handleExpand}
            selectedId={selectedField?.path ?? null}
            highlightedId={highlightedId}
            onSelect={setSelectedField}
            onSearch={handleSearch}
            isSearching={isSearching}
            searchResults={searchResults}
          />
        </div>

        {/* Right: field inspector */}
        <div className="w-72 shrink-0 border-l border-slate-200 dark:border-slate-800/40 bg-slate-50 dark:bg-slate-950/50">
          <InspectorPanel field={selectedField} />
        </div>

      </div>
    </DashboardLayout>
  );
}
