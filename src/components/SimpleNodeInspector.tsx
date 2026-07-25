import { ArrowRight, Boxes, X } from "lucide-react";
import type { GraphNode, WorldCase } from "../domain/types";
import { getOrangePiNodeVisuals } from "../domain/orangePiVisuals";
import { TutorialVisualGallery } from "./TutorialVisualGallery";
import { useLanguage } from "../i18n/LanguageProvider";

type SimpleNodeInspectorProps = {
  node: GraphNode;
  worldCase: WorldCase;
  onClose: () => void;
  onExplore: () => void;
  closeable: boolean;
};

export function SimpleNodeInspector({
  node,
  worldCase,
  onClose,
  onExplore,
  closeable,
}: SimpleNodeInspectorProps) {
  const { locale, text } = useLanguage();
  const children = worldCase.nodes
    .filter((candidate) => candidate.parentId === node.id)
    .slice(0, 5);

  return (
    <aside className="simple-inspector simple-inspector--node">
      <div className="simple-inspector__top">
        <span className="simple-inspector__eyebrow">
          {node.level <= 1
            ? text("主要部分", "Main part", "Үндсэн хэсэг")
            : text("继续拆开", "Go deeper", "Цааш задлах")}
        </span>
        {closeable && (
          <button
            className="simple-inspector__close"
            type="button"
            onClick={onClose}
            aria-label={text(
              "关闭详情",
              "Close details",
              "Дэлгэрэнгүйг хаах",
            )}
          >
            <X size={19} aria-hidden="true" />
          </button>
        )}
      </div>

      <header className="simple-inspector__header">
        <h2>{node.label}</h2>
        <p>{node.summary}</p>
      </header>

      {worldCase.id === "orange-pi-first-boot" && (
        <TutorialVisualGallery
          visuals={getOrangePiNodeVisuals(node.id, locale)}
          compact
        />
      )}

      <section className="simple-inspector__section">
        <h3>{text("它负责什么", "What it does", "Ямар үүрэгтэй вэ")}</h3>
        <p>{node.function}</p>
      </section>

      {node.canExpand && (
        <button
          className="simple-inspector__explore"
          type="button"
          onClick={onExplore}
        >
          {text(
            "继续拆开这部分",
            "Explore this part further",
            "Энэ хэсгийг цааш задлах",
          )}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      )}

      {children.length > 0 && (
        <section className="simple-inspector__section">
          <h3>
            <Boxes size={17} aria-hidden="true" />
            {text("里面有什么", "What is inside", "Дотор нь юу байна")}
          </h3>
          <div className="simple-inspector__items">
            {children.map((child) => (
              <article className="simple-inspector__item" key={child.id}>
                <strong>{child.label}</strong>
                <p>{child.summary}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
