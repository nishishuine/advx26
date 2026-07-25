import {
  ArrowRight,
  Beaker,
  BookOpen,
  Gauge,
  GitCommitHorizontal,
  Layers3,
  MoveRight,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { RELATION_LABELS } from "../domain/relations";
import type { GraphEdge, WorldCase } from "../domain/types";

type EdgeInspectorProps = {
  label: string;
  sourceId: string;
  targetId: string;
  edges: GraphEdge[];
  worldCase: WorldCase;
  onClose: () => void;
};

const evidenceLabels = {
  A: "A级 · 直接证据",
  B: "B级 · 间接或跨物种",
  C: "C级 · 模型或推断",
};

export function EdgeInspector({
  label,
  sourceId,
  targetId,
  edges,
  worldCase,
  onClose,
}: EdgeInspectorProps) {
  const sourceNode = worldCase.nodes.find((node) => node.id === sourceId);
  const targetNode = worldCase.nodes.find((node) => node.id === targetId);
  const primary = edges[0];

  const resolveNode = (id: string) =>
    worldCase.nodes.find((node) => node.id === id);

  return (
    <aside className="node-inspector edge-inspector">
      <div className="node-inspector__top">
        <span className="eyebrow">连接讲解</span>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="关闭关系详情"
        >
          <X size={18} />
        </button>
      </div>

      <div className="edge-inspector__route">
        <span>{sourceNode?.label ?? "未知节点"}</span>
        <div>
          <MoveRight size={18} />
          <small>{label}</small>
        </div>
        <span>{targetNode?.label ?? "未知节点"}</span>
      </div>

      <p className="node-inspector__summary">
        {primary?.mechanism ?? primary?.explanation}
      </p>

      <div className="edge-facts">
        <article>
          <Sparkles size={14} />
          <span>传递什么</span>
          <strong>{primary?.cargo ?? "结构、状态或因果影响"}</strong>
        </article>
        <article>
          <Gauge size={14} />
          <span>驱动力</span>
          <strong>{primary?.driver ?? "由上游状态或结构关系决定"}</strong>
        </article>
        <article>
          <Layers3 size={14} />
          <span>经过哪里</span>
          <strong>{primary?.interface ?? "当前两个节点之间"}</strong>
        </article>
        <article>
          <GitCommitHorizontal size={14} />
          <span>成立条件</span>
          <strong>{primary?.condition ?? "案例设定的正常工作条件"}</strong>
        </article>
      </div>

      <section className="inspector-section">
        <div className="inspector-section__heading">
          <h3>
            <ArrowRight size={15} />
            这条线为什么成立
          </h3>
          <span>{edges.length} 条底层关系</span>
        </div>
        <div className="relation-list">
          {edges.slice(0, 6).map((edge) => {
            const actualSource = resolveNode(edge.origin?.source ?? edge.source);
            const actualTarget = resolveNode(edge.origin?.target ?? edge.target);
            return (
              <article className="relation-item relation-item--evidence" key={edge.id}>
                <div className="relation-item__line">
                  <span>{RELATION_LABELS[edge.relation]}</span>
                  <small>
                    {actualSource?.label} → {actualTarget?.label}
                  </small>
                </div>
                <p>{edge.explanation}</p>
                {edge.evidenceGrade && (
                  <em className={`evidence-grade is-${edge.evidenceGrade.toLowerCase()}`}>
                    {evidenceLabels[edge.evidenceGrade]}
                  </em>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {primary?.verification && (
        <section className="inspector-section">
          <h3>
            <Beaker size={15} />
            如何验证
          </h3>
          <p>{primary.verification}</p>
        </section>
      )}

      <section className="inspector-section">
        <h3>
          <BookOpen size={15} />
          证据与边界
        </h3>
        <p>
          {primary?.evidence ??
            "当前关系来自节点所列资料；没有直接实测的数据会明确标为推断。"}
        </p>
      </section>

      <div className="edge-inspector__integrity">
        <ShieldCheck size={14} />
        <span>
          复杂机制不会被隐藏在“相关”二字里；中间发生转换时，会继续拆成过程节点。
        </span>
      </div>
    </aside>
  );
}
