// Owner clay art for tracing glyphs + the cloud section icons, keyed by id /
// section key. Metro resolves only literal require() paths, so every asset is
// listed explicitly here and looked up by the pickers / tracing header.

type ArtMap = Record<string, number>;

export const TRACING_ART: ArtMap = {
  "trace-letter-a": require("../../../../assets/images/trace-letter-a.png"),
  "trace-letter-b": require("../../../../assets/images/trace-letter-b.png"),
  "trace-letter-c": require("../../../../assets/images/trace-letter-c.png"),
  "trace-letter-d": require("../../../../assets/images/trace-letter-d.png"),
  "trace-letter-e": require("../../../../assets/images/trace-letter-e.png"),
  "trace-letter-f": require("../../../../assets/images/trace-letter-f.png"),
  "trace-letter-g": require("../../../../assets/images/trace-letter-g.png"),
  "trace-letter-h": require("../../../../assets/images/trace-letter-h.png"),
  "trace-letter-i": require("../../../../assets/images/trace-letter-i.png"),
  "trace-letter-j": require("../../../../assets/images/trace-letter-j.png"),
  "trace-letter-k": require("../../../../assets/images/trace-letter-k.png"),
  "trace-letter-l": require("../../../../assets/images/trace-letter-l.png"),
  "trace-letter-m": require("../../../../assets/images/trace-letter-m.png"),
  "trace-letter-n": require("../../../../assets/images/trace-letter-n.png"),
  "trace-letter-o": require("../../../../assets/images/trace-letter-o.png"),
  "trace-letter-p": require("../../../../assets/images/trace-letter-p.png"),
  "trace-letter-q": require("../../../../assets/images/trace-letter-q.png"),
  "trace-letter-r": require("../../../../assets/images/trace-letter-r.png"),
  "trace-letter-s": require("../../../../assets/images/trace-letter-s.png"),
  "trace-letter-t": require("../../../../assets/images/trace-letter-t.png"),
  "trace-letter-u": require("../../../../assets/images/trace-letter-u.png"),
  "trace-letter-v": require("../../../../assets/images/trace-letter-v.png"),
  "trace-letter-w": require("../../../../assets/images/trace-letter-w.png"),
  "trace-letter-x": require("../../../../assets/images/trace-letter-x.png"),
  "trace-letter-y": require("../../../../assets/images/trace-letter-y.png"),
  "trace-letter-z": require("../../../../assets/images/trace-letter-z.png"),
  "trace-number-0": require("../../../../assets/images/trace-number-0.png"),
  "trace-number-1": require("../../../../assets/images/trace-number-1.png"),
  "trace-number-2": require("../../../../assets/images/trace-number-2.png"),
  "trace-number-3": require("../../../../assets/images/trace-number-3.png"),
  "trace-number-4": require("../../../../assets/images/trace-number-4.png"),
  "trace-number-5": require("../../../../assets/images/trace-number-5.png"),
  "trace-number-6": require("../../../../assets/images/trace-number-6.png"),
  "trace-number-7": require("../../../../assets/images/trace-number-7.png"),
  "trace-number-8": require("../../../../assets/images/trace-number-8.png"),
  "trace-number-9": require("../../../../assets/images/trace-number-9.png"),
  "trace-number-10": require("../../../../assets/images/trace-number-10.png"),
  "trace-circle": require("../../../../assets/images/trace-circle.png"),
  "trace-oval": require("../../../../assets/images/trace-oval.png"),
  "trace-square": require("../../../../assets/images/trace-square.png"),
  "trace-rectangle": require("../../../../assets/images/trace-rectangle.png"),
  "trace-triangle": require("../../../../assets/images/trace-triangle.png"),
  "trace-pentagon": require("../../../../assets/images/trace-pentagon.png"),
  "trace-hexagon": require("../../../../assets/images/trace-hexagon.png"),
  "trace-curve": require("../../../../assets/images/trace-curve.png"),
  "trace-line-down": require("../../../../assets/images/trace-line-down.png"),
  "trace-line-across": require("../../../../assets/images/trace-line-across.png"),
  "trace-zigzag": require("../../../../assets/images/trace-zigzag.png"),
};

export const SECTION_ICONS: ArtMap = {
  "sec-letters": require("../../../../assets/images/sec-letters.png"),
  "sec-numbers": require("../../../../assets/images/sec-numbers.png"),
  "sec-shapes": require("../../../../assets/images/sec-shapes.png"),
  "sec-name": require("../../../../assets/images/sec-name.png"),
  "sec-draw-blank": require("../../../../assets/images/sec-draw-blank.png"),
  "sec-draw-guided": require("../../../../assets/images/sec-draw-guided.png"),
  "sec-draw-dotdot": require("../../../../assets/images/sec-draw-dotdot.png"),
  "sec-colour-bynum": require("../../../../assets/images/sec-colour-bynum.png"),
  "sec-colour-yourway": require("../../../../assets/images/sec-colour-yourway.png"),
};

// The "make a shape" dot-to-dot games reuse the clay shapes (+ the clay star)
// as their picker icons instead of the generic number emoji.
export const SHAPE_GAME_ART: ArtMap = {
  'draw-dotdot-star': require('../../../../assets/images/shape-star.png'),
  'draw-dotdot-triangle': require('../../../../assets/images/trace-triangle.png'),
  'draw-dotdot-square': require('../../../../assets/images/trace-square.png'),
};

export function tracingArtFor(id: string): number | undefined {
  return TRACING_ART[id];
}

export function gameArtFor(id: string): number | undefined {
  return SHAPE_GAME_ART[id];
}

export function sectionIcon(key: string): number | undefined {
  return SECTION_ICONS[key];
}
