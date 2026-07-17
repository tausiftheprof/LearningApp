/**
 * Generates full-page LINE-ART colouring scenes into assets/images/*.svg.
 *
 * Unlike the filled icon set in generate-images.mjs, these are bold black
 * outlines only (fill="none") so the in-app flood-fill colouring engine can
 * treat the strokes as walls and paint each enclosed area. All artwork here
 * is original to this project - geometric primitives and hand-authored
 * paths, no third-party source images. Replacing a .svg file by hand (same
 * filename, square viewBox, black outline, transparent fill) swaps that
 * scene everywhere in the app and demo.
 *
 * Usage: node assets/generate-colouring-scenes.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'images');
mkdirSync(OUT, { recursive: true });

const INK = '#2B2320';
const W = 9; // bold, finger-friendly outline weight

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <g fill="none" stroke="${INK}" stroke-width="${W}" stroke-linecap="round" stroke-linejoin="round">
${body}
  </g>\n</svg>\n`;

/* ---------- shared line-art motifs ---------- */

function star(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`);
  }
  return `<polygon points="${pts.join(' ')}"/>`;
}

function cloud(cx, cy, s = 1) {
  return `<path d="M ${cx - 70 * s} ${cy + 20 * s}
    a ${34 * s} ${34 * s} 0 0 1 8 -66
    a ${40 * s} ${40 * s} 0 0 1 78 -10
    a ${32 * s} ${32 * s} 0 0 1 46 40
    a ${30 * s} ${30 * s} 0 0 1 -12 60
    h -150 a ${28 * s} ${28 * s} 0 0 1 0 -56 Z"/>`;
}

function rainbowArcs(cx, cy, r0, bands = 4, step = 22) {
  let out = '';
  for (let i = 0; i < bands; i++) {
    const r = r0 + i * step;
    out += `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"/>`;
  }
  return out;
}

function sunSpiky(cx, cy, r) {
  // Simple 8-ray sun (matches the plain sun.svg icon style): four straight
  // rays + four diagonal rays around a plain circle - clean and recognisable.
  const d = r * 0.45;
  let rays = '';
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const x1 = cx + (r + 10) * Math.cos(a), y1 = cy + (r + 10) * Math.sin(a);
    const x2 = cx + (r + 10 + d) * Math.cos(a), y2 = cy + (r + 10 + d) * Math.sin(a);
    rays += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }
  return `${rays}<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
}

/** The Little Grip mascot as pure line art: blob body, antenna, arms holding
 *  a crayon and a puzzle piece, small feet. Eyes/smile stay solid black -
 *  everything else is an outline the child can fill in. */
function mascotOutline(cx, cy, s = 1) {
  return `
  <path d="M ${cx - 55 * s} ${cy + 40 * s}
    C ${cx - 72 * s} ${cy - 8 * s} ${cx - 40 * s} ${cy - 74 * s} ${cx} ${cy - 82 * s}
    C ${cx + 40 * s} ${cy - 74 * s} ${cx + 72 * s} ${cy - 8 * s} ${cx + 55 * s} ${cy + 40 * s}
    C ${cx + 50 * s} ${cy + 78 * s} ${cx - 50 * s} ${cy + 78 * s} ${cx - 55 * s} ${cy + 40 * s} Z"/>
  <line x1="${cx - 6 * s}" y1="${cy - 82 * s}" x2="${cx - 10 * s}" y2="${cy - 112 * s}"/>
  <polygon points="${cx - 10 * s},${cy - 112 * s} ${cx + 14 * s},${cy - 106 * s} ${cx - 2 * s},${cy - 96 * s}"/>
  <path d="M ${cx - 54 * s} ${cy} Q ${cx - 92 * s} ${cy - 6 * s} ${cx - 96 * s} ${cy - 30 * s}"/>
  <path d="M ${cx + 54 * s} ${cy} Q ${cx + 92 * s} ${cy - 6 * s} ${cx + 98 * s} ${cy - 28 * s}"/>
  <rect x="${cx - 112 * s}" y="${cy - 42 * s}" width="${10 * s}" height="${34 * s}" rx="${3 * s}"
        transform="rotate(-28 ${cx - 107 * s} ${cy - 25 * s})"/>
  <path d="M ${cx + 88 * s} ${cy - 42 * s} h ${22 * s} v ${9 * s} a ${6 * s} ${6 * s} 0 0 1 0 ${12 * s} v ${9 * s} h -${22 * s} z"/>
  <ellipse cx="${cx - 20 * s}" cy="${cy + 78 * s}" rx="${14 * s}" ry="${7 * s}"/>
  <ellipse cx="${cx + 20 * s}" cy="${cy + 78 * s}" rx="${14 * s}" ry="${7 * s}"/>
  <circle cx="${cx - 18 * s}" cy="${cy - 14 * s}" r="${5.5 * s}" fill="${INK}"/>
  <circle cx="${cx + 18 * s}" cy="${cy - 14 * s}" r="${5.5 * s}" fill="${INK}"/>
  <path d="M ${cx - 14 * s} ${cy + 8 * s} Q ${cx} ${cy + 18 * s} ${cx + 14 * s} ${cy + 8 * s}" stroke-width="${W * 0.7}"/>`;
}

/* ---------- scenes ---------- */

const SCENES = {
  'scene-solar-system': (() => {
    const cx = 500, cy = 520;
    const rings = [155, 230, 305, 380, 460];
    let orbits = rings.map((r) => `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.94}"/>`).join('');
    const planet = (ring, angleDeg, r, extra = '') => {
      const a = (angleDeg * Math.PI) / 180;
      const rr = rings[ring] * 0.94;
      const x = cx + rings[ring] * Math.cos(a), y = cy + rr * Math.sin(a);
      return `<circle cx="${x}" cy="${y}" r="${r}"/>${extra}`;
    };
    return svg(`
    ${sunSpiky(cx, cy, 62)}
    ${orbits}
    ${planet(0, -100, 24)}
    ${planet(0, 60, 30)}
    ${planet(1, -40, 34)}<path d="M ${cx + rings[1] * Math.cos(-40 * Math.PI / 180) - 14} ${cy + rings[1] * 0.94 * Math.sin(-40 * Math.PI / 180)} h 28 M ${cx + rings[1] * Math.cos(-40 * Math.PI / 180) - 10} ${cy + rings[1] * 0.94 * Math.sin(-40 * Math.PI / 180) + 12} h 20"/>
    ${planet(2, 200, 40)}<circle cx="${cx + rings[2] * Math.cos(200 * Math.PI / 180) - 12}" cy="${cy + rings[2] * 0.94 * Math.sin(200 * Math.PI / 180) - 10}" r="6"/>
    ${planet(3, 30, 58)}<path d="M ${cx + rings[3] * Math.cos(30 * Math.PI / 180) - 40} ${cy + rings[3] * 0.94 * Math.sin(30 * Math.PI / 180) - 10} h 80 M ${cx + rings[3] * Math.cos(30 * Math.PI / 180) - 36} ${cy + rings[3] * 0.94 * Math.sin(30 * Math.PI / 180) + 14} h 72"/>
    <g transform="translate(${cx + rings[3] * Math.cos(150 * Math.PI / 180)} ${cy + rings[3] * 0.94 * Math.sin(150 * Math.PI / 180)}) rotate(-18)">
      <circle cx="0" cy="0" r="46"/><ellipse cx="0" cy="0" rx="82" ry="20"/>
    </g>
    ${planet(4, -70, 30)}<ellipse cx="${cx + rings[4] * Math.cos(-70 * Math.PI / 180)}" cy="${cy + rings[4] * 0.94 * Math.sin(-70 * Math.PI / 180)}" rx="46" ry="14"/>
    ${planet(4, 160, 26)}
    ${star(120, 90, 26)}${star(880, 130, 20)}${star(70, 700, 18)}${star(920, 640, 24)}${star(500, 60, 16)}
    <circle cx="200" cy="220" r="6" fill="${INK}"/><circle cx="800" cy="300" r="6" fill="${INK}"/>
    ${mascotOutline(830, 200, 0.75)}
  `);
  })(),

  'scene-rocket-space': (() => {
    const rocket = `
    <path d="M 420 320 L 500 120 L 580 320 Z"/>
    <rect x="420" y="320" width="160" height="380"/>
    <circle cx="500" cy="440" r="58"/>
    ${mascotOutline(500, 440, 0.44)}
    <path d="M 420 560 L 330 700 L 420 660 Z"/>
    <path d="M 580 560 L 670 700 L 580 660 Z"/>
    <path d="M 452 700 L 500 860 L 548 700 Z"/>
    <path d="M 452 700 Q 480 760 460 830 M 548 700 Q 520 760 540 830" stroke-width="${W * 0.7}"/>`;
    return svg(`
    <circle cx="150" cy="200" r="90"/>
    <circle cx="120" cy="170" r="14"/><circle cx="185" cy="230" r="10"/><circle cx="150" cy="250" r="16"/>
    <g transform="translate(830 170) rotate(-10)">
      <circle cx="0" cy="0" r="68"/><ellipse cx="0" cy="0" rx="122" ry="30"/>
    </g>
    <circle cx="860" cy="760" r="72"/>
    <path d="M 815 730 Q 860 745 905 730 M 820 770 Q 860 785 900 770 M 830 800 Q 860 810 890 800" stroke-width="${W * 0.6}"/>
    ${star(80, 620, 22)}${star(920, 480, 20)}${star(280, 130, 16)}${star(650, 900, 20)}${star(60, 900, 16)}
    <circle cx="700" cy="60" r="6" fill="${INK}"/><circle cx="950" cy="620" r="6" fill="${INK}"/><circle cx="380" cy="900" r="6" fill="${INK}"/>
    ${rocket}
  `);
  })(),

  'scene-unicorn-rainbow': (() => {
    // Built from simple, independently-placed shapes (body/head circles,
    // triangle ears+horn, line legs, wavy mane/tail) rather than one
    // freehand silhouette - much more reliably a recognisable unicorn.
    const bodyCx = 470, bodyCy = 600, bodyRx = 155, bodyRy = 92;
    const headCx = 660, headCy = 445, headR = 72;
    const legs = [
      [370, 675, 335, 810, -8],
      [430, 685, 415, 815, 6],
      [560, 680, 600, 815, 10],
      [615, 665, 665, 800, 16],
    ];
    let legLines = '';
    for (const [x1, y1, x2, y2, lean] of legs) {
      legLines += `<line x1="${x1}" y1="${y1}" x2="${x2 + lean}" y2="${y2}"/>
      <ellipse cx="${x2 + lean}" cy="${y2 + 10}" rx="22" ry="12"/>`;
    }
    return svg(`
    ${rainbowArcs(340, 830, 160, 4, 22)}
    ${cloud(130, 860, 1.05)}${cloud(660, 760, 0.8)}
    ${legLines}
    <ellipse cx="${bodyCx}" cy="${bodyCy}" rx="${bodyRx}" ry="${bodyRy}"/>
    <ellipse cx="580" cy="510" rx="95" ry="60" transform="rotate(-38 580 510)"/>
    <circle cx="${headCx}" cy="${headCy}" r="${headR}"/>
    <ellipse cx="725" cy="465" rx="34" ry="24"/>
    <polygon points="632,388 655,330 668,398"/>
    <polygon points="700,375 690,300 725,370"/>
    <path d="M 700 300 Q 712 320 702 340 M 706 315 Q 716 330 708 348" stroke-width="${W * 0.55}"/>
    <path d="M 610 400 Q 560 385 530 410 Q 575 420 600 440 Q 555 435 525 465 Q 570 460 605 475"/>
    <path d="M 330 630 Q 270 615 235 645 Q 285 650 310 675 Q 258 668 225 700 Q 272 698 305 715"/>
    <circle cx="700" cy="450" r="8" fill="${INK}"/>
    <path d="M 705 480 Q 718 490 730 480" stroke-width="${W * 0.6}"/>
    ${mascotOutline(500, 530, 0.46)}
    ${star(90, 240, 24)}${star(930, 280, 20)}${star(160, 420, 14)}${star(870, 480, 16)}${star(500, 130, 15)}
  `);
  })(),

  'scene-monkey-tree': (() => {
    // Same bear-style face construction used elsewhere (ear circles behind
    // a head circle, oval muzzle, dot eyes) scaled up for a full page.
    // The monkey sits right against the trunk so its arms/legs can clearly
    // grip it, and the curly tail sweeps away to the other side so it never
    // tangles with the limbs.
    const trunkX = 660;
    const hx = 430, hy = 430, hr = 100;
    const bx = 430, by = 630;
    return svg(`
    <path d="M ${trunkX} 980 L ${trunkX} 420 Q ${trunkX} 320 ${trunkX + 70} 270 L ${trunkX + 150} 220"
          stroke-width="${W * 3}"/>
    <circle cx="${trunkX + 100}" cy="200" r="66"/><circle cx="${trunkX + 175}" cy="235" r="50"/><circle cx="${trunkX + 130}" cy="150" r="46"/>
    ${cloud(850, 700, 0.95)}${cloud(140, 230, 0.85)}
    <circle cx="${hx - 88}" cy="${hy - 60}" r="34"/><circle cx="${hx + 88}" cy="${hy - 60}" r="34"/>
    <circle cx="${hx}" cy="${hy}" r="${hr}"/>
    <ellipse cx="${hx}" cy="${hy + 46}" rx="46" ry="32"/>
    <circle cx="${hx - 30}" cy="${hy - 10}" r="10" fill="${INK}"/>
    <circle cx="${hx + 30}" cy="${hy - 10}" r="10" fill="${INK}"/>
    <path d="M ${hx - 22} ${hy + 40} Q ${hx} ${hy + 56} ${hx + 22} ${hy + 40}" stroke-width="${W * 0.65}"/>
    <ellipse cx="${bx}" cy="${by}" rx="130" ry="98"/>
    <path d="M ${bx + 90} ${by - 60} Q ${bx + 200} ${by - 40} ${trunkX - 10} ${by - 120}"/>
    <ellipse cx="${trunkX + 8}" cy="${by - 132}" rx="26" ry="20" transform="rotate(-20 ${trunkX + 8} ${by - 132})"/>
    <path d="M ${bx - 100} ${by - 40} Q ${bx - 190} ${by - 10} ${bx - 210} ${by + 60}"/>
    <ellipse cx="${bx - 214}" cy="${by + 74}" rx="24" ry="18"/>
    <path d="M ${bx + 70} ${by + 80} Q ${bx + 170} ${by + 110} ${trunkX - 10} ${by + 150}"/>
    <ellipse cx="${trunkX + 6}" cy="${by + 158}" rx="26" ry="20" transform="rotate(20 ${trunkX + 6} ${by + 158})"/>
    <path d="M ${bx - 60} ${by + 90} Q ${bx - 100} ${by + 180} ${bx - 40} ${by + 220}"/>
    <ellipse cx="${bx - 30}" cy="${by + 230}" rx="22" ry="16"/>
    <path d="M ${bx - 120} ${by + 20}
      Q ${bx - 230} ${by + 10} ${bx - 250} ${by - 90}
      Q ${bx - 265} ${by - 170} ${bx - 195} ${by - 200}
      Q ${bx - 150} ${by - 215} ${bx - 155} ${by - 165}"/>
    ${mascotOutline(bx - 175, by - 245, 0.42)}
    ${star(70, 700, 18)}${star(930, 480, 18)}${star(120, 600, 12)}
  `);
  })(),

  'scene-rabbit-carrot': (() => {
    return svg(`
    ${rainbowArcs(760, 260, 130, 3, 22)}
    ${cloud(870, 200, 0.85)}
    <path d="M 60 900 Q 200 860 340 900 Q 480 930 620 900 Q 720 880 800 900" stroke-width="${W * 0.8}"/>
    <path d="M 140 890 l -10 -34 M 170 895 l 6 -30 M 620 895 l -8 -30 M 660 890 l 10 -32"/>
    <ellipse cx="470" cy="680" rx="180" ry="140"/>
    <path d="M 560 780 Q 640 800 660 750 Q 650 720 600 725 Q 630 745 610 770 Q 590 785 560 780 Z"/>
    <path d="M 290 730 Q 250 770 260 810"/>
    <ellipse cx="252" cy="822" rx="30" ry="18"/>
    <circle cx="330" cy="530" r="110"/>
    <path d="M 260 460 C 230 340 250 210 300 140 C 320 230 320 340 320 460 Z"/>
    <path d="M 400 460 C 420 330 450 200 500 150 C 500 250 470 350 450 460 Z"/>
    <circle cx="290" cy="510" r="12" fill="${INK}"/><circle cx="360" cy="505" r="12" fill="${INK}"/>
    <path d="M 300 545 Q 325 560 350 545" stroke-width="${W * 0.7}"/>
    <path d="M 250 560 L 195 555 M 250 575 L 195 585 M 400 555 L 455 550 M 400 570 L 455 580" stroke-width="${W * 0.6}"/>
    <path d="M 205 585 L 140 630 L 130 600 Z"/>
    <path d="M 140 605 Q 120 580 130 555 M 155 615 Q 138 595 145 570" stroke-width="${W * 0.6}"/>
    <circle cx="620" cy="770" r="42"/>
    <path d="M 700 800 Q 780 810 830 780 M 700 830 Q 770 850 820 820"/>
    <path d="M 220 800 Q 160 770 140 810 Q 190 800 230 830" />
    ${mascotOutline(560, 630, 0.46)}
    ${star(700, 500, 18)}${star(140, 300, 16)}${star(880, 620, 16)}
  `);
  })(),
};

let count = 0;
for (const [name, content] of Object.entries(SCENES)) {
  writeFileSync(join(OUT, `${name}.svg`), content);
  count++;
}
console.log(`wrote ${count} line-art colouring scenes to assets/images/`);
