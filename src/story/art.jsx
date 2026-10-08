import React, { useLayoutEffect, useRef, useState } from 'react';

/*
 * Cut-paper art for the story. Tiles, strips, sheets, stamps, charts and tags are hand-authored SVG: torn and
 * cut edges come from feTurbulence + feDisplacementMap, paper grain from a fine fractal noise, and the drop shadows
 * from a blurred offset alpha. The figures and a few icons are AI-generated cut-paper images (public/story/images,
 * see its README) placed with a crisp shadow. Letters and labels sit outside the filters so they stay crisp.
 * Pieces are drawn in a 1600 × 900 stage whose central 1200 × 900 is the safe area kept on narrow screens.
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
      {/* Scissor cut: a crisp, barely irregular edge and a tight shadow, for small SVG icons. */}
      <filter id="sp-scissor" x="-12%" y="-12%" width="130%" height="135%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="17" result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.5" xChannelSelector="R" yChannelSelector="G" result="cut" />
        <feGaussianBlur in="cut" stdDeviation="2" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.2  0 0 0 0.38 0" result="shade" />
        <feOffset in="shade" dx="3" dy="5" result="shadow" />
        <feMerge><feMergeNode in="shadow" /><feMergeNode in="cut" /></feMerge>
      </filter>
      {/* Lift: just the tight shadow, for the cut-paper images whose edges are already real. */}
      <filter id="sp-lift" x="-10%" y="-10%" width="125%" height="125%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.2  0 0 0 0.34 0" result="shade" />
        <feOffset in="shade" dx="3" dy="6" result="shadow" />
        <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
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
      <filter id="sp-crease" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5" /></filter>
      <radialGradient id="sp-vignette" cx="50%" cy="45%" r="75%">
        <stop offset="55%" stopColor="#7a5a2e" stopOpacity="0" /><stop offset="100%" stopColor="#7a5a2e" stopOpacity="0.32" />
      </radialGradient>
    </defs>
  </svg>;
}

/** Each scene folds the same sheet differently, so the creases never read as a tiled texture. */
const FOLDS = ['', 'scale(-1 1) translate(-1600 0)', 'scale(1 -1) translate(0 -900)', 'rotate(180 800 450)'];
/** Cream paper ground with grain, mottling, a diagonal fold, two soft creases and a vignette. */
export function Backdrop({ tint = C.cream, variant = 0 }) {
  return <g aria-hidden="true">
    <rect width="1600" height="900" fill={tint} />
    <rect width="1600" height="900" filter="url(#sp-mottle)" />
    <rect width="1600" height="900" filter="url(#sp-grain)" opacity="0.55" />
    <g transform={FOLDS[variant % FOLDS.length]}>
    {/* a diagonal fold: one side a touch darker, a light ridge beside a shadow line */}
    <path d="M330 -20 L1560 920 L1620 920 L1620 -20 Z" fill="#7a5a2e" opacity="0.03" />
    <g filter="url(#sp-crease)" opacity="0.65">
      <path d="M318 -20 L1548 920" stroke="#fffaf0" strokeWidth="10" strokeOpacity="0.55" fill="none" />
      <path d="M332 -20 L1562 920" stroke="#a88c62" strokeWidth="6" strokeOpacity="0.45" fill="none" />
    </g>
    {/* creases: a light ridge beside a soft shadow line */}
    <g filter="url(#sp-crease)" opacity="0.65">
      <path d="M-20 610 C420 560 900 640 1620 520" stroke="#fffaf0" strokeWidth="10" strokeOpacity="0.55" fill="none" />
      <path d="M-20 622 C420 572 900 652 1620 532" stroke="#b49a72" strokeWidth="5" fill="none" opacity="0.6" />
      <path d="M1040 -20 C1010 300 1080 600 1020 920" stroke="#fffaf0" strokeWidth="9" strokeOpacity="0.55" fill="none" />
      <path d="M1052 -20 C1022 300 1092 600 1032 920" stroke="#b49a72" strokeWidth="4" fill="none" opacity="0.5" />
    </g>
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

/**
 * A torn strip of words. The width starts from an estimate, then is measured from the rendered text (again once
 * web fonts load) so the words always sit inside the strip with even padding. `center` centres it on 0,0.
 */
export function Strip({ text, fill = C.paper, color = C.ink, size = 44, pad = 22, bold = true, width, cls = 'sp-strip', center = false }) {
  const estimate = Math.round(text.length * size * (cls === 'sp-mono' ? 0.6 : bold ? 0.54 : 0.5) + pad * 2);
  const label = useRef(null);
  const [measured, setMeasured] = useState(null);
  useLayoutEffect(() => {
    if (width) return;
    let active = true;
    const measure = () => { const length = label.current?.getComputedTextLength?.(); if (active && length > 0) setMeasured(Math.ceil(length + pad * 2)); };
    measure();
    document.fonts?.ready.then(measure);
    return () => { active = false; };
  }, [text, size, pad, cls, bold, width]);
  const w = width || measured || estimate, h = Math.round(size * 1.45);
  const strip = <Torn w={w} h={h} fill={fill}>
    <text ref={label} x={pad} y={h * 0.69} className={cls} fontSize={size} fill={color} fontWeight={bold ? 700 : 400}>{text}</text>
  </Torn>;
  return center ? <g transform={`translate(${-w / 2} 0)`}>{strip}</g> : strip;
}

/** Pixel sizes of the cut-paper images in public/story/images, for their aspect ratios. */
const IMAGES = {
  reader: [363, 481], listener: [376, 492], assistant: [373, 344], tick: [296, 296], nosign: [325, 325], warning: [356, 323],
  'q-purple': [222, 360], 'q-teal': [221, 360], 'q-coral': [220, 360], 'q-mustard': [222, 360],
  folder: [900, 728], passport: [1000, 734], laptop: [688, 563], search: [520, 492],
};
export const imageHeight = (name, w) => Math.round(w * IMAGES[name][1] / IMAGES[name][0]);
/** A cut-paper image, w wide, placed at its top-left (or centred on 0,0) with a crisp lift shadow. */
export function Img({ name, w, x = 0, y = 0, center = false }) {
  const h = imageHeight(name, w);
  return <image href={`story/images/${name}.webp`} x={center ? -w / 2 : x} y={center ? -h / 2 : y} width={w} height={h} filter="url(#sp-lift)" />;
}

const QMARK = { [C.purple]: 'q-purple', [C.teal]: 'q-teal', [C.coral]: 'q-coral', [C.mustard]: 'q-mustard', [C.sky]: 'q-teal' };
/** Paper question mark. */
export const QMark = ({ fill = C.mustard }) => <Img name={QMARK[fill] || 'q-mustard'} w={82} center />;
/** Red "no" sign. */
export const NoSign = ({ r = 46 }) => <Img name="nosign" w={r * 2.1} center />;
/** Warning triangle with an exclamation mark. */
export const Warning = ({ s = 1 }) => <Img name="warning" w={160 * s} center />;

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
export function Bubble({ text, fill = C.purple, color = '#fff', size = 40, tail = 'down', tailAt, tailDepth = 30, ring }) {
  const w = Math.round(text.length * size * 0.56 + 56), h = Math.round(size * 1.7);
  const tailPath = tail === 'down'
    ? tailAt == null
      ? `M${w * 0.22} ${h - 2} L${w * 0.18} ${h + 30} L${w * 0.36} ${h - 2} Z`
      : `M${w * (tailAt - 0.08)} ${h - 2} L${w * tailAt} ${h + tailDepth} L${w * (tailAt + 0.08)} ${h - 2} Z`
    : `M-2 ${h * 0.3} L-30 ${h * 0.5} L-2 ${h * 0.7} Z`;
  return <g transform={`translate(${-w / 2} ${-h / 2})`}>
    <g filter="url(#sp-rim)"><rect x="-6" y="-6" width={w + 12} height={h + 12} rx={h / 2 + 4} fill={C.paper} /><path d={tailPath} fill={C.paper} transform="translate(0 4)" /></g>
    <g filter="url(#sp-face)"><rect width={w} height={h} rx={h / 2} fill={fill} /><path d={tailPath} fill={fill} /></g>
    <text x={w / 2} y={h * 0.66} textAnchor="middle" className="sp-strip" fontSize={size} fontWeight="700" fill={color}>{text}</text>
    {ring && <g transform={`rotate(${ring.r ?? -3} ${w / 2} ${h / 2})`}>
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2 + (ring.padX ?? 22)} ry={h / 2 + (ring.padY ?? 18)}
        fill="none" stroke={ring.colour ?? C.red} strokeWidth="7" pathLength="1" strokeDasharray="1"
        data-anim="draw" data-delay={ring.delay} data-dur={ring.dur ?? 600} />
    </g>}
  </g>;
}

/** People and the assistant (cut-paper images), each with a label strip below. */
export function Person({ kind, label }) {
  const w = { reader: 200, listener: 196, assistant: 210, search: 230 }[kind];
  return <g>
    <Img name={kind} w={w} x={-w / 2} y={{ assistant: 36, search: 12 }[kind] ?? -28} />
    {kind === 'listener' && <g filter="url(#sp-scissor)" stroke={C.mustard} strokeWidth="9" fill="none" strokeLinecap="round">
      <path d="M112 40 Q128 66 112 92" /><path d="M132 24 Q158 66 132 108" />
    </g>}
    <At x={0} y={250}><Strip text={label} size={28} pad={13} center /></At>
  </g>;
}
/** A luggage-style tag with a number, hanging from the top. */
export function StepTag({ n, fill, label }) {
  return <g>
    <g filter="url(#sp-scissor)">
      <path d="M-50 22 L-28 0 L28 0 L50 22 L50 150 L-50 150 Z" fill={fill} />
      <circle cy="20" r="8" fill={C.cream} />
    </g>
    <text y="112" textAnchor="middle" className="sp-tile" fontSize="76" fill="#fff">{n}</text>
    {label && <text y="182" textAnchor="middle" className="sp-label" fontSize="26" fill={C.ink}>{label}</text>}
  </g>;
}


/** Ink stamp (patchy, rotated by the caller). */
export function Stamp({ text, sub, color, w = 250 }) {
  return <g filter="url(#sp-stamp)" opacity="0.92">
    <rect x={-w / 2} y="-56" width={w} height="112" rx="14" fill="none" stroke={color} strokeWidth="7" />
    <rect x={-w / 2 + 11} y="-45" width={w - 22} height="90" rx="9" fill="none" stroke={color} strokeWidth="3" />
    <text y={sub ? 4 : 16} textAnchor="middle" className="sp-tile" fontSize={text.length > 10 ? 23 : text.length > 6 ? 34 : 44} fill={color}>{text}</text>
    {sub && <text y="34" textAnchor="middle" className="sp-label" fontSize="22" fill={color}>{sub}</text>}
  </g>;
}

/** Paper layer sheet used by the hidden-layers motif. */
export function Sheet({ w = 520, h = 140, fill, label, labelSize = 32, children }) {
  return <g>
    <g filter="url(#sp-piece)"><rect width={w} height={h} rx="6" fill={fill} /></g>
    {children}
    {label && <At x={w + 24} y={h / 2 - 30}><Strip text={label} size={labelSize} pad={16} /></At>}
  </g>;
}

/** A small paper person for crowds: the people a finding reaches. */
export function Mini({ body = C.teal, skin = C.skin[0], hair = C.ink }) {
  return <g filter="url(#sp-scissor)">
    <path d="M-20 44 C-20 22 -11 15 0 15 C11 15 20 22 20 44 Z" fill={body} />
    <circle cy="0" r="12" fill={skin} />
    <path d="M-12 -2 C-12 -16 12 -16 12 -2 C6 -8 -6 -9 -12 -2 Z" fill={hair} />
  </g>;
}

/** A small paper page with text lines, for pages feeding a chatbot. */
export const PageSlip = () => <g filter="url(#sp-scissor)">
  <rect width="54" height="70" rx="3" fill="#fff" />
  {[0, 1, 2, 3].map(k => <rect key={k} x="9" y={12 + k * 13} width={[36, 30, 34, 22][k]} height="5" rx="2.5" fill="#c9bfae" />)}
</g>;
