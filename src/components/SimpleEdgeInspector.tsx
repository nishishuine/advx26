import { ArrowRight, X } from "lucide-react";
import type { GraphEdge, WorldCase } from "../domain/types";

type SimpleEdgeInspectorProps = {
  label: string;
  sourceId: string;
  targetId: string;
  edges: GraphEdge[];
  worldCase: WorldCase;
  onClose: () => void;
};

export function SimpleEdgeInspector({
  sourceId,
  targetId,
  edges,
  worldCase,
  onClose,
}: SimpleEdgeInspectorProps) {
  const sourceNode = worldCase.nodes.find((node) => node.id === sourceId);
  const targetNode = worldCase.nodes.find((node) => node.id === targetId);
  const primaryEdge = edges[0];
  const relationTitle = primaryEdge
    ? "它们如何接上"
    : "这两个部分如何联系";

  return (
    <aside className="simple-inspector simple-inspector--edge">
      <div className="simple-inspector__top">
        <span className="simple-inspector__eyebrow">连接说明</span>
        <button
          className="simple-inspector__close"
          type="button"
          onClick={onClose}
          aria-label="关闭关系详情"
        >
          <X size={19} aria-hidden="true" />
        </button>
      </div>

      <div className="simple-inspector__route">
        <strong>{sourceNode?.label ?? "起点"}</strong>
        <ArrowRight size={20} aria-hidden="true" />
        <strong>{targetNode?.label ?? "终点"}</strong>
      </div>

      <section className="simple-inspector__section">
        <h2>{relationTitle}</h2>
        <p>
          {primaryEdge?.explanation ??
            primaryEdge?.mechanism ??
            "这两个部分会按箭头方向一起完成下一步。"}
        </p>
      </section>
    </aside>
  );
}
