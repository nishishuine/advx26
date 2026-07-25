import type { TutorialVisual } from "../domain/orangePiVisuals";
import { useLanguage } from "../i18n/LanguageProvider";

type TutorialVisualGalleryProps = {
  visuals: TutorialVisual[];
  compact?: boolean;
};

export function TutorialVisualGallery({
  visuals,
  compact = false,
}: TutorialVisualGalleryProps) {
  const { text } = useLanguage();

  return (
    <section
      className={`tutorial-visuals${compact ? " tutorial-visuals--compact" : ""}`}
      aria-label={text(
        "实物与连接图解",
        "Hardware and connection visuals",
        "Төхөөрөмж ба холболтын зураг",
      )}
    >
      {visuals.map((visual) => (
        <figure className="tutorial-visual" key={`${visual.src}-${visual.title}`}>
          <div
            className={`tutorial-visual__frame${
              visual.contain ? " tutorial-visual__frame--contain" : ""
            }`}
          >
            <img
              className={visual.rotate ? "is-rotated" : undefined}
              src={visual.src}
              alt={visual.alt}
              style={{ objectPosition: visual.objectPosition }}
              loading="eager"
            />
            <span>{visual.badge}</span>
          </div>
          <figcaption>
            <strong>{visual.title}</strong>
            <p>{visual.caption}</p>
          </figcaption>
        </figure>
      ))}
    </section>
  );
}
