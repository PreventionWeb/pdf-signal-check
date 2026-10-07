import React from 'react';

/*
 * Seven scenes for "Your report says it. Does everyone understand it?". Every text value shown on stage comes
 * from snapshot.json (real engine output on the synthetic samples), except the two illustrative assistant
 * answers in scene 5. Static markup is each scene's final frame; data-anim marks how an element enters.
 */

const finding = data => (data.well.figureAlt || '').split('. ').pop().replace(/\.$/, '') || 'South is highest';
/** Where on the miniature page a pin belongs, by what the item is about. */
const pinSpot = title => /image|chart/i.test(title) ? [64, 226] : /order/i.test(title) ? [64, 146] : /Map 2|link/i.test(title) ? [64, 352]
  : /\+0\.7|apart/i.test(title) ? [210, 352] : /decorative/i.test(title) ? [326, 80] : [326, 300];
const stepNumber = text => text.match(/^(\d)/)?.[1];
const stepLabel = text => text.replace(/^\d[.)]\s*/, '');

/** A miniature report page in the sample-cover style. */
function MiniPage({ x, y, w = 150, h = 200, label, children }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect width={w} height={h} rx="3" className="s-paper" />
    <rect width={w} height={h * 0.18} className="s-band" />
    <path d={`M0 ${h * 0.16} C${w * 0.3} ${h * 0.12} ${w * 0.55} ${h * 0.21} ${w} ${h * 0.15} V${h * 0.18} H0 Z`} className="s-teal" />
    {children}
    {label && <text x={w / 2} y={h + 18} textAnchor="middle" className="s-label">{label}</text>}
  </g>;
}
const Lines = ({ x, y, widths, gap = 10 }) => widths.map((w, i) => <rect key={i} x={x} y={y + i * gap} width={w} height="4" rx="2" className="s-line" />);

/** Reader icons, always paired with a text label: Mangrove has no screen reader or AI glyph. */
function Reader({ x, y, kind, label, children }) {
  const glyph = {
    eye: <><path d="M-18 0 Q0 -14 18 0 Q0 14 -18 0 Z" className="s-ink-stroke" fill="none" strokeWidth="2.5" /><circle r="5" className="s-ink" /></>,
    speaker: <><path d="M-14 -6 h7 l9 -8 v28 l-9 -8 h-7 Z" className="s-ink" /><path d="M7 -7 q6 7 0 14 M11 -11 q11 11 0 22" fill="none" className="s-ink-stroke" strokeWidth="2.5" strokeLinecap="round" /></>,
    ai: <><rect x="-15" y="-15" width="30" height="30" rx="6" fill="none" className="s-ink-stroke" strokeWidth="2.5" /><path d="M0 -8 l2.5 5.5 5.5 2.5 -5.5 2.5 -2.5 5.5 -2.5 -5.5 -5.5 -2.5 5.5 -2.5 Z" className="s-ink" /></>,
  }[kind];
  return <g transform={`translate(${x} ${y})`}>
    <circle r="30" className="s-soft" />{glyph}
    <text y="52" textAnchor="middle" className="s-label">{label.split('\n').map((line, i) => <tspan key={line} x="0" dy={i ? 18 : 0}>{line}</tspan>)}</text>
    {children}
  </g>;
}
const Chip = ({ x, y, text, className = 's-chip', anim, delay, from, w }) => {
  const width = w || text.length * 7.4 + 24;
  return <g data-anim={anim} data-delay={delay} data-from={from} transform={`translate(${x} ${y})`}>
    <rect x={-width / 2} y="-14" width={width} height="28" rx="14" className={className} />
    <text textAnchor="middle" y="5" className="s-chip-text">{text}</text>
  </g>;
};
function Chart({ x, y, labels, picture = false }) {
  const values = labels.filter(text => /m$/.test(text)), names = labels.filter(text => !/m$/.test(text));
  return <g transform={`translate(${x} ${y})`}>
    <rect width="240" height="150" className="s-pale" />
    {values.map((value, i) => {
      const height = parseFloat(value) * 30;
      return <g key={value} transform={`translate(${30 + i * 72} 0)`}>
        <rect y={128 - height} width="44" height={height} className={picture ? 's-teal s-pixel' : 's-teal'} />
        <text x="22" y={120 - height} textAnchor="middle" className={picture ? 's-pixel-text' : 's-small'}>{value}</text>
        <text x="22" y="144" textAnchor="middle" className={picture ? 's-pixel-text' : 's-small'}>{names[i]}</text>
      </g>;
    })}
  </g>;
}

export function scenes(data) {
  const sentence = finding(data);
  const partlySteps = data.partly.tagSteps;
  const drawn = data.scrambled.drawnLines;
  const extracted = [...drawn.filter(line => /^\d\.\s/.test(line)), drawn.find(line => /^rise in/.test(line)), drawn.find(line => /Map 2/.test(line)), drawn.at(-1)].filter(Boolean);
  const [header, ...rows] = data.travel.csvRows;
  return [
    {
      id: 'finding', label: 'The sentence that matters', dwell: 0,
      caption: `A report exists for its findings. Built well, one sentence like “${sentence}” reaches everyone: a person reading the page, a person using a screen reader and an AI assistant.`,
      describe: `A bar chart of water visibility at three stations. The sentence “${sentence}” lifts off the chart and reaches three readers: a person reading, a person using a screen reader and an AI assistant.`,
      stage: <svg viewBox="0 0 960 480" role="img" aria-labelledby="story-caption">
        <Chart x={60} y={140} labels={data.well.chartLabels} />
        <Chip x={180} y={100} text={sentence} anim="rise" delay="300" />
        {[['eye', 'A person\nreading'], ['speaker', 'A person using\na screen reader'], ['ai', 'An AI\nassistant']].map(([kind, label], i) =>
          <g key={kind} data-anim="fade" data-delay={150 * i}><Reader x={560 + i * 150} y={150} kind={kind} label={label} /></g>)}
        {[0, 1, 2].map(i => <Chip key={i} x={560 + i * 150} y={300} text={sentence} anim="travel" delay={1100 + i * 220} dur="900" from={`${-380 - i * 150},-200`} />)}
      </svg>,
    },
    {
      id: 'underneath', label: 'Same cover, different underneath', dwell: 3000,
      caption: `These two PDFs look identical and print the same. Underneath, the second tells screen readers to read the steps as ${partlySteps.map(stepNumber).join(', ')}.`,
      describe: `Two identical report covers. The second separates into three layers: the page people see, with steps 1 to 4; the text that tools extract; and the hidden tags that screen readers follow, which order the steps ${partlySteps.map(stepNumber).join(', ')}.`,
      stage: <div className="s-scene-split">
        <svg viewBox="0 0 380 480" role="img" aria-labelledby="story-caption">
          <MiniPage x={20} y={110} label="Well prepared"><Lines x={14} y={56} widths={[110, 120, 90, 116, 100]} /></MiniPage>
          <MiniPage x={200} y={110} label="Partly prepared"><Lines x={14} y={56} widths={[110, 120, 90, 116, 100]} /></MiniPage>
        </svg>
        <div className="s-layers" aria-hidden="true">
          {[
            ['What people see', <g>{[1, 2, 3, 4].map((n, i) => <g key={n} transform={`translate(${20 + (i > 1 ? 150 : 0)} ${30 + (i % 2) * 40})`}><circle r="11" className="s-blue" /><text y="4" textAnchor="middle" className="s-pin-text">{n}</text><rect x="18" y="-3" width="96" height="6" rx="3" className="s-line" /></g>)}</g>],
            ['What text tools extract', <Lines x={20} y={20} widths={[230, 260, 200, 250, 220]} gap={14} />],
            ['What screen readers follow', <g>{partlySteps.map((step, i) => <g key={step} transform={`translate(${24 + i * 70} 52)`}><circle r="13" className="s-blue" /><text y="5" textAnchor="middle" className="s-pin-text">{stepNumber(step)}</text></g>)}<path d="M37 52 H71 M107 52 H141 M177 52 H211" className="s-red-stroke" strokeWidth="2.5" pathLength="1" strokeDasharray="1" data-anim="draw" data-delay="1500" data-dur="900" /></g>],
          ].map(([title, art], i) => <div key={title} className="s-layer" style={{ transform: `translate3d(0, ${i * 104}px, ${-i * 30}px) rotateX(18deg)` }} data-anim="unfold" data-delay={500 + i * 150} data-dur="900">
            <span className="s-layer-title">{title}</span>
            <svg viewBox="0 0 320 96">{art}</svg>
          </div>)}
        </div>
      </div>,
    },
    {
      id: 'lost', label: 'The sentence that doesn’t make it', dwell: 0,
      caption: 'This chart has no description. Its numbers survive as loose labels, but the sentence that explains them never leaves the page.',
      describe: `The same chart with no saved description. Text tools extract only the loose labels ${data.well.chartLabels.join(', ')}. The sentence “${sentence}” reaches the person reading the page but stops before the screen reader user and the AI assistant.`,
      stage: <svg viewBox="0 0 960 480" role="img" aria-labelledby="story-caption">
        <Chart x={60} y={60} labels={data.well.chartLabels} />
        <text x="60" y="250" className="s-label">What text tools extract</text>
        {data.well.chartLabels.map((label, i) => <g key={label} data-anim="drop" data-delay={200 + i * 120}><rect x={60 + i * 62} y="262" width="56" height="26" rx="4" className="s-code-box" /><text x={88 + i * 62} y="280" textAnchor="middle" className="s-code">{label}</text></g>)}
        <text x="60" y="330" className="s-small s-muted">No description saved, so “{sentence}” has nowhere to travel.</text>
        {[['eye', 'A person\nreading', true], ['speaker', 'A person using\na screen reader', false], ['ai', 'An AI\nassistant', false]].map(([kind, label, reached], i) =>
          <g key={kind}><Reader x={560 + i * 150} y={130} kind={kind} label={label} />
            {reached ? <Chip x={560} y={270} text={sentence} anim="travel" delay="900" dur="900" from="-380,-160" />
              : <g data-anim="pop" data-delay={1500 + i * 200}><circle cx={560 + i * 150} cy="270" r="18" className="s-stop" /><path d={`M${552 + i * 150} 262 l16 16 m0 -16 l-16 16`} className="s-paper-stroke" strokeWidth="3" /><text x={560 + i * 150} y="312" textAnchor="middle" className="s-small s-muted">Numbers only</text></g>}
          </g>)}
      </svg>,
    },
    {
      id: 'order', label: 'Drawn out of order', dwell: 0,
      caption: 'Here the right column is drawn first and the headline number is drawn last of all. Text tools read it exactly as it was drawn.',
      describe: `A page with a two-column procedure and a headline number, “+0.7 m”, next to its label. The text a tool extracts, in drawing order: ${extracted.join(' / ')}.`,
      stage: <svg viewBox="0 0 960 480" role="img" aria-labelledby="story-caption">
        <MiniPage x={40} y={40} w={300} h={400} label="What people see">
          {data.scrambled.tagSteps.map((step, i) => <g key={step} transform={`translate(${24 + (i > 1 ? 140 : 0)} ${110 + (i % 2) * 70})`}><circle r="11" className="s-blue" /><text y="4" textAnchor="middle" className="s-pin-text">{stepNumber(step)}</text><text x="18" y="4" className="s-tiny">{stepLabel(step).slice(0, 18)}</text><Lines x={0} y={18} widths={[110, 96]} gap={9} /></g>)}
          <text x="24" y="300" className="s-big-number">+0.7 m</text>
          <text x="120" y="296" className="s-tiny">rise in mean water visibility</text>
          <text x="120" y="308" className="s-tiny">since 2024, all three stations</text>
          <text x="24" y="345" className="s-tiny">Station locations are shown in Map 2.</text>
        </MiniPage>
        <text x="420" y="58" className="s-label">What a text tool extracts</text>
        {extracted.map((line, i) => {
          const orphan = i === extracted.length - 1;
          return <g key={line} data-anim="slide" data-delay={300 + i * 180}>
            <rect x="420" y={72 + i * 40} width="500" height="32" rx="4" className={orphan ? 's-code-box s-code-box--alert' : 's-code-box'} />
            <text x="436" y={93 + i * 40} className="s-code">{line.length > 62 ? `${line.slice(0, 61)}…` : line}</text>
            {orphan && <text x="905" y={93 + i * 40} textAnchor="end" className="s-small s-alert-text">on its own</text>}
          </g>;
        })}
      </svg>,
    },
    {
      id: 'answers', label: 'Two answers', dwell: 3000,
      caption: 'Ask an AI assistant the same question about each version. One gets fragments. The other gets the finding.',
      describe: 'Question: “How did water visibility change in 2025?” Answer from the scrambled PDF: “The report mentions a rise in visibility and, separately, +0.7 m. It does not say what was measured or where.” Answer from the well-built PDF: “Mean water visibility rose by 0.7 m since 2024 across all three stations. South is highest, at 3.4 m.” These answers are illustrations written for this example.',
      stage: <div className="s-answers">
        <p className="s-question" data-anim="fade">“How did water visibility change in 2025?”</p>
        <div className="s-answer s-answer--weak" data-anim="rise" data-delay="500">
          <span className="s-answer-from">From the scrambled PDF</span>
          <p>The report mentions a rise in visibility and, separately, “+0.7 m”. It doesn’t say what was measured or where.</p>
        </div>
        <div className="s-answer s-answer--strong" data-anim="rise" data-delay="1100">
          <span className="s-answer-from">From the well-built PDF</span>
          <p>Mean water visibility rose by 0.7 m since 2024 across all three stations. {sentence}, at 3.4 m.</p>
        </div>
        <p className="s-illustration">Illustrative answers written for this example.</p>
      </div>,
    },
    {
      id: 'check', label: 'What the check shows', dwell: 0,
      caption: `PDF Signal Check finds this on your device: “${data.scrambled.headline}”, pinned on the pages, with a fix list to send to whoever made the PDF.`,
      describe: `The check result for the scrambled PDF: ${data.scrambled.headline}. ${data.scrambled.pins.map(pin => `${pin.number}. ${pin.title} (${pin.where})`).join('; ')}.`,
      stage: <svg viewBox="0 0 960 480" role="img" aria-labelledby="story-caption">
        <MiniPage x={40} y={40} w={300} h={400}>
          <Lines x={24} y={100} widths={[240, 220, 250, 200]} gap={14} />
          <rect x="24" y="180" width="250" height="110" className="s-pale" />
          <Lines x={24} y={310} widths={[230, 250, 180]} gap={14} />
        </MiniPage>
        {data.scrambled.pins.map(pin => pinSpot(pin.title)).map(([px, py], i) =>
          <g key={i} data-anim="drop" data-delay={300 + i * 250} transform={`translate(${px} ${py})`}><circle r="15" className={data.scrambled.pins[i].bucket === 'fix' ? 's-fix' : 's-check'} /><text y="5" textAnchor="middle" className="s-pin-text">{i + 1}</text></g>)}
        <text x="420" y="80" className="s-headline">{data.scrambled.headline}</text>
        {data.scrambled.pins.map((pin, i) => <g key={pin.title} data-anim="slide" data-delay={800 + i * 200}>
          <rect x="420" y={110 + i * 70} width="500" height="56" rx="6" className="s-card" />
          <circle cx="448" cy={138 + i * 70} r="13" className={pin.bucket === 'fix' ? 's-fix' : 's-check'} /><text x="448" y={143 + i * 70} textAnchor="middle" className="s-pin-text">{pin.number}</text>
          <text x="472" y={134 + i * 70} className="s-card-title">{pin.title}</text>
          <text x="472" y={152 + i * 70} className="s-small s-muted">{pin.bucket === 'fix' ? 'Fix' : 'Check'} · {pin.where}</text>
        </g>)}
      </svg>,
    },
    {
      id: 'passport', label: 'Give your findings a passport', dwell: 0, final: true,
      caption: 'Built well, a PDF carries its own evidence: the data behind the chart, a description search engines understand, links that lead somewhere and bookmarks to every section.',
      describe: `The well-built report opens like a folder. Attached: ${data.travel.attachments.map(file => file.name).join(' and ')}. The data rows: ${rows.map(row => row.join(' ')).join('; ')}. “Map 2” becomes a link. Bookmarks: ${data.travel.bookmarks.join('; ')}.`,
      stage: <svg viewBox="0 0 960 480" role="img" aria-labelledby="story-caption">
        <MiniPage x={40} y={40} w={300} h={400}>
          <Lines x={24} y={100} widths={[240, 220, 250]} gap={14} />
          <text x="24" y="170" className="s-tiny">Station locations are shown in <tspan className="s-link-text" textDecoration="underline">Map 2</tspan>.</text>
          <g data-anim="pop" data-delay="1600"><rect x="24" y="180" width="118" height="18" rx="9" className="s-blue" /><text x="83" y="193" textAnchor="middle" className="s-tiny s-on-blue">Links to the annex</text></g>
          <path d="M270 0 h22 v40 l-11 -9 -11 9 Z" className="s-green" data-anim="drop" data-delay="2000" />
        </MiniPage>
        <g data-anim="slide" data-delay="300">
          <text x="420" y="58" className="s-label">Attached data</text>
          <rect x="420" y="70" width="272" height={34 + rows.length * 26} rx="6" className="s-card" />
          <text x="436" y="94" className="s-code s-code--head">{header?.join(',')}</text>
          {rows.map((row, i) => <text key={row[0]} x="436" y={122 + i * 26} className="s-code">{row.join(',')}</text>)}
        </g>
        <g data-anim="slide" data-delay="800">
          <text x="712" y="58" className="s-label">Described for search</text>
          <rect x="712" y="70" width="214" height="90" rx="6" className="s-card" />
          <text x="726" y="98" className="s-code">{'{ "@type": "Report",'}</text>
          <text x="726" y="122" className="s-code">{'  "hasPart": "Dataset" }'}</text>
          <text x="726" y="146" className="s-small s-muted">schema.org JSON-LD</text>
        </g>
        <g data-anim="slide" data-delay="1200">
          <text x="420" y="250" className="s-label">Bookmarks</text>
          {data.travel.bookmarks.map((title, i) => <text key={title} x="436" y={276 + i * 24} className="s-small">▸ {title}</text>)}
        </g>
      </svg>,
    },
  ];
}
