type Point = { x: number; y: number };
type Viewport = { left: number; top: number; width: number; height: number };

/** Offset the cover from the pointer, flipping or shrinking to fit the viewport. */
export function placeServicePreview(pointer: Point, viewport: Viewport) {
  const ratio = 4 / 3;
  const gap = 16;
  const left = viewport.left;
  const top = viewport.top;
  const right = left + Math.max(0, viewport.width);
  const bottom = top + Math.max(0, viewport.height);
  const pointerX = Math.min(Math.max(pointer.x, left), right);
  const pointerY = Math.min(Math.max(pointer.y, top), bottom);
  const roomRight = Math.max(0, right - pointerX - gap);
  const roomLeft = Math.max(0, pointerX - left - gap);
  const roomBelow = Math.max(0, bottom - pointerY - gap);
  const roomAbove = Math.max(0, pointerY - top - gap);
  const width = Math.max(0, Math.min(
    Math.max(196, viewport.width * .252),
    392,
    Math.max(roomLeft, roomRight),
    Math.max(roomAbove, roomBelow) * ratio,
  ));
  const height = width / ratio;
  if (!width) return { x: pointerX, y: pointerY, width, height };

  return {
    x: roomRight >= width ? pointerX + gap : pointerX - gap - width,
    y: roomBelow * ratio >= width ? pointerY + gap : pointerY - gap - height,
    width,
    height,
  };
}
