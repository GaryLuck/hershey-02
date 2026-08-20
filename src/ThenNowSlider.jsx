/**
 * Then & Now comparison: the modern photo underneath, the historic photo
 * clipped over it, and an invisible full-bleed range input driving the reveal.
 *
 * Falls back to whichever single photo exists when a landmark has only one, so
 * a site with no paired images renders the same as it did before the slider.
 */
export default function ThenNowSlider({
  site,
  value,
  onChange,
  className = "",
  style,
  hint,
  label = "Reveal historic and current photos",
}) {
  const hasBoth = Boolean(site.thenImage && site.nowImage);

  return (
    <div className={`hhh-comparison relative ${className}`} style={style}>
      {site.nowImage && (
        <img
          src={site.nowImage}
          alt={`Current image of ${site.modernLabel}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {site.thenImage && (
        <img
          src={site.thenImage}
          alt={`Historic image of ${site.historicLabel}`}
          className="hhh-comparison-then absolute inset-0 h-full w-full object-cover sepia"
          style={hasBoth ? { clipPath: `inset(0 ${100 - value}% 0 0)` } : undefined}
        />
      )}

      {hasBoth && (
        <>
          <div className="hhh-comparison-divider" style={{ left: `${value}%` }}>
            <span className="hhh-comparison-handle">{"<>"}</span>
          </div>
          {hint && <span className="hhh-comparison-hint">{hint}</span>}
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-label={label}
            className="hhh-comparison-range"
          />
        </>
      )}
    </div>
  );
}
