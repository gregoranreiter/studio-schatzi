type Point = { x: number; y: number };
type Viewport = { left: number; top: number; width: number; height: number };

/** Follow the pointer horizontally along the viewport bottom, flipping inward at the sides. */
export function placeServicePreview(pointer: Point, viewport: Viewport) {
  const ratio = 4 / 3;
  const gap = 32;
  const left = viewport.left;
  const top = viewport.top;
  const right = left + Math.max(0, viewport.width);
  const bottom = top + Math.max(0, viewport.height);
  const pointerX = Math.min(Math.max(pointer.x, left), right);
  const roomRight = Math.max(0, right - pointerX - gap);
  const roomLeft = Math.max(0, pointerX - left - gap);
  const width = Math.max(0, Math.min(
    Math.max(196, viewport.width * .252),
    392,
    Math.max(roomLeft, roomRight),
    (bottom - top) * ratio,
  ));
  const height = width / ratio;
  if (!width) return { x: pointerX, y: bottom, width, height };

  return {
    x: roomRight >= width ? pointerX + gap : pointerX - gap - width,
    y: bottom - height,
    width,
    height,
  };
}
