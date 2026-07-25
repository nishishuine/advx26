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
  ArrowRight,
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
import { SimpleEdgeInspector } from "../components/SimpleEdgeInspector";
import { SimpleNodeInspector } from "../components/SimpleNodeInspector";
import { TutorialVisualGallery } from "../components/TutorialVisualGallery";
import {
  getBreadcrumbs,
  getChildren,
  getCollapsedEdgesForLayer,
  getNode,
} from "../domain/graph";
import {
  createCaseLayout,
  resolveLayoutMode,
} from "../domain/networkLayout";
import {
  RELATION_LABELS,
  VIEW_LABELS,
  getViewsForDomain,
} from "../domain/relations";
import { graphRepository } from "../domain/repository";
import { orangePiOverviewVisuals } from "../domain/orangePiVisuals";
import type { GraphEdge, ViewType, WorldCase } from "../domain/types";

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
  useMapStyle = false,
): ExplorerNode[] {
  const layoutMode = resolveLayoutMode(worldCase.layout);
  const positions = createCaseLayout(layoutMode, children, edges);
  const mapY = [175, 440, 255, 500, 185, 390, 135, 460];

  return children.map((graphNode, index) => {
    const point = useMapStyle
      ? children.length === 1
        ? { x: 540, y: 330 }
        : {
            x: 130 + (index / (children.length - 1)) * 820,
            y: mapY[index % mapY.length],
          }
      : (positions.get(graphNode.id) ?? { x: 520, y: 305 });

    return {
      id: graphNode.id,
      type: "explorer",
      position: { x: point.x - 66, y: point.y - (useMapStyle ? 48 : 24) },
      selected: graphNode.id === selectedNodeId,
      data: {
        graphNode,
        accent: worldCase.accent,
        layoutMode,
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
  const [error, setError] = useState("");

  const rawView = searchParams.get("view") as ViewType | null;
  const isSimpleExplore = worldCase?.id === "orange-pi-first-boot";
  const view: ViewType =
    isSimpleExplore
      ? "structure"
      : rawView && worldCase
      ? getViewsForDomain(worldCase.domain).includes(rawView)
        ? rawView
        : "structure"
      : rawView ?? "structure";
  const selectedNodeId = searchParams.get("selected");
  const selectedEdgeId = searchParams.get("edge");
  const layoutMode = resolveLayoutMode(worldCase?.layout);
  const isWorkflow = layoutMode === "workflow";

  useEffect(() => {
    let alive = true;
    setWorldCase(null);
    setError("");

    graphRepository
      .getCase(caseId)
      .then((loadedCase) => {
        if (!alive) return;
        setWorldCase(loadedCase);
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

  const layoutEdges = useMemo(() => {
    if (!worldCase || !currentNode || !isWorkflow) return layerEdges;

    const stableEdges = new Map<string, GraphEdge>();
    getViewsForDomain(worldCase.domain).forEach((layoutView) => {
      getCollapsedEdgesForLayer(worldCase, currentNode.id, layoutView).forEach(
        (edge) => {
          const key = `${edge.source}:${edge.target}`;
          if (!stableEdges.has(key)) stableEdges.set(key, edge);
        },
      );
    });
    return Array.from(stableEdges.values());
  }, [currentNode, isWorkflow, layerEdges, worldCase]);

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
            layoutEdges,
            visibleSelectedNodeId,
            selectedDisplayEdge,
            isSimpleExplore,
          )
        : [],
    [
      currentNode,
      children,
      isSimpleExplore,
      layoutEdges,
      selectedDisplayEdge,
      visibleSelectedNodeId,
      worldCase,
    ],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      displayEdges.map((edge) => {
        const isSelected = edge.id === selectedDisplayEdge?.id;
        const isSupportingPath =
          isWorkflow &&
          edge.members.length > 0 &&
          edge.members.every((member) => member.flowStyle === "support");
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: isSelected
            ? isSimpleExplore
              ? "如何接上"
              : edge.displayLabel
            : undefined,
          type: isSimpleExplore
            ? "default"
            : isWorkflow
              ? "smoothstep"
              : "straight",
          selected: isSelected,
          data: { graphEdges: edge.members },
          animated: false,
          interactionWidth: 24,
          markerEnd: isWorkflow || isSelected
            ? {
                type: MarkerType.ArrowClosed,
                color: isSelected
                  ? isSimpleExplore
                    ? "#2f7f88"
                    : "#0071e3"
                  : isSimpleExplore
                    ? "#8eafb2"
                    : "#8e8e93",
                width: isSelected ? 9 : 8,
                height: isSelected ? 9 : 8,
              }
            : undefined,
          style: {
            stroke: isSelected
              ? isSimpleExplore
                ? "#2f7f88"
                : "#0071e3"
              : isSimpleExplore
                ? "#a8bec0"
                : "#a8a8ad",
            strokeWidth: isSelected ? 1.8 : isSimpleExplore ? 1.2 : 0.9,
            opacity: isSelected ? 1 : isSimpleExplore ? 0.82 : isWorkflow ? 0.72 : 0.58,
            strokeDasharray: isSupportingPath ? "5 5" : undefined,
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
    [displayEdges, isSimpleExplore, isWorkflow, selectedDisplayEdge, view],
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

  const availableViews = isSimpleExplore
    ? (["structure"] as ViewType[])
    : getViewsForDomain(worldCase.domain);

  return (
    <main
      className={`explorer-page ${isSimpleExplore ? "explorer-page--simple" : ""}`}
    >
      <header className="explorer-header">
        <Link className="explorer-wordmark" to="/">
          manifold
        </Link>
        <div className="case-switcher case-switcher--single">
          <span
            className="case-switcher__dot"
            style={{ backgroundColor: worldCase.accent }}
          />
          <strong>{worldCase.shortTitle}</strong>
        </div>
        <span className="build-flow-header__mode">拆开</span>
        <Link
          className="build-flow-header__switch"
          to={`/rebuild/${worldCase.id}`}
        >
          开始打造
          <ArrowRight size={14} />
        </Link>
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

        {isSimpleExplore ? (
          <div className="explore-mode-label">
            <span />
            拆开 · 主要部分与关系
          </div>
        ) : (
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
        )}
      </section>

      <div className="explorer-workspace">
        <section className="graph-stage">
          <div className="graph-canvas">
            <div className="graph-context">
              <span className="eyebrow">
                {isSimpleExplore
                  ? currentNode.id === worldCase.rootNodeId
                    ? "主要部分"
                    : "继续拆开"
                  : `L${currentNode.level + 1} · ${children.length} 个节点`}
              </span>
              <h1>{currentNode.label}</h1>
              <p>{currentNode.summary}</p>
            </div>

            {isWorkflow &&
              children.length > 1 &&
              (!isSimpleExplore ||
                currentNode.id === worldCase.rootNodeId) && (
              <div className="workflow-direction" aria-hidden="true">
                <span>开始</span>
                <i />
                <span>接近完成</span>
              </div>
              )}

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
                fitViewOptions={{
                  padding: isWorkflow ? 0.14 : 0.24,
                  maxZoom: 1.18,
                }}
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

            {!isSimpleExplore &&
              view !== "structure" &&
              layerEdges.length === 0 && (
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
          isSimpleExplore ? (
            <SimpleEdgeInspector
              label={selectedDisplayEdge.displayLabel}
              sourceId={selectedDisplayEdge.source}
              targetId={selectedDisplayEdge.target}
              edges={selectedDisplayEdge.members}
              worldCase={worldCase}
              onClose={closeInspector}
            />
          ) : (
            <EdgeInspector
              label={selectedDisplayEdge.displayLabel}
              sourceId={selectedDisplayEdge.source}
              targetId={selectedDisplayEdge.target}
              edges={selectedDisplayEdge.members}
              worldCase={worldCase}
              onClose={closeInspector}
            />
          )
        ) : selectedNode ? (
          isSimpleExplore ? (
            <SimpleNodeInspector
              node={selectedNode}
              worldCase={worldCase}
              closeable={Boolean(visibleSelectedNodeId)}
              onClose={closeInspector}
              onExplore={() => exploreNode(selectedNode.id)}
            />
          ) : (
            <NodeInspector
              node={selectedNode}
              worldCase={worldCase}
              closeable={Boolean(visibleSelectedNodeId)}
              onClose={closeInspector}
              onExplore={() => exploreNode(selectedNode.id)}
            />
          )
        ) : (
          <aside
            className={
              isSimpleExplore
                ? "simple-inspector simple-inspector--empty"
                : "node-inspector inspector-empty-state"
            }
          >
            <span className={isSimpleExplore ? "simple-inspector__eyebrow" : "eyebrow"}>
              关系讲解
            </span>
            <h2>点一个部分看看</h2>
            <p>
              {isSimpleExplore
                ? "点小圆点了解它负责什么；点连线了解前后两个部分如何接上。"
                : "点击节点查看它的作用与上下游；点击两个节点之间的连线，拆开理解它们如何发生联系。"}
            </p>
            {isSimpleExplore && (
              <TutorialVisualGallery
                visuals={orangePiOverviewVisuals}
                compact
              />
            )}
          </aside>
        )}
      </div>
    </main>
  );
}
