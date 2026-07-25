import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Box,
  Braces,
  Code2,
  ExternalLink,
  Layers3,
  Wrench,
  X,
} from "lucide-react";
import { RELATION_LABELS } from "../domain/relations";
import type { GraphEdge, GraphNode, WorldCase } from "../domain/types";
import { StatusBadge } from "./StatusBadge";

type NodeInspectorProps = {
  node: GraphNode;
  worldCase: WorldCase;
  onClose: () => void;
  onExplore: () => void;
  closeable: boolean;
};

const buildabilityLabels = {
  safe: "适合安全观察或制作",
  guided: "建议在指导下制作或替换",
  not_recommended: "不建议自行制作",
};

const kindLabels = {
  entity: "实体",
  process: "过程",
  code: "代码",
  evidence: "证据",
};

export function NodeInspector({
  node,
  worldCase,
  onClose,
  onExplore,
  closeable,
}: NodeInspectorProps) {
  const relatedEdges = worldCase.edges.filter(
    (edge) => edge.source === node.id || edge.target === node.id,
  );

  const resolveNode = (id: string) =>
    worldCase.nodes.find((candidate) => candidate.id === id);

  const relationDirection = (edge: GraphEdge) => {
    const isSource = edge.source === node.id;
    const other = resolveNode(isSource ? edge.target : edge.source);
    return {
      other,
      label: isSource ? "流向" : "来自",
      Icon: isSource ? ArrowDownRight : ArrowUpRight,
    };
  };

  return (
    <aside className="node-inspector">
      <div className="node-inspector__top">
        <span className="eyebrow">节点讲解 · L{node.level}</span>
        {closeable && (
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="关闭详情"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="node-inspector__title">
        <div>
          <StatusBadge status={node.status} />
          <h2>{node.label}</h2>
          {(node.kind || node.scale) && (
            <div className="node-kind-row">
              {node.kind && <span>{kindLabels[node.kind]}</span>}
              {node.scale && <span>{node.scale}</span>}
            </div>
          )}
        </div>
        <span
          className="node-inspector__index"
          style={{ borderColor: worldCase.accent }}
        >
          {String(node.index ?? node.level).padStart(2, "0")}
        </span>
      </div>

      <p className="node-inspector__summary">{node.summary}</p>

      <section className="inspector-section">
        <h3>
          <Box size={15} />
          它在做什么
        </h3>
        <p>{node.function}</p>
      </section>

      {node.code && (
        <section className="inspector-section code-inspector">
          <div className="inspector-section__heading">
            <h3>
              <Code2 size={15} />
              实际代码
            </h3>
            <span>
              {node.code.language}
              {node.code.line ? ` · L${node.code.line}` : ""}
            </span>
          </div>
          <pre>
            <code>{node.code.snippet}</code>
          </pre>
          <div className="code-inspector__io">
            {node.code.input && (
              <p>
                <span>输入</span>
                {node.code.input}
              </p>
            )}
            {node.code.output && (
              <p>
                <span>输出</span>
                {node.code.output}
              </p>
            )}
            {node.code.effect && (
              <p>
                <span>硬件影响</span>
                {node.code.effect}
              </p>
            )}
          </div>
        </section>
      )}

      {node.tags && node.tags.length > 0 && (
        <div className="node-tags">
          <Braces size={13} />
          {node.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      <section className="inspector-section">
        <div className="inspector-section__heading">
          <h3>
            <ArrowRight size={15} />
            上下游关系
          </h3>
          <span>{relatedEdges.length} 条</span>
        </div>
        <div className="relation-list">
          {relatedEdges.length > 0 ? (
            relatedEdges.slice(0, 6).map((edge) => {
              const direction = relationDirection(edge);
              return (
                <article className="relation-item" key={edge.id}>
                  <div className="relation-item__line">
                    <span>{RELATION_LABELS[edge.relation]}</span>
                    <small>
                      {direction.label} {direction.other?.label ?? "未知节点"}
                    </small>
                    <direction.Icon size={14} />
                  </div>
                  <p>{edge.explanation}</p>
                </article>
              );
            })
          ) : (
            <p className="empty-copy">当前层没有直接关系，深入下层查看更多。</p>
          )}
        </div>
      </section>

      <section className="inspector-section inspector-section--compact">
        <h3>
          <Wrench size={15} />
          可操作性
        </h3>
        <p>{buildabilityLabels[node.buildability]}</p>
      </section>

      <section className="inspector-source">
        <Layers3 size={14} />
        <div>
          <span>静态资料来源</span>
          {node.sourceUrl ? (
            <a href={node.sourceUrl} target="_blank" rel="noreferrer">
              {node.source}
            </a>
          ) : (
            <p>{node.source}</p>
          )}
        </div>
        {node.sourceUrl && <ExternalLink size={13} />}
      </section>

      {node.canExpand && (
        <button
          className="button button--primary button--wide inspector-cta"
          type="button"
          onClick={onExplore}
          style={
            {
              "--button-accent": worldCase.accent,
            } as React.CSSProperties
          }
        >
          深入这一层
          <ArrowRight size={17} />
        </button>
      )}
    </aside>
  );
}
