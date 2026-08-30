export type RGB = readonly [number, number, number];
export type HeaderTone = 'dark' | 'light';

const INK: RGB = [9, 9, 9];
const WHITE: RGB = [255, 255, 255];

export function luminance(color: RGB): number {
  const linear = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function contrastRatio(first: RGB, second: RGB): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function composite(front: RGB, alpha: number, back: RGB): RGB {
  const channel = (index: number) => front[index] * alpha + back[index] * (1 - alpha);
  return [channel(0), channel(1), channel(2)];
}

export function chooseHeaderContrast(samples: RGB[], previous?: HeaderTone, uncertain = false) {
  const colors = samples.length ? samples : [WHITE];
  const scores = {
    dark: Math.min(...colors.map((color) => contrastRatio(INK, color))),
    light: Math.min(...colors.map((color) => contrastRatio(WHITE, color))),
  };
  // Keep a readable tone stable, or retain it when the surface cannot be sampled.
  // Otherwise choose the stronger contrast, even if neither tone reaches 4.5:1.
  const tone: HeaderTone = previous && (uncertain || !samples.length || scores[previous] >= 4.5)
    ? previous
    : scores.light > scores.dark ? 'light' : 'dark';
  return { tone };
}

/** Choose a tone from the background directly beneath one rendered letter. */
export function chooseGlyphContrast(
  bounds: { left: number; top: number; width: number; height: number },
  viewport: { width: number; height: number },
  sample: (x: number, y: number) => { color: RGB; uncertain: boolean },
  previous?: HeaderTone,
) {
  const colors: RGB[] = [];
  let uncertain = false;
  if (bounds.width > 0 && bounds.height > 0) {
    for (const horizontal of [0.15, 0.5, 0.85]) {
      for (const vertical of [0.15, 0.5, 0.85]) {
        const x = bounds.left + bounds.width * horizontal;
        const y = bounds.top + bounds.height * vertical;
        if (x < 0 || x >= viewport.width || y < 0 || y >= viewport.height) continue;
        const result = sample(x, y);
        colors.push(result.color);
        uncertain ||= result.uncertain;
      }
    }
  }
  return chooseHeaderContrast(colors, previous, uncertain);
}

function positionOffset(value: string, space: number): number | null {
  if (value === 'center') return space / 2;
  if (value === 'left' || value === 'top') return 0;
  if (value === 'right' || value === 'bottom') return space;
  if (/^-?[\d.]+%$/.test(value)) return space * parseFloat(value) / 100;
  if (/^-?[\d.]+px$/.test(value)) return parseFloat(value);
  return null;
}

/** Map a viewport-relative image point through CSS object-fit and object-position. */
export function imagePoint(
  point: { x: number; y: number },
  box: { width: number; height: number },
  source: { width: number; height: number },
  fit: string,
  position: string,
): { x: number; y: number } | null {
  if (!box.width || !box.height || !source.width || !source.height) return null;
  const contain = Math.min(box.width / source.width, box.height / source.height);
  const scale = fit === 'cover' ? Math.max(box.width / source.width, box.height / source.height)
    : fit === 'contain' ? contain : fit === 'scale-down' ? Math.min(1, contain) : 1;
  const width = fit === 'fill' ? box.width : source.width * scale;
  const height = fit === 'fill' ? box.height : source.height * scale;
  const [horizontal = '50%', vertical = '50%', ...extra] = position.split(/\s+/);
  if (extra.length) return null;
  const left = positionOffset(horizontal, box.width - width);
  const top = positionOffset(vertical, box.height - height);
  if (left === null || top === null) return null;
  const x = (point.x - left) / width;
  const y = (point.y - top) / height;
  if (x < 0 || y < 0 || x > 1 || y > 1) return null;
  return { x: x * source.width, y: y * source.height };
}
