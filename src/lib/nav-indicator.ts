export type IndicatorBox = { left: number; top: number; width: number };
type LabelBox = { left: number; top: number; width: number };
type Origin = { left: number; top: number };

const frameFor = (box: IndicatorBox, origin: Origin) => ({
  transform: `translate3d(${box.left - origin.left}px, ${box.top - origin.top}px, 0)`,
  width: `${box.width}px`,
});

/** Keep the previous viewport position when the navigation is replaced or moves. */
export function indicatorPlacement(
  label: LabelBox | null,
  previous: IndicatorBox | null,
  origin: Origin,
  animate = true,
) {
  if (!label || label.width <= 0) return null;
  const box = { left: label.left, top: label.top, width: label.width };
  const changed = previous && (
    Math.abs(previous.left - box.left) > 0.5
    || Math.abs(previous.top - box.top) > 0.5
    || Math.abs(previous.width - box.width) > 0.5
  );
  return {
    box,
    to: frameFor(box, origin),
    from: animate && changed && previous ? frameFor(previous, origin) : null,
  };
}
