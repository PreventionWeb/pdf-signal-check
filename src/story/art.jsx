import React from 'react';

/*
 * Hand-authored cut-paper art for the story. Everything is SVG: torn and cut edges come from feTurbulence +
 * feDisplacementMap, paper grain from a fine fractal noise, and the drop shadows from a blurred offset alpha.
 * Letters and labels sit outside the filters so they stay crisp. Pieces are drawn in a 1600 × 900 stage whose
 * central 1200 × 900 is the safe area kept on narrow screens.
 */

export const C = {
  cream: '#f2e8d5', paper: '#fffaf0', ink: '#2b2340', inkSoft: '#5b5170',
  purple: '#962987', teal: '#00807f', tealLight: '#5cc6c0', coral: '#d9472b', red: '#c10920',
  mustard: '#f2b134', sky: '#3e9bd6', skyLight: '#a9d8f2', pink: '#f4a7b9',
  skin: ['#c98f65', '#7a4a2e', '#e3b48f'],
};
export const TILE_COLOURS = [C.purple, C.teal, C.coral, C.sky, C.red];

/** Shared filters, rendered once by the player in a zero-size SVG. */
export function StoryDefs() {
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
    <defs>
      {/* Cut edge with grain and a soft shadow: for most pieces. */}
      <filter id="sp-piece" x="-12%" y="-12%" width="130%" height="135%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="7" xChannelSelector="R" yChannelSelector="G" result="cut" />
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="fibre" />
        <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 0.17  0 0 0 0 0.13  0 0 0 0 0.25  -0.45 0 0 0 0.27" result="speck" />
        <feComposite in="speck" in2="cut" operator="in" result="grain" />
        <feGaussianBlur in="cut" stdDeviation="5" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.2  0 0 0 0.32 0" result="shade" />
        <feOffset in="shade" dx="4" dy="8" result="shadow" />
        <feMerge><feMergeNode in="shadow" /><feMergeNode in="cut" /><feMergeNode in="grain" /></feMerge>
      </filter>
      {/* Coloured face of a torn tile: cut edge and grain, no shadow (the white rim below carries it). */}
      <filter id="sp-face" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="11" result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="cut" />
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="fibre" />
        <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -0.55 0 0 0 0.34" result="speck" />
        <feComposite in="speck" in2="cut" operator="in" result="grain" />
        <feMerge><feMergeNode in="cut" /><feMergeNode in="grain" /></feMerge>
      </filter>
      {/* Torn white rim: a fibrous, more ragged edge with the shadow. */}
      <filter id="sp-rim" x="-15%" y="-15%" width="135%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="4" seed="23" result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="11" xChannelSelector="R" yChannelSelector="G" result="cut" />
        <feGaussianBlur in="cut" stdDeviation="4" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.2  0 0 0 0.35 0" result="shade" />
        <feOffset in="shade" dx="3" dy="7" result="shadow" />
        <feMerge><feMergeNode in="shadow" /><feMergeNode in="cut" /></feMerge>
      </filter>
      {/* Rubber stamp: patchy ink. */}
      <filter id="sp-stamp" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="4" result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="3" result="cut" />
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="9" result="blot" />
        <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.2 0 0 0 1.75" result="mask" />
        <feComposite in="cut" in2="mask" operator="in" />
      </filter>
      {/* Paper ground: grain speckle over the cream. */}
      <filter id="sp-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="2" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.27  0 0 0 0 0.16  -1.1 0 0 0 0.62" />
      </filter>
      <filter id="sp-mottle" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.004 0.006" numOctaves="3" seed="8" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.44  0 0 0 0 0.28  -0.9 0 0 0 0.5" />
      </filter>
      <filter id="sp-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
      <radialGradient id="sp-vignette" cx="50%" cy="45%" r="75%">
        <stop offset="60%" stopColor="#7a5a2e" stopOpacity="0" /><stop offset="100%" stopColor="#7a5a2e" stopOpacity="0.2" />
      </radialGradient>
    </defs>
  </svg>;
}

/** Cream paper ground with grain, mottling, two soft creases and a vignette. */
export function Backdrop({ tint = C.cream }) {
  return <g aria-hidden="true">
    <rect width="1600" height="900" fill={tint} />
    <rect width="1600" height="900" filter="url(#sp-mottle)" />
    <rect width="1600" height="900" filter="url(#sp-grain)" opacity="0.55" />
    {/* creases: a light ridge beside a soft shadow line */}
    <g filter="url(#sp-soft)" opacity="0.5">
      <path d="M-20 610 C420 560 900 640 1620 520" stroke="#fffaf0" strokeWidth="10" fill="none" />
      <path d="M-20 622 C420 572 900 652 1620 532" stroke="#b49a72" strokeWidth="5" fill="none" opacity="0.6" />
      <path d="M1040 -20 C1010 300 1080 600 1020 920" stroke="#fffaf0" strokeWidth="9" fill="none" />
      <path d="M1052 -20 C1022 300 1092 600 1032 920" stroke="#b49a72" strokeWidth="4" fill="none" opacity="0.5" />
    </g>
    <rect width="1600" height="900" fill="url(#sp-vignette)" />
  </g>;
}

/** Animated wrapper. Never give it a transform attribute: CSS animation owns its transform. */
export const A = ({ anim, delay = 0, dur, from, idle, origin, children, ...rest }) =>
  <g data-anim={anim} data-delay={delay} data-dur={dur} data-from={from} data-idle={idle} data-origin={origin} {...rest}>{children}</g>;
/** Static placement: translate, rotate (degrees) and scale. */
export const At = ({ x = 0, y = 0, r = 0, s = 1, children }) =>
  <g transform={`translate(${x} ${y})${r ? ` rotate(${r})` : ''}${s !== 1 ? ` scale(${s})` : ''}`}>{children}</g>;

/** A torn paper rectangle: ragged white rim under a cut coloured face. */
export function Torn({ w, h, fill, rim = C.paper, children, radius = 4 }) {
  return <g>
    <rect x="-7" y="-7" width={w + 14} height={h + 14} rx={radius} fill={rim} filter="url(#sp-rim)" />
    <rect width={w} height={h} rx={radius} fill={fill} filter="url(#sp-face)" />
    {children}
  </g>;
}

/** A big letter tile: white letter on a coloured torn tile. */
export function Tile({ ch, fill, size = 120, dark = false }) {
  return <Torn w={size * 0.86} h={size} fill={fill}>
    <text x={size * 0.43} y={size * 0.78} textAnchor="middle" className="sp-tile" fontSize={size * 0.8} fill={dark ? C.ink : '#fff'}>{ch}</text>
  </Torn>;
}

/** A torn strip of words. Width is estimated from the text so strips fit their words. */
export function Strip({ text, fill = C.paper, color = C.ink, size = 44, pad = 22, bold = true, width, cls = 'sp-strip' }) {
  const w = width || Math.round(text.length * size * (cls === 'sp-mono' ? 0.6 : bold ? 0.54 : 0.5) + pad * 2), h = Math.round(size * 1.45);
  return <Torn w={w} h={h} fill={fill}>
    <text x={pad} y={h * 0.7} className={cls} fontSize={size} fill={color} fontWeight={bold ? 700 : 400}>{text}</text>
  </Torn>;
}
export const stripWidth = (text, size = 44, pad = 22) => Math.round(text.length * size * 0.54 + pad * 2);

/** Paper question mark, cut from card. */
export const QMark = ({ fill = C.mustard, size = 1 }) => <g transform={`scale(${size})`} filter="url(#sp-piece)">
  <path d="M-30 -40 C-30 -78 30 -82 34 -44 C38 -10 6 -6 6 18 L6 26 L-12 26 L-12 12 C-12 -18 16 -20 14 -42 C12 -60 -10 -58 -10 -40 Z" fill={fill} />
  <circle cx="-3" cy="50" r="13" fill={fill} />
</g>;

/** Red "no" sign. */
export const NoSign = ({ r = 46 }) => <g filter="url(#sp-piece)">
  <circle r={r} fill="#fff" /><circle r={r} fill="none" stroke={C.red} strokeWidth={r * 0.24} />
  <path d={`M${-r * 0.68} ${r * 0.68} L${r * 0.68} ${-r * 0.68}`} stroke={C.red} strokeWidth={r * 0.24} />
</g>;

/** Tick in a green-teal disc; paired with words or position, never colour alone. */
export const Tick = ({ r = 30 }) => <g filter="url(#sp-piece)">
  <circle r={r} fill={C.teal} />
  <path d={`M${-r * 0.45} 0 L${-r * 0.1} ${r * 0.35} L${r * 0.5} ${-r * 0.35}`} stroke="#fff" strokeWidth={r * 0.22} fill="none" strokeLinecap="round" strokeLinejoin="round" />
</g>;

/** Cross in a red disc. */
export const Cross = ({ r = 30 }) => <g filter="url(#sp-piece)">
  <circle r={r} fill={C.red} />
  <path d={`M${-r * 0.38} ${-r * 0.38} L${r * 0.38} ${r * 0.38} M${r * 0.38} ${-r * 0.38} L${-r * 0.38} ${r * 0.38}`} stroke="#fff" strokeWidth={r * 0.22} strokeLinecap="round" />
</g>;

/** Warning triangle with an exclamation mark. */
export const Warning = ({ s = 1 }) => <g transform={`scale(${s})`}>
  <g filter="url(#sp-piece)"><path d="M0 -70 L72 56 L-72 56 Z" fill={C.mustard} stroke="#fff" strokeWidth="8" strokeLinejoin="round" /></g>
  <path d="M0 -22 L0 18" stroke={C.ink} strokeWidth="14" strokeLinecap="round" /><circle cy="38" r="8" fill={C.ink} />
</g>;

/** Report cover in the style of the sample covers. */
export function Cover({ year = '2025', w = 300, h = 400 }) {
  return <g>
    <g filter="url(#sp-piece)">
      <rect width={w} height={h} rx="4" fill={C.paper} />
      <rect width={w} height={h * 0.24} fill={C.teal} />
      <path d={`M0 ${h * 0.2} C${w * 0.3} ${h * 0.15} ${w * 0.6} ${h * 0.27} ${w} ${h * 0.19} V${h * 0.25} H0 Z`} fill={C.purple} />
      <rect x={w * 0.08} y={h * 0.55} width={w * 0.6} height="10" rx="5" fill="#e3d7c2" />
      <rect x={w * 0.08} y={h * 0.6} width={w * 0.72} height="10" rx="5" fill="#e3d7c2" />
      <rect x={w * 0.08} y={h * 0.65} width={w * 0.5} height="10" rx="5" fill="#e3d7c2" />
      {[0.5, 0.65, 0.8].map((v, i) => <rect key={i} x={w * (0.1 + i * 0.13)} y={h * (0.95 - 0.22 * v)} width={w * 0.1} height={h * 0.22 * v} fill={[C.sky, C.teal, C.coral][i]} />)}
    </g>
    <text x={w * 0.08} y={h * 0.1} className="sp-label" fontSize={w * 0.055} fill="#fff" letterSpacing="2">HARBOR OBSERVATORY</text>
    <text x={w * 0.08} y={h * 0.36} className="sp-tile" fontSize={w * 0.11} fill={C.ink}>Annual Report</text>
    <text x={w * 0.08} y={h * 0.47} className="sp-tile" fontSize={w * 0.11} fill={C.ink}>{year}</text>
  </g>;
}

/** Three-bar chart on a card. labels: ['2.8 m','North',...] from the snapshot. */
export function Chart({ labels, w = 440, h = 330, animate = true, highlight = true }) {
  const values = labels.filter(text => /m$/.test(text)), names = labels.filter(text => !/m$/.test(text));
  const colours = [C.sky, C.teal, C.coral];
  return <g>
    <g filter="url(#sp-piece)"><rect width={w} height={h} rx="6" fill={C.paper} /></g>
    <path d={`M40 ${h - 70} H${w - 30}`} stroke={C.inkSoft} strokeWidth="3" />
    {values.map((value, i) => {
      const bh = (parseFloat(value) - 1.6) * 110, x = 60 + i * ((w - 100) / values.length);
      return <g key={value}>
        <A anim={animate ? 'grow' : undefined} origin="bottom" delay={200 + i * 220} dur={650}>
          <g filter="url(#sp-piece)"><rect x={x} y={h - 70 - bh} width="88" height={bh} fill={colours[i]} /></g>
        </A>
        <text x={x + 44} y={h - 82 - bh} textAnchor="middle" className="sp-label" fontSize="30" fill={C.ink}>{value}</text>
        <text x={x + 44} y={h - 28} textAnchor="middle" className="sp-label" fontSize="30" fill={C.ink} fontWeight={highlight && i === 2 ? 700 : 400}>{names[i]}</text>
      </g>;
    })}
  </g>;
}

/** Speech-bubble tag carrying the finding. */
export function Bubble({ text, fill = C.purple, color = '#fff', size = 40, tail = 'down' }) {
  const w = Math.round(text.length * size * 0.5 + 56), h = Math.round(size * 1.7);
  const tailPath = tail === 'down' ? `M${w * 0.22} ${h - 2} L${w * 0.18} ${h + 30} L${w * 0.36} ${h - 2} Z` : `M-2 ${h * 0.3} L-30 ${h * 0.5} L-2 ${h * 0.7} Z`;
  return <g transform={`translate(${-w / 2} ${-h / 2})`}>
    <g filter="url(#sp-rim)"><rect x="-6" y="-6" width={w + 12} height={h + 12} rx={h / 2 + 4} fill={C.paper} /><path d={tailPath} fill={C.paper} transform="translate(0 4)" /></g>
    <g filter="url(#sp-face)"><rect width={w} height={h} rx={h / 2} fill={fill} /><path d={tailPath} fill={fill} /></g>
    <text x={w / 2} y={h * 0.66} textAnchor="middle" className="sp-strip" fontSize={size} fontWeight="700" fill={color}>{text}</text>
  </g>;
}

/** People and the assistant, each with a label strip below. */
export function Person({ kind, label, skin }) {
  const body = {
    reader: <>
      <path d="M-70 210 C-70 120 -40 92 0 92 C40 92 70 120 70 210 Z" fill={C.teal} />
      <circle cy="40" r="44" fill={skin || C.skin[0]} />
      <path d="M-46 30 C-46 -20 46 -20 46 30 C30 8 -20 2 -46 30 Z" fill={C.ink} />
      {/* open booklet held in front */}
      <path d="M-62 128 L0 142 L62 128 L62 196 L0 210 L-62 196 Z" fill={C.paper} />
      <path d="M0 142 V210" stroke="#d9cbb2" strokeWidth="4" />
      <path d="M-48 150 L-12 158 M-48 166 L-12 174 M12 158 L48 150 M12 174 L48 166" stroke="#c9b897" strokeWidth="5" strokeLinecap="round" />
    </>,
    listener: <>
      <path d="M-70 210 C-70 120 -40 92 0 92 C40 92 70 120 70 210 Z" fill={C.purple} />
      <circle cy="40" r="44" fill={skin || C.skin[1]} />
      <path d="M-44 22 C-40 -14 40 -14 44 22 C26 6 -18 0 -44 22 Z" fill="#1b1424" />
      <path d="M-50 44 C-56 -24 56 -24 50 44" stroke={C.ink} strokeWidth="9" fill="none" />
      <rect x="-62" y="28" width="24" height="40" rx="10" fill={C.coral} />
      <rect x="38" y="28" width="24" height="40" rx="10" fill={C.coral} />
    </>,
    assistant: <>
      <path d="M-86 0 C-86 -48 -50 -70 0 -70 C50 -70 86 -48 86 0 C86 48 50 70 0 70 C-16 70 -30 68 -42 64 L-80 86 L-66 50 C-80 38 -86 20 -86 0 Z" transform="translate(0 110)" fill={C.sky} />
      <path d="M0 62 L12 98 L48 110 L12 122 L0 158 L-12 122 L-48 110 L-12 98 Z" fill="#fff" />
      <path d="M52 68 L57 82 L71 87 L57 92 L52 106 L47 92 L33 87 L47 82 Z" fill={C.mustard} />
    </>,
  }[kind];
  return <g>
    <g filter="url(#sp-piece)">{body}</g>
    {kind === 'listener' && <g stroke={C.mustard} strokeWidth="7" fill="none" strokeLinecap="round">
      <path d="M78 22 Q94 48 78 74" /><path d="M96 8 Q122 48 96 88" />
    </g>}
    <At x={0} y={250}><g transform={`translate(${-stripWidth(label, 30, 16) / 2} 0)`}><Strip text={label} size={30} pad={16} /></g></At>
  </g>;
}

/** A luggage-style tag with a number, hanging from the top. */
export function StepTag({ n, fill, label }) {
  return <g>
    <g filter="url(#sp-piece)">
      <path d="M-50 22 L-28 0 L28 0 L50 22 L50 150 L-50 150 Z" fill={fill} />
      <circle cy="20" r="8" fill={C.cream} />
    </g>
    <text y="112" textAnchor="middle" className="sp-tile" fontSize="76" fill="#fff">{n}</text>
    {label && <text y="182" textAnchor="middle" className="sp-label" fontSize="26" fill={C.ink}>{label}</text>}
  </g>;
}

/** Paper laptop for the tool cameo; children are drawn on the screen (600 × 360). */
export function Laptop({ children }) {
  return <g>
    <g filter="url(#sp-piece)">
      <rect x="-24" y="-24" width="648" height="408" rx="18" fill={C.ink} />
      <path d="M-70 384 H670 L640 420 H-40 Z" fill="#4b4060" />
    </g>
    <rect width="600" height="360" rx="4" fill="#fff" />
    {children}
  </g>;
}

/** Ink stamp (patchy, rotated by the caller). */
export function Stamp({ text, sub, color, w = 250 }) {
  return <g filter="url(#sp-stamp)" opacity="0.92">
    <rect x={-w / 2} y="-56" width={w} height="112" rx="14" fill="none" stroke={color} strokeWidth="7" />
    <rect x={-w / 2 + 11} y="-45" width={w - 22} height="90" rx="9" fill="none" stroke={color} strokeWidth="3" />
    <text y={sub ? 4 : 16} textAnchor="middle" className="sp-tile" fontSize={text.length > 6 ? 34 : 44} fill={color}>{text}</text>
    {sub && <text y="34" textAnchor="middle" className="sp-label" fontSize="22" fill={color}>{sub}</text>}
  </g>;
}

/** Paper layer sheet used by the hidden-layers motif. */
export function Sheet({ w = 520, h = 140, fill, label, children }) {
  return <g>
    <g filter="url(#sp-piece)"><rect width={w} height={h} rx="6" fill={fill} /></g>
    {children}
    {label && <At x={w + 24} y={h / 2 - 30}><Strip text={label} size={32} pad={16} /></At>}
  </g>;
}
