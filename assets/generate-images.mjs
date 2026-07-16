/**
 * Generates the original Little Grip image library into assets/images/*.svg.
 *
 * All artwork is authored here from geometric primitives - it is original to
 * this project and carries no third-party copyright. Rerunning the script
 * overwrites the .svg files; replacing any .svg file by hand (same filename,
 * any square viewBox) swaps that image everywhere in the app and demo.
 *
 * Usage: node assets/generate-images.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'images');
mkdirSync(OUT, { recursive: true });

const INK = '#4A3B32';

/** Shared kawaii face: big glossy eyes, blush, open smile. */
function face(cx, cy, s = 1, opts = {}) {
  const eyeDx = (opts.eyeDx ?? 17) * s;
  const eyeRy = 8.5 * s;
  const smileW = (opts.smileW ?? 13) * s;
  const smileY = cy + 12 * s;
  const blushDx = (opts.blushDx ?? 30) * s;
  return `
  <g>
    <ellipse cx="${cx - eyeDx}" cy="${cy}" rx="${6.5 * s}" ry="${eyeRy}" fill="#2B2320"/>
    <ellipse cx="${cx + eyeDx}" cy="${cy}" rx="${6.5 * s}" ry="${eyeRy}" fill="#2B2320"/>
    <circle cx="${cx - eyeDx + 2.4 * s}" cy="${cy - 3 * s}" r="${2.4 * s}" fill="#fff"/>
    <circle cx="${cx + eyeDx + 2.4 * s}" cy="${cy - 3 * s}" r="${2.4 * s}" fill="#fff"/>
    <circle cx="${cx - blushDx}" cy="${cy + 9 * s}" r="${5.5 * s}" fill="#F9A8B8" opacity="0.75"/>
    <circle cx="${cx + blushDx}" cy="${cy + 9 * s}" r="${5.5 * s}" fill="#F9A8B8" opacity="0.75"/>
    <path d="M ${cx - smileW} ${smileY} Q ${cx} ${smileY + 11 * s} ${cx + smileW} ${smileY}"
          fill="none" stroke="${INK}" stroke-width="${3.4 * s}" stroke-linecap="round"/>
  </g>`;
}

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${body}\n</svg>\n`;

const IMAGES = {
  dolphin: svg(`
  <ellipse cx="100" cy="172" rx="62" ry="9" fill="#BEE7F4"/>
  <path d="M30 118 Q40 62 100 56 Q160 50 172 108 Q176 128 158 140 Q120 164 70 152 Q34 142 30 118 Z" fill="#69C2E8"/>
  <path d="M60 148 Q100 162 150 142 Q136 158 104 160 Q76 160 60 148 Z" fill="#DDF3FB"/>
  <path d="M92 58 Q96 30 116 26 Q110 44 112 58 Z" fill="#4FB0DC"/>
  <path d="M168 116 Q192 108 194 92 Q178 96 170 104 Q176 112 186 126 Q174 124 168 116 Z" fill="#4FB0DC"/>
  <path d="M52 128 Q38 140 40 152 Q52 148 60 140 Z" fill="#4FB0DC"/>
  ${face(96, 106, 1)}
  <circle cx="163" cy="60" r="5" fill="#BEE7F4"/><circle cx="176" cy="46" r="3.4" fill="#BEE7F4"/>`),

  whale: svg(`
  <ellipse cx="100" cy="174" rx="66" ry="9" fill="#BEE7F4"/>
  <path d="M26 120 Q26 68 96 66 Q166 64 172 118 Q174 142 148 152 Q104 166 56 152 Q28 142 26 120 Z" fill="#7AA8E8"/>
  <path d="M40 142 Q100 160 160 140 Q146 156 100 158 Q62 158 40 142 Z" fill="#E4EEFC"/>
  <path d="M170 122 Q192 114 196 98 Q182 102 172 110 Q178 118 190 132 Q176 130 170 122 Z" fill="#5C8FD6"/>
  <path d="M96 64 Q92 46 100 38 M96 64 Q104 48 112 44" fill="none" stroke="#9FD3EE" stroke-width="6" stroke-linecap="round"/>
  <circle cx="100" cy="30" r="6" fill="#9FD3EE"/><circle cx="116" cy="36" r="4" fill="#9FD3EE"/>
  ${face(92, 112, 1.05)}`),

  unicorn: svg(`
  <ellipse cx="100" cy="180" rx="58" ry="8" fill="#F3E6F7"/>
  <path d="M52 82 L58 44 L82 68 Z" fill="#FFF7FB" stroke="#EBD9EF" stroke-width="3" stroke-linejoin="round"/>
  <path d="M148 82 L142 44 L118 68 Z" fill="#FFF7FB" stroke="#EBD9EF" stroke-width="3" stroke-linejoin="round"/>
  <path d="M87 62 L100 6 L113 62 Z" fill="#F7C948" stroke="#E8B429" stroke-width="3" stroke-linejoin="round"/>
  <path d="M92 42 L109 36 M89 54 L112 48" stroke="#E8B429" stroke-width="3" stroke-linecap="round"/>
  <circle cx="100" cy="120" r="56" fill="#FFF7FB" stroke="#EBD9EF" stroke-width="3"/>
  <path d="M138 74 Q170 84 174 118 Q160 116 150 104 Q156 122 150 138 Q140 128 136 112 Q132 96 138 74 Z" fill="#F06292"/>
  <path d="M146 84 Q170 96 170 122 Q158 116 152 104 Z" fill="#7AA8E8"/>
  <path d="M150 116 Q160 132 152 148 Q144 138 142 126 Z" fill="#66BB8A"/>
  ${face(94, 120, 1.05)}`),

  dinosaur: svg(`
  <ellipse cx="100" cy="176" rx="62" ry="8" fill="#DFF2D8"/>
  <path d="M40 124 Q36 66 96 60 Q152 56 158 112 Q162 142 132 154 Q92 168 58 152 Q40 142 40 124 Z" fill="#8BC873"/>
  <path d="M60 152 Q100 164 132 152 Q120 162 96 162 Q74 162 60 152 Z" fill="#D6EFC5"/>
  <path d="M84 60 L94 40 L104 60 Z M108 58 L118 38 L128 60 Z M62 72 L70 52 L82 66 Z" fill="#5FA84E"/>
  <path d="M154 122 Q184 126 190 144 Q170 146 156 138 Z" fill="#8BC873"/>
  <circle cx="70" cy="140" r="6" fill="#5FA84E" opacity="0.55"/>
  <circle cx="126" cy="142" r="7" fill="#5FA84E" opacity="0.55"/>
  <circle cx="94" cy="150" r="5" fill="#5FA84E" opacity="0.55"/>
  ${face(98, 106, 1.05)}`),

  elephant: svg(`
  <ellipse cx="100" cy="176" rx="60" ry="8" fill="#E8E4EF"/>
  <circle cx="58" cy="96" r="30" fill="#F4B8C8"/>
  <circle cx="142" cy="96" r="30" fill="#F4B8C8"/>
  <circle cx="58" cy="96" r="21" fill="#E9A0B4"/>
  <circle cx="142" cy="96" r="21" fill="#E9A0B4"/>
  <circle cx="100" cy="108" r="56" fill="#B9B4CE"/>
  <path d="M100 128 Q94 158 76 166 Q92 170 102 162 Q110 154 106 128 Z" fill="#B9B4CE" stroke="#A79FC0" stroke-width="2"/>
  ${face(100, 100, 1)}`),

  monkey: svg(`
  <ellipse cx="100" cy="176" rx="56" ry="8" fill="#F0E4D4"/>
  <circle cx="46" cy="86" r="20" fill="#9C6B44"/><circle cx="154" cy="86" r="20" fill="#9C6B44"/>
  <circle cx="46" cy="86" r="12" fill="#E8C39A"/><circle cx="154" cy="86" r="12" fill="#E8C39A"/>
  <circle cx="100" cy="100" r="54" fill="#9C6B44"/>
  <path d="M56 108 Q56 66 100 62 Q144 66 144 108 Q144 138 100 140 Q56 138 56 108 Z" fill="#E8C39A"/>
  ${face(100, 102, 1)}
  <path d="M148 140 Q180 150 178 172 Q168 176 162 168" fill="none" stroke="#9C6B44" stroke-width="9" stroke-linecap="round"/>`),

  panda: svg(`
  <ellipse cx="100" cy="176" rx="58" ry="8" fill="#EDEDED"/>
  <circle cx="52" cy="62" r="22" fill="#2B2320"/><circle cx="148" cy="62" r="22" fill="#2B2320"/>
  <circle cx="100" cy="108" r="58" fill="#FFFFFF" stroke="#E3DDD9" stroke-width="2"/>
  <ellipse cx="72" cy="98" rx="17" ry="21" fill="#2B2320" transform="rotate(-12 72 98)"/>
  <ellipse cx="128" cy="98" rx="17" ry="21" fill="#2B2320" transform="rotate(12 128 98)"/>
  <ellipse cx="72" cy="96" rx="6.5" ry="8.5" fill="#fff"/><ellipse cx="128" cy="96" rx="6.5" ry="8.5" fill="#fff"/>
  <circle cx="72" cy="96" r="4" fill="#2B2320"/><circle cx="128" cy="96" r="4" fill="#2B2320"/>
  <circle cx="60" cy="118" r="5.5" fill="#F9A8B8" opacity="0.75"/><circle cx="140" cy="118" r="5.5" fill="#F9A8B8" opacity="0.75"/>
  <ellipse cx="100" cy="118" rx="7" ry="5" fill="#2B2320"/>
  <path d="M90 132 Q100 140 110 132" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`),

  duck: svg(`
  <path d="M16 162 Q40 152 64 160 Q88 168 112 160 Q136 152 160 160 Q172 164 184 160 L184 188 L16 188 Z" fill="#9FD8EE"/>
  <circle cx="100" cy="92" r="52" fill="#FFD84D"/>
  <path d="M100 36 Q94 24 102 18 Q110 24 106 36 Z" fill="#FFC93C"/>
  <path d="M78 104 Q100 96 122 104 Q118 120 100 120 Q82 120 78 104 Z" fill="#F5A623"/>
  <path d="M138 96 Q166 92 170 74 Q152 72 140 84 Z" fill="#FFC93C"/>
  <ellipse cx="83" cy="82" rx="6.5" ry="8.5" fill="#2B2320"/><ellipse cx="117" cy="82" rx="6.5" ry="8.5" fill="#2B2320"/>
  <circle cx="85.4" cy="79" r="2.4" fill="#fff"/><circle cx="119.4" cy="79" r="2.4" fill="#fff"/>
  <circle cx="66" cy="94" r="5.5" fill="#F9A8B8" opacity="0.75"/><circle cx="134" cy="94" r="5.5" fill="#F9A8B8" opacity="0.75"/>`),

  chick: svg(`
  <ellipse cx="100" cy="176" rx="54" ry="8" fill="#F6EEDA"/>
  <path d="M46 120 Q46 168 100 168 Q154 168 154 120 L142 128 L130 118 L118 130 L106 118 L94 130 L82 118 L70 130 L58 118 Z" fill="#FFF6E3" stroke="#EBDDBB" stroke-width="2"/>
  <circle cx="100" cy="86" r="42" fill="#FFD84D"/>
  <path d="M94 44 Q100 34 108 42 Q102 48 94 44 Z" fill="#FFC93C"/>
  <path d="M92 92 L100 100 L108 92 Q100 86 92 92 Z" fill="#F5A623"/>
  ${face(100, 80, 0.8, { smileW: 0 })}`),

  cat: svg(`
  <ellipse cx="100" cy="176" rx="56" ry="8" fill="#FBE3D0"/>
  <path d="M50 70 L58 34 L84 56 Z M150 70 L142 34 L116 56 Z" fill="#F5A054"/>
  <path d="M58 62 L62 44 L76 56 Z M142 62 L138 44 L124 56 Z" fill="#F9C9A8"/>
  <circle cx="100" cy="106" r="56" fill="#F5A054"/>
  <path d="M100 52 Q106 66 100 78 M80 56 Q86 68 82 80 M120 56 Q114 68 118 80" fill="none" stroke="#DE8434" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="100" cy="136" rx="30" ry="20" fill="#FDE7CF"/>
  ${face(100, 102, 1)}
  <path d="M40 116 L18 110 M40 126 L20 128 M160 116 L182 110 M160 126 L180 128" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`),

  dog: svg(`
  <ellipse cx="100" cy="176" rx="56" ry="8" fill="#EFE3D3"/>
  <path d="M48 70 Q28 96 40 128 Q60 126 66 100 Z" fill="#8B5E3C"/>
  <path d="M152 70 Q172 96 160 128 Q140 126 134 100 Z" fill="#8B5E3C"/>
  <circle cx="100" cy="106" r="54" fill="#F6EFE3"/>
  <ellipse cx="128" cy="94" rx="22" ry="26" fill="#C89568" opacity="0.85"/>
  <ellipse cx="100" cy="134" rx="26" ry="18" fill="#fff"/>
  <ellipse cx="100" cy="124" rx="8" ry="6" fill="#2B2320"/>
  ${face(100, 100, 1, { smileW: 11 })}
  <path d="M108 140 Q108 152 100 154 Q114 158 116 144 Q114 140 108 140 Z" fill="#E0525E"/>`),

  fish: svg(`
  <ellipse cx="96" cy="172" rx="60" ry="8" fill="#BEE7F4"/>
  <path d="M148 100 L188 68 Q192 100 188 132 Z" fill="#3FA9BC"/>
  <ellipse cx="96" cy="100" rx="62" ry="46" fill="#59C3D6"/>
  <path d="M96 54 Q112 76 96 100 Q80 124 96 146" fill="none" stroke="#3FA9BC" stroke-width="6" stroke-linecap="round"/>
  <path d="M84 52 Q96 34 112 40 Q104 52 92 56 Z" fill="#3FA9BC"/>
  ${face(66, 96, 0.9, { eyeDx: 13, blushDx: 24 })}
  <circle cx="160" cy="44" r="5" fill="#BEE7F4"/><circle cx="172" cy="30" r="3.5" fill="#BEE7F4"/>`),

  star: svg(`
  <path d="M100 16 L124 70 L182 76 L138 114 L152 172 L100 142 L48 172 L62 114 L18 76 L76 70 Z"
        fill="#F48FB1" stroke="#E76A97" stroke-width="4" stroke-linejoin="round"/>
  ${face(100, 96, 1)}
  <circle cx="34" cy="40" r="5" fill="#FFD84D"/><circle cx="170" cy="34" r="4" fill="#FFD84D"/><circle cx="184" cy="150" r="4" fill="#FFD84D"/>`),

  sun: svg(`
  <g stroke="#FFC93C" stroke-width="9" stroke-linecap="round">
    <path d="M100 14 L100 34 M100 166 L100 186 M14 100 L34 100 M166 100 L186 100"/>
    <path d="M39 39 L53 53 M161 161 L147 147 M161 39 L147 53 M39 161 L53 147"/>
  </g>
  <circle cx="100" cy="100" r="52" fill="#FFD84D"/>
  ${face(100, 94, 1)}
  <path d="M52 156 Q64 144 84 148 Q90 136 106 138 Q122 138 126 150 Q142 148 148 160 Q136 170 60 168 Q52 164 52 156 Z" fill="#fff" opacity="0.92"/>`),

  moon: svg(`
  <circle cx="30" cy="44" r="3.5" fill="#FFD84D"/><circle cx="170" cy="30" r="4.5" fill="#FFD84D"/>
  <circle cx="180" cy="120" r="3" fill="#FFD84D"/><circle cx="40" cy="150" r="3" fill="#FFD84D"/>
  <path d="M124 18 Q66 34 62 100 Q58 168 124 182 Q84 190 52 160 Q22 130 34 86 Q46 42 90 26 Q106 20 124 18 Z"
        fill="#FFD84D" stroke="#F1B62E" stroke-width="4" stroke-linejoin="round"/>
  ${face(78, 104, 0.95, { eyeDx: 14, blushDx: 26 })}
  <path d="M118 24 Q98 34 92 22 Q108 -2 148 10 Q160 14 158 26 Q140 20 118 24 Z" fill="#8E7CC3"/>
  <path d="M92 22 Q104 10 124 8 Q144 6 158 26 L148 34 Q128 18 104 30 Z" fill="#7B68B5"/>
  <circle cx="158" cy="30" r="9" fill="#FFF6E3" stroke="#E8DFC8" stroke-width="2"/>`),

  rocket: svg(`
  <ellipse cx="100" cy="182" rx="52" ry="7" fill="#EDE7E0"/>
  <path d="M100 12 Q134 44 134 100 L134 128 L66 128 L66 100 Q66 44 100 12 Z" fill="#F4F7FA" stroke="#D5DEE8" stroke-width="3"/>
  <path d="M100 12 Q120 30 128 60 L72 60 Q80 30 100 12 Z" fill="#E0525E"/>
  <circle cx="100" cy="88" r="17" fill="#9FD8EE" stroke="#5C8FD6" stroke-width="4"/>
  <path d="M66 96 Q40 112 40 140 Q58 136 66 124 Z M134 96 Q160 112 160 140 Q142 136 134 124 Z" fill="#5C8FD6"/>
  <path d="M86 128 Q100 168 100 168 Q100 168 114 128 Z" fill="#FFB13D"/>
  <path d="M93 128 Q100 152 107 128 Z" fill="#FFD84D"/>
  ${face(100, 86, 0.55, { eyeDx: 12, blushDx: 20 })}`),

  balloon: svg(`
  <path d="M100 16 Q160 16 164 78 Q166 118 118 140 L82 140 Q34 118 36 78 Q40 16 100 16 Z" fill="#E0525E"/>
  <path d="M74 20 Q60 60 74 136 L94 140 Q84 70 88 18 Z" fill="#FFB13D"/>
  <path d="M88 18 Q100 70 100 140 L112 140 Q116 70 112 18 Z" fill="#FFD84D"/>
  <path d="M112 18 Q124 70 112 140 L126 136 Q142 66 126 20 Z" fill="#66BB8A"/>
  <path d="M126 22 Q146 70 126 134 Q158 114 160 76 Q158 36 126 22 Z" fill="#5C8FD6"/>
  <path d="M82 140 L86 158 L114 158 L118 140 Z" fill="none" stroke="#8B5E3C" stroke-width="3"/>
  <rect x="84" y="158" width="32" height="24" rx="5" fill="#B07B4F"/>
  ${face(100, 84, 0.75)}`),

  car: svg(`
  <ellipse cx="100" cy="178" rx="66" ry="7" fill="#E4E9ED"/>
  <path d="M30 138 Q30 112 52 108 L64 82 Q70 68 88 68 L124 68 Q140 68 148 84 L156 108 Q172 112 172 132 Q172 148 156 148 L44 148 Q30 148 30 138 Z" fill="#FFD84D" stroke="#EBB93C" stroke-width="3"/>
  <path d="M74 80 L120 80 Q130 80 136 92 L140 104 L68 104 L72 88 Q73 80 74 80 Z" fill="#BDE6F5" stroke="#8FC6DE" stroke-width="3"/>
  <circle cx="66" cy="150" r="18" fill="#3B3B3B"/><circle cx="66" cy="150" r="8" fill="#CFCFCF"/>
  <circle cx="140" cy="150" r="18" fill="#3B3B3B"/><circle cx="140" cy="150" r="8" fill="#CFCFCF"/>
  ${face(102, 124, 0.6, { eyeDx: 14, blushDx: 24 })}
  <circle cx="36" cy="128" r="6" fill="#FFF6E3" stroke="#EBB93C" stroke-width="2"/>`),

  treehouse: svg(`
  <ellipse cx="100" cy="184" rx="70" ry="7" fill="#DFF2D8"/>
  <rect x="88" y="120" width="26" height="64" rx="6" fill="#8B5E3C"/>
  <circle cx="100" cy="70" r="52" fill="#66BB8A"/>
  <circle cx="58" cy="92" r="30" fill="#7BC898"/><circle cx="142" cy="92" r="30" fill="#7BC898"/>
  <rect x="66" y="78" width="68" height="46" rx="6" fill="#B07B4F" stroke="#8B5E3C" stroke-width="3"/>
  <path d="M60 80 L100 54 L140 80 Z" fill="#8B5E3C"/>
  <circle cx="100" cy="100" r="11" fill="#BDE6F5" stroke="#5C8FD6" stroke-width="3"/>
  <path d="M124 124 L124 180 M138 124 L138 180 M124 138 L138 134 M124 156 L138 152 M124 172 L138 170" stroke="#8B5E3C" stroke-width="4" stroke-linecap="round"/>
  <circle cx="52" cy="168" r="6" fill="#F48FB1"/><circle cx="64" cy="176" r="5" fill="#FFD84D"/><circle cx="148" cy="172" r="6" fill="#F48FB1"/>`),

  bear: svg(`
  <ellipse cx="100" cy="176" rx="56" ry="8" fill="#F0E4D4"/>
  <circle cx="52" cy="56" r="20" fill="#B07B4F"/><circle cx="148" cy="56" r="20" fill="#B07B4F"/>
  <circle cx="52" cy="56" r="11" fill="#E8C39A"/><circle cx="148" cy="56" r="11" fill="#E8C39A"/>
  <circle cx="100" cy="106" r="58" fill="#B07B4F"/>
  <ellipse cx="100" cy="132" rx="28" ry="20" fill="#E8C39A"/>
  <ellipse cx="100" cy="122" rx="8" ry="6" fill="#2B2320"/>
  ${face(100, 100, 1, { smileW: 11 })}`),
};

let count = 0;
for (const [name, content] of Object.entries(IMAGES)) {
  writeFileSync(join(OUT, `${name}.svg`), content);
  count++;
}
console.log(`wrote ${count} original SVGs to assets/images/`);
