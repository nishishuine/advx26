import type { TutorialVisual } from "../domain/orangePiVisuals";

type TutorialVisualGalleryProps = {
  visuals: TutorialVisual[];
  compact?: boolean;
};

export function TutorialVisualGallery({
  visuals,
  compact = false,
}: TutorialVisualGalleryProps) {
  return (
    <section
      className={`tutorial-visuals${compact ? " tutorial-visuals--compact" : ""}`}
      aria-label="实物与连接图解"
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
