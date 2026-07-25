import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { motion } from "framer-motion";
import {
  MarkerType,
  ReactFlow,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Home,
  Layers3,
} from "lucide-react";
import { EdgeInspector } from "../components/EdgeInspector";
import {
  ExplorerFlowNode,
  type ExplorerNode,
} from "../components/ExplorerFlowNode";
import { NodeInspector } from "../components/NodeInspector";
import { PageLoader } from "../components/PageLoader";
import {
  getCollapsedEdgesForLayer,
  getBreadcrumbs,
  getChildren,
  getNode,
} from "../domain/graph";
import { createNetworkLayout } from "../domain/networkLayout";
import {
  RELATION_LABELS,
  VIEW_LABELS,
  getViewsForDomain,
} from "../domain/relations";
import { graphRepository } from "../domain/repository";
import type {
  CaseSummary,
  GraphEdge,
  ViewType,
  WorldCase,
} from "../domain/types";

const nodeTypes = { explorer: ExplorerFlowNode };

const VIEW_COLORS: Record<ViewType, string> = {
  structure: "#8b98a6",
  signal: "#56d5ff",
  energy: "#ffc857",
  matter: "#55dfa2",
  code: "#c9a7ff",
  causal: "#ff7aa2",
};

function layoutNodes(
  worldCase: WorldCase,
  children: ReturnType<typeof getChildren>,
  edges: GraphEdge[],
  selectedNodeId: string | null,
  selectedEdge: { source: string; target: string } | null,
): ExplorerNode[] {
  const positions = createNetworkLayout(
    children.map((node) => node.id),
    edges,
  );

  return children.map((graphNode) => {
    const point = positions.get(graphNode.id) ?? { x: 520, y: 305 };

    return {
      id: graphNode.id,
      type: "explorer",
      position: { x: point.x - 66, y: point.y - 24 },
      selected: graphNode.id === selectedNodeId,
      data: {
        graphNode,
        accent: worldCase.accent,
        linked:
          selectedEdge?.source === graphNode.id ||
          selectedEdge?.target === graphNode.id,
        dimmed: false,
      },
    };
  });
}

export function ExplorerPage() {
  const navigate = useNavigate();
  const { caseId = "", nodeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [worldCase, setWorldCase] = useState<WorldCase | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState("");

  const rawView = searchParams.get("view") as ViewType | null;
  const view: ViewType =
    rawView && worldCase
      ? getViewsForDomain(worldCase.domain).includes(rawView)
        ? rawView
        : "structure"
      : rawView ?? "structure";
  const selectedNodeId = searchParams.get("selected");
  const selectedEdgeId = searchParams.get("edge");

  useEffect(() => {
    let alive = true;
    setWorldCase(null);
    setError("");

    Promise.all([
      graphRepository.getCase(caseId),
      graphRepository.listCases(),
    ])
      .then(([loadedCase, summaries]) => {
        if (!alive) return;
        setWorldCase(loadedCase);
        setCases(summaries);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : "案例加载失败");
      });

    return () => {
      alive = false;
    };
  }, [caseId]);

  useEffect(() => {
    if (!worldCase || nodeId) return;
    navigate(
      `/explore/${worldCase.id}/${worldCase.rootNodeId}?${searchParams.toString()}`,
      { replace: true },
    );
  }, [navigate, nodeId, searchParams, worldCase]);

  const currentNode = useMemo(() => {
    if (!worldCase) return null;
    try {
      return getNode(worldCase, nodeId ?? worldCase.rootNodeId);
    } catch {
      return getNode(worldCase, worldCase.rootNodeId);
    }
  }, [nodeId, worldCase]);

  const children = useMemo(
    () =>
      worldCase && currentNode
        ? getChildren(worldCase, currentNode.id)
        : [],
    [currentNode, worldCase],
  );

  const visibleNodeIds = useMemo(
    () => new Set(children.map((node) => node.id)),
    [children],
  );
  const visibleSelectedNodeId =
    selectedNodeId && visibleNodeIds.has(selectedNodeId)
      ? selectedNodeId
      : null;

  const layerEdges = useMemo(
    () =>
      worldCase && currentNode
        ? getCollapsedEdgesForLayer(worldCase, currentNode.id, view)
        : [],
    [currentNode, view, worldCase],
  );

  const displayEdges = useMemo(() => {
    const groups = new Map<string, GraphEdge[]>();
    layerEdges.forEach((edge) => {
      const key = `${edge.source}:${edge.target}`;
      groups.set(key, [...(groups.get(key) ?? []), edge]);
    });

    return Array.from(groups.entries()).map(([key, edges]) => {
      const primary = edges[0];
      return {
        ...primary,
        id: `display:${view}:${key}`,
        displayLabel: Array.from(
          new Set(edges.map((edge) => RELATION_LABELS[edge.relation])),
        ).join(" · "),
        members: edges,
      };
    });
  }, [view, layerEdges]);

  const selectedDisplayEdge = useMemo(
    () => displayEdges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [displayEdges, selectedEdgeId],
  );

  const flowNodes = useMemo(
    () =>
      worldCase && currentNode
        ? layoutNodes(
            worldCase,
            children,
            layerEdges,
            visibleSelectedNodeId,
            selectedDisplayEdge,
          )
        : [],
    [
      currentNode,
      children,
      layerEdges,
      selectedDisplayEdge,
      visibleSelectedNodeId,
      worldCase,
    ],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      displayEdges.map((edge) => {
        const isSelected = edge.id === selectedDisplayEdge?.id;
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: isSelected ? edge.displayLabel : undefined,
          type: "straight",
          selected: isSelected,
          data: { graphEdges: edge.members },
          animated: false,
          interactionWidth: 24,
          markerEnd: isSelected
            ? {
                type: MarkerType.ArrowClosed,
                color: "#0071e3",
                width: 9,
                height: 9,
              }
            : undefined,
          style: {
            stroke: isSelected ? "#0071e3" : "#a8a8ad",
            strokeWidth: isSelected ? 1.8 : 0.9,
            opacity: isSelected ? 1 : 0.58,
          },
          labelStyle: {
            fill: "#1d1d1f",
            fontSize: 9,
            fontWeight: 650,
          },
          labelBgStyle: {
            fill: "#ffffff",
            fillOpacity: 1,
          },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 6,
        };
      }),
    [displayEdges, selectedDisplayEdge, view],
  );

  const selectedNode = useMemo(() => {
    if (!worldCase || !currentNode) return null;
    if (!visibleSelectedNodeId) {
      return children.length === 0 ? currentNode : null;
    }
    return (
      worldCase.nodes.find((node) => node.id === visibleSelectedNodeId) ?? null
    );
  }, [children.length, currentNode, visibleSelectedNodeId, worldCase]);

  const breadcrumbs = useMemo(
    () =>
      worldCase && currentNode
        ? getBreadcrumbs(worldCase, currentNode.id)
        : [],
    [currentNode, worldCase],
  );

  const setView = (nextView: ViewType) => {
    const next = new URLSearchParams(searchParams);
    next.set("view", nextView);
    next.delete("selected");
    next.delete("edge");
    setSearchParams(next);
  };

  const selectNode: NodeMouseHandler<ExplorerNode> = useCallback(
    (_, node) => {
      const next = new URLSearchParams(searchParams);
      next.set("selected", node.id);
      next.delete("edge");
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const exploreNode = (targetId: string) => {
    if (!worldCase) return;
    const next = new URLSearchParams(searchParams);
    next.delete("selected");
    next.delete("edge");
    navigate(`/explore/${worldCase.id}/${targetId}?${next.toString()}`);
  };

  const closeInspector = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("selected");
    next.delete("edge");
    setSearchParams(next);
  };

  const selectEdge = (_: React.MouseEvent, edge: Edge) => {
    const next = new URLSearchParams(searchParams);
    next.set("edge", edge.id);
    next.delete("selected");
    setSearchParams(next);
  };

  if (error) {
    return (
      <div className="error-page">
        <CircleHelp size={34} />
        <h1>这个世界还没有被整理</h1>
        <p>{error}</p>
        <button className="button button--dark" onClick={() => navigate("/")}>
          返回首页
        </button>
      </div>
    );
  }

  if (!worldCase || !currentNode) {
    return <PageLoader />;
  }

  const availableViews = getViewsForDomain(worldCase.domain);

  return (
    <main className="explorer-page">
      <header className="explorer-header">
        <Link className="explorer-wordmark" to="/">
          8bit
        </Link>
        <label className="case-switcher">
          <span
            className="case-switcher__dot"
            style={{ backgroundColor: worldCase.accent }}
          />
          <select
            value={worldCase.id}
            onChange={(event) =>
              navigate(
                `/explore/${event.target.value}?view=structure&goal=learn`,
              )
            }
            aria-label="切换案例"
          >
            {cases.map((summary) => (
              <option value={summary.id} key={summary.id}>
                {summary.shortTitle}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </header>

      <section className="explorer-toolbar">
        <nav className="breadcrumbs" aria-label="探索路径">
          <button type="button" onClick={() => navigate("/")}>
            <Home size={14} />
          </button>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.id}>
              <ChevronRight size={13} />
              <button
                type="button"
                className={index === breadcrumbs.length - 1 ? "is-current" : ""}
                onClick={() => exploreNode(crumb.id)}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>

        <div className="view-switcher" role="group" aria-label="关系视图">
          {availableViews.map((viewId) => (
            <button
              type="button"
              className={view === viewId ? "is-active" : ""}
              style={
                view === viewId
                  ? ({
                      "--view-color": VIEW_COLORS[viewId],
                    } as React.CSSProperties)
                  : undefined
              }
              onClick={() => setView(viewId)}
              key={viewId}
            >
              {VIEW_LABELS[viewId]}
              {view === viewId && <span>{layerEdges.length}</span>}
            </button>
          ))}
        </div>
      </section>

      <div className="explorer-workspace">
        <section className="graph-stage">
          <div className="graph-canvas">
            <div className="graph-context">
              <span className="eyebrow">
                L{currentNode.level + 1} · {children.length} 个节点
              </span>
              <h1>{currentNode.label}</h1>
              <p>{currentNode.summary}</p>
            </div>

            {children.length > 0 ? (
              <ReactFlow<ExplorerNode, Edge>
                key={`${currentNode.id}-${view}`}
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodeClick={selectNode}
                onEdgeClick={selectEdge}
                onPaneClick={closeInspector}
                onNodeDoubleClick={(_, node) => {
                  if (node.data.graphNode.canExpand) exploreNode(node.id);
                }}
                fitView
                fitViewOptions={{ padding: 0.24, maxZoom: 1.18 }}
                minZoom={0.5}
                maxZoom={1.5}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable
                proOptions={{ hideAttribution: true }}
              />
            ) : (
              <div className="graph-empty">
                <Layers3 size={28} />
                <h2>这里已经是当前目标的最小单元</h2>
                <p>你可以从面包屑返回上一层，或切换探索目标。</p>
                {currentNode.parentId && (
                  <button
                    className="button button--accent"
                    onClick={() => exploreNode(currentNode.parentId!)}
                    style={
                      {
                        "--button-accent": worldCase.accent,
                      } as React.CSSProperties
                    }
                  >
                    返回上一层
                  </button>
                )}
              </div>
            )}

            {view !== "structure" && layerEdges.length === 0 && (
              <motion.div
                className="no-relations-notice"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                当前层没有{VIEW_LABELS[view]}关系，节点仍保留以便比较。
              </motion.div>
            )}
          </div>
        </section>

        {selectedDisplayEdge ? (
          <EdgeInspector
            label={selectedDisplayEdge.displayLabel}
            sourceId={selectedDisplayEdge.source}
            targetId={selectedDisplayEdge.target}
            edges={selectedDisplayEdge.members}
            worldCase={worldCase}
            onClose={closeInspector}
          />
        ) : selectedNode ? (
          <NodeInspector
            node={selectedNode}
            worldCase={worldCase}
            closeable={Boolean(visibleSelectedNodeId)}
            onClose={closeInspector}
            onExplore={() => exploreNode(selectedNode.id)}
          />
        ) : (
          <aside className="node-inspector inspector-empty-state">
            <span className="eyebrow">关系讲解</span>
            <h2>选择节点或连接</h2>
            <p>
              点击节点查看它的作用与上下游；点击两个节点之间的连线，拆开理解它们如何发生联系。
            </p>
          </aside>
        )}
      </div>
    </main>
  );
}
