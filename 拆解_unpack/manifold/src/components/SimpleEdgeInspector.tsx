import { ArrowRight, X } from "lucide-react";
import type { GraphEdge, WorldCase } from "../domain/types";
import { getOrangePiEdgeVisuals } from "../domain/orangePiVisuals";
import { TutorialVisualGallery } from "./TutorialVisualGallery";
import { useLanguage } from "../i18n/LanguageProvider";

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
  const { locale, text } = useLanguage();
  const sourceNode = worldCase.nodes.find((node) => node.id === sourceId);
  const targetNode = worldCase.nodes.find((node) => node.id === targetId);
  const primaryEdge = edges[0];
  const relationTitle = primaryEdge
    ? text("它们如何接上", "How they connect", "Хэрхэн холбогддог вэ")
    : text(
        "这两个部分如何联系",
        "How these parts are related",
        "Эдгээр хэсэг хэрхэн холбоотой вэ",
      );

  return (
    <aside className="simple-inspector simple-inspector--edge">
      <div className="simple-inspector__top">
        <span className="simple-inspector__eyebrow">
          {text("连接说明", "Connection", "Холболтын тайлбар")}
        </span>
        <button
          className="simple-inspector__close"
          type="button"
          onClick={onClose}
          aria-label={text(
            "关闭关系详情",
            "Close relationship details",
            "Холбоосын дэлгэрэнгүйг хаах",
          )}
        >
          <X size={19} aria-hidden="true" />
        </button>
      </div>

      <div className="simple-inspector__route">
        <strong>
          {sourceNode?.label ?? text("起点", "Start", "Эхлэл")}
        </strong>
        <ArrowRight size={20} aria-hidden="true" />
        <strong>
          {targetNode?.label ?? text("终点", "End", "Төгсгөл")}
        </strong>
      </div>

      {worldCase.id === "orange-pi-first-boot" && (
        <TutorialVisualGallery
          visuals={getOrangePiEdgeVisuals(sourceId, targetId, locale)}
          compact
        />
      )}

      <section className="simple-inspector__section">
        <h2>{relationTitle}</h2>
        <p>
          {primaryEdge?.explanation ??
            primaryEdge?.mechanism ??
            text(
              "这两个部分会按箭头方向一起完成下一步。",
              "These two parts work together in the direction of the arrow.",
              "Эдгээр хоёр хэсэг сумны чиглэлээр хамтран ажиллана.",
            )}
        </p>
      </section>
    </aside>
  );
}
