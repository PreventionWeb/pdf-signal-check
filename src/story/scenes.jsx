import React from 'react';
import { finding, stepNumber, storyScript, yearOf } from './script.js';
import { A, At, Backdrop, Bubble, C, Chart, Cover, Img, Mini, NoSign, PageSlip, Person, QMark, Sheet, Stamp, StepTag, Strip, Tile, TILE_COLOURS, Torn, Warning } from './art.jsx';

/*
 * The scenes for "Your report says it. Does everyone understand it?". Text values on stage come from
 * snapshot.json (real engine output on the synthetic samples); the words come from script.js, matched by ID.
 * Static markup is each scene's composed final frame; <A anim> marks how a piece enters, timed to the narration
 * clip for that scene. Pieces with className "sp-wide" are extras that drop out on narrow screens, where only the
 * central 4:3 of the stage shows; "sp-narrow" pieces appear only there.
 */

const stepWord = text => text.replace(/^\d[.)]\s*/, '').split(' ')[0];

// The three hidden layers, as coloured paper, recur across scenes.
const LAYER = { see: C.paper, text: '#cfe9f7', tags: '#fbe3a6' };
const STEP_COLOUR = { 1: C.teal, 2: C.sky, 3: C.coral, 4: C.purple };
// The four kinds of reader, labelled the same way everywhere.
const READERS = [['reader', 'See the page'], ['listener', 'Listen with a screen reader'], ['search', 'Web search'], ['assistant', 'AI chatbot']];
const TEXT_LAYER = 'Text machines extract';
const TAGS_LAYER = 'Tags guide the reading order';
// A crowd of small paper people, the readers a finding can reach.
const CROWD = Array.from({ length: 12 }, (_, i) => ({ x: 236 + i * 103, y: 772 + (i % 3) * 10, body: [C.teal, C.purple, C.coral, C.sky, C.mustard][i % 5], skin: C.skin[i % 3] }));

const Stage = ({ v = 0, children }) => <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><Backdrop variant={v} />{children}</svg>;
const Label = ({ x, y, text, fill = C.paper, color = C.ink, size = 34, ...anim }) => <A anim="drop" {...anim}><At x={x} y={y}><Strip text={text} fill={fill} color={color} size={size} pad={16} /></At></A>;
/** A paper map pin with its number. */
const Pin = ({ number, fix }) => <g>
  <g filter="url(#sp-scissor)"><path d="M0 0 C-24 -24 -24 -54 0 -54 C24 -54 24 -24 0 0 Z" fill={fix ? C.red : C.mustard} /></g>
  <text y="-26" textAnchor="middle" className="sp-label" fontSize="24" fontWeight="700" fill={fix ? '#fff' : C.ink}>{number}</text>
</g>;
/** A hand-drawn pencil ring. Keep its static SVG rotation on a parent: the motion engine sets transform-origin
 * on animated shapes, which otherwise shifts a rotated ellipse away from the paper piece it circles. */
const Ring = ({ cx, cy, rx, ry, colour = C.red, delay, dur = 700, r = -6 }) =>
  <g transform={`rotate(${r} ${cx} ${cy})`}>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={colour} strokeWidth="7" pathLength="1" strokeDasharray="1" data-anim="draw" data-delay={delay} data-dur={dur} />
  </g>;
/** A paper string drawn in steps. A broken route ends at a marked break; a faint dotted continuation
 * shows the person it failed to reach, so the completed animation cannot look accidentally unfinished. */
const Reach = ({ from, to, delay, short = false, colour = C.inkSoft }) => {
  const [x1, y1] = from, [x2, y2] = to;
  const [mx, my] = [(x1 + x2) / 2, Math.min(y1, y2) - 30];
  const t = 0.6;
  const [ax, ay] = [x1 + (mx - x1) * t, y1 + (my - y1) * t];
  const [bx, by] = [mx + (x2 - mx) * t, my + (y2 - my) * t];
  const [cutX, cutY] = [ax + (bx - ax) * t, ay + (by - ay) * t];
  const drawn = short ? `M${x1} ${y1} Q${ax} ${ay} ${cutX} ${cutY}` : `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
  return <g>
    <path d={drawn} stroke={colour} strokeWidth="4" strokeLinecap="round" fill="none" pathLength="1" strokeDasharray="1" data-anim="draw" data-delay={delay} data-dur={500} opacity="0.8" />
    {short && <>
      <A anim="fade" delay={delay + 520} dur={250}><path d={`M${cutX} ${cutY} Q${bx} ${by} ${x2} ${y2}`} stroke={colour} strokeWidth="3" strokeDasharray="8 15" strokeLinecap="round" fill="none" opacity="0.22" /></A>
      <A anim="pop" delay={delay + 520} dur={260}><At x={cutX} y={cutY}>
        <circle r="14" fill={C.paper} stroke={C.coral} strokeWidth="3" />
        <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke={C.coral} strokeWidth="3" strokeLinecap="round" />
      </At></A>
    </>}
  </g>;
};
/** A tiny "picture" glyph: frame, hills and sun. */
const PictureGlyph = ({ colour = '#fff' }) => <g fill="none" stroke={colour} strokeWidth="4" strokeLinejoin="round">
  <rect x="0" y="0" width="40" height="30" rx="3" /><path d="M4 26 L16 13 L24 21 L29 16 L37 26" /><circle cx="29" cy="9" r="3.5" fill={colour} stroke="none" />
</g>;
/** A magnifier glyph for search results. */
const SearchGlyph = () => <g stroke={C.inkSoft} strokeWidth="5" fill="none"><circle cx="0" cy="0" r="16" /><path d="M11 12 L26 27" strokeLinecap="round" /></g>;
/** Three illustrative routes through a report, without implying an exhaustive classification. */
const Slot = ({ label }) => <g>
  <rect x="-150" y="0" width="300" height="400" rx="16" fill={C.paper} fillOpacity="0.35" stroke={C.inkSoft} strokeWidth="4" strokeDasharray="14 12" />
  <At x={0} y={-62}><Strip text={label} size={label.length > 19 ? 24 : 28} pad={14} fill={C.ink} color="#fff" center /></At>
</g>;
/** A small paper table and comparison bars for data processing, distinct from search and chat. */
const DataTool = ({ label = true }) => <g>
  <Torn w={190} h={158} fill={LAYER.text}>
    <rect x="18" y="18" width="150" height="16" rx="3" fill={C.teal} />
    {[0, 1, 2].map((i) => <g key={i}>
      <rect x="18" y={52 + i * 30} width="60" height="9" rx="4" fill={C.inkSoft} opacity="0.6" />
      <rect x="90" y={52 + i * 30} width={35 + i * 17} height="13" rx="2" fill={[C.sky, C.teal, C.coral][i]} />
    </g>)}
  </Torn>
  {label && <At x={95} y={187}><Strip text="Data tools" size={28} pad={13} center /></At>}
</g>;
/** The step tags on a tangled string. */
const Tangle = ({ order }) => <g>
  <path d="M0 40 C120 -10 160 120 240 40 S330 -30 420 60 C480 120 380 140 520 30" stroke={C.ink} strokeWidth="4" fill="none" strokeLinecap="round" />
  {order.map((n, i) => <At key={i} x={60 + i * 130} y={[34, 62, 30, 46][i]} r={[-14, 10, -6, 16][i]} s={0.5}><StepTag n={n} fill={STEP_COLOUR[n]} /></At>)}
</g>;
/** The finding's bubble, crumpled: creased and tilted. */
const Crumpled = ({ text }) => <g transform="rotate(-11) scale(0.82)">
  <Bubble text={text} size={30} />
  <g stroke={C.ink} strokeOpacity="0.35" strokeWidth="3" fill="none"><path d="M-140 -26 L-60 6 L-90 30" /><path d="M20 -30 L60 4 L130 -12" /><path d="M-20 30 L40 -6" /></g>
</g>;

/** Chapter dividers reuse the report-page motif, leaving the central safe area clear on mobile. */
const ChapterCard = ({ number, title }) => {
  const accent = [C.purple, C.coral, C.teal][number - 2] || C.teal;
  return <Stage v={number + 1}>
    <At x={374} y={112} r={-1}>
      <Torn w={850} h={670} fill={C.paper}>
        <rect x="56" y="68" width="738" height="8" rx="4" fill={accent} opacity="0.7" />
        <rect x="56" y="592" width="738" height="5" rx="3" fill={accent} opacity="0.35" />
      </Torn>
    </At>
    <At x={455} y={146} r={-5}>
      <Strip text={String(number).padStart(2, '0')} size={48} pad={22} fill={accent} color="#fff" />
    </At>
    <At x={444} y={250} r={-1.5}>
      <Strip text={title} size={62} pad={20} fill={C.ink} color="#fff" />
    </At>
    <A anim="rise" delay={1100} dur={580}><At x={955} y={564} r={5}>
      <Torn w={174} h={166} fill="#fff">
        <path d="M24 121 H150" stroke={C.inkSoft} strokeWidth="3" />
        {[0, 1, 2].map((i) => <rect key={i} x={35 + i * 40} y={121 - [52, 73, 95][i]} width="26" height={[52, 73, 95][i]} fill={[C.sky, C.teal, C.coral][i]} />)}
        <path d="M116 22 H150 V56" stroke={accent} strokeWidth="4" fill="none" />
      </Torn>
    </At></A>
    {number === 3 && <>
      {[0, 1, 2].map((i) => <A key={i} anim="pop" delay={1350 + i * 110} dur={350}><At x={955 + i * 84} y={758} s={0.7}><Mini body={[C.teal, C.sky, C.coral][i]} /></At></A>)}
      {[0, 1, 2].map((i) => <Reach key={i} from={[1035, 692]} to={[955 + i * 84, 744]} delay={1570 + i * 130} />)}
    </>}
    {number === 4 && <A anim="slap" delay={1390} dur={450}><At x={1024} y={585} r={-37}>
      <g filter="url(#sp-scissor)"><path d="M0 0 H150 V25 H0 Z" fill={C.mustard} /><path d="M150 0 L180 12.5 L150 25 Z" fill={C.inkSoft} /><path d="M0 0 H18 V25 H0 Z" fill={C.coral} /></g>
      <path d="M10 28 H145" stroke={C.teal} strokeWidth="4" />
    </At></A>}
  </Stage>;
};

/** The tool's result as a torn-out sheet: headline, numbered rows with Fix/Check, and an optional "+ n more" line. */
const ResultSheet = ({ headline, rows, more = 0 }) => {
  const h = Math.max(372, 128 + rows.length * 46 + (more ? 44 : 0)); // always covers the laptop screen
  return <Torn w={560} h={h} fill="#fff">
    <rect width="560" height="40" fill={C.teal} />
    <text x="18" y="28" className="sp-label" fontSize="20" fill="#fff" fontWeight="700">PDF Signal Check</text>
    <text x="20" y="88" className="sp-strip" fontSize="32" fontWeight="700" fill={C.ink}>{headline}</text>
    {rows.map((pin, i) => <g key={pin.number}>
      <circle cx="36" cy={124 + i * 46} r="17" fill={pin.bucket === 'fix' ? C.red : C.mustard} />
      <text x="36" y={131 + i * 46} textAnchor="middle" className="sp-label" fontSize="20" fontWeight="700" fill={pin.bucket === 'fix' ? '#fff' : C.ink}>{pin.number}</text>
      <text x="64" y={131 + i * 46} className="sp-label" fontSize="21" fill={C.ink}>{pin.title}</text>
      <text x="542" y={131 + i * 46} textAnchor="end" className="sp-label" fontSize="18" fill={C.inkSoft}>{pin.bucket === 'fix' ? 'Fix' : 'Check'}</text>
    </g>)}
    {more > 0 && <text x="64" y={131 + rows.length * 46} className="sp-label" fontSize="21" fontWeight="700" fill={C.inkSoft}>+ {more} more to check</text>}
  </Torn>;
};

export function scenes(data) {
  const words = storyScript(data);
  const sentence = finding(data);
  const cover = data.travel.title, saved = data.partly.savedTitle;
  const coverYear = yearOf(cover), savedYear = yearOf(saved);
  const hiddenOrder = data.partly.tagSteps;
  const order = hiddenOrder.map(step => Number(stepNumber(step)));
  const drawn = data.scrambled.drawnLines;
  const orphan = drawn.at(-1);
  const orphanLabel = drawn.find(line => /^rise in/.test(line)) || drawn.at(-3);
  const copied = drawn.slice(-3, -1);
  const [, ...rows] = data.travel.csvRows;
  const csvName = data.travel.attachments.find(file => /\.csv$/.test(file.name))?.name || 'data.csv';
  // The cameo lists every real pin, so the list always matches its headline's count.
  const allPins = data.scrambled.pins;
  const labels = data.well.chartLabels;
  const values = labels.filter(text => /m$/.test(text)), names = labels.filter(text => !/m$/.test(text));
  const savedStem = saved.replace(/\s*\S+$/, '');
  const possibleAnswer = `In ${savedYear}, ${names[1]} was highest.`;

  const visuals = [
    // 1. Your report says it
    {
      describe: `The cover of the fictional “${cover}” drops onto a sheet of cream paper. Torn paper tiles spell out “Your report says it. But can EVERYONE understand it?”, with paper question marks around them.`,
      stage: <Stage v={0}>
        <A anim="drop" dur={800} idle="1"><At x={278} y={240} r={-6}><Cover year={coverYear} /></At></A>
        <A anim="slap" delay={500} dur={500}><At x={620} y={150} r={-1.5}><Strip text="Your report says it." size={56} /></At></A>
        <A anim="slap" delay={1100} dur={450}><At x={620} y={300} r={1.5}><Strip text="But can" size={56} fill={C.ink} color="#fff" /></At></A>
        {'EVERYONE'.split('').map((ch, i) =>
          <A key={i} anim="drop" delay={1450 + i * 110} dur={520} idle="0.8"><At x={612 + i * 98} y={420 + (i % 2) * 14} r={[-5, 4, -2, 6, -4, 3, -6, 2][i]}><Tile ch={ch} size={112} fill={TILE_COLOURS[i % TILE_COLOURS.length]} /></At></A>)}
        <A anim="slap" delay={2400} dur={450}><At x={760} y={610} r={-1}><Strip text="understand it?" size={56} /></At></A>
        <A anim="pop" delay={2400} dur={500} idle="1.4"><At x={1330} y={230} r={14}><QMark /></At></A>
        <A anim="pop" delay={2500} dur={500} idle="1.4" className="sp-wide"><At x={520} y={170} r={-16} s={0.75}><QMark fill={C.sky} /></At></A>
        <A anim="pop" delay={2600} dur={500} idle="1.4"><At x={1290} y={720} r={8} s={0.85}><QMark fill={C.coral} /></At></A>
        <Label x={252} y={776} text="01 · Who needs your report?" size={24} fill={LAYER.text} delay={2600} />
      </Stage>,
    },
    // 2. People who see, people who listen
    {
      describe: 'Three paper routes labelled “People who see”, “People who listen” and “Machines that analyse”. An open-book reader labelled “See the page” slides into the first route. A listener with headphones and a speaking screen, labelled “Listen with a screen reader”, slides into the second. A paper data table labelled “Process the report” fills the third.',
      stage: <Stage v={1}>
        {[['People who see', 420], ['People who listen', 800], ['Machines that analyse', 1180]].map(([label, x], i) => <A key={label} anim="drop" delay={300 + i * 250} dur={600}><At x={x} y={260}><Slot label={label} /></At></A>)}
        <A anim="left" delay={2300} dur={650} idle="0.7"><At x={420} y={330} s={0.92}><Person kind="reader" label={READERS[0][1]} /></At></A>
        <A anim="right" delay={4100} dur={650} idle="0.7"><At x={800} y={330} s={0.92}><Person kind="listener" label={READERS[1][1]} /></At></A>
        <A anim="rise" delay={5300} dur={550}><At x={846} y={432}><Img name="laptop" w={96} /></At></A>
        <A anim="pop" delay={6200} dur={500} idle="0.8"><At x={1085} y={365}><DataTool label={false} /></At></A>
        <A anim="slap" delay={6800} dur={450}><At x={1180} y={560}><Strip text="Process the report" size={28} pad={13} center /></At></A>
      </Stage>,
    },
    // 3. Machines, and reach
    {
      describe: 'The person reading and the person listening move up to the corner. Three processing routes fill the middle: data tools compare rows for researchers, web search shows result cards and an AI chatbot receives small paper pages. Dotted strings run from the tools to a crowd of paper people below. A small paper slip marked as a hidden formatting error enters the routes; restrained coral rings ripple towards only some of the people, showing how one error can spread.',
      stage: <Stage v={2}>
        <A anim="drop" dur={600}><At x={270} y={150} s={0.55}><Person kind="reader" label={READERS[0][1]} /></At></A>
        <A anim="drop" delay={150} dur={600}><At x={490} y={150} s={0.55}><Person kind="listener" label={READERS[1][1]} /></At></A>
        <A anim="right" delay={2700} dur={650} idle="0.5"><At x={620} y={215} s={0.82}><DataTool /></At></A>
        <A anim="right" delay={700} dur={650} idle="0.6"><At x={970} y={150} s={0.86}><Person kind="search" label={READERS[2][1]} /></At></A>
        <A anim="right" delay={5000} dur={650} idle="0.6"><At x={1260} y={150} s={0.86}><Person kind="assistant" label={READERS[3][1]} /></At></A>
        {[0, 1, 2].map(i => <A key={i} anim="travel" delay={6900 + i * 350} dur={700} from={`${-260 + i * 30},${-120 - i * 20}`}>
          <At x={1115 + i * 20} y={196 + i * 10} r={[-12, 4, 14][i]}><PageSlip /></At>
        </A>)}
        {CROWD.map((p, i) => <A key={i} anim="pop" delay={11100 + i * 60} dur={360}><At x={p.x} y={p.y}><Mini body={p.body} skin={p.skin} /></At></A>)}
        {CROWD.map((p, i) => <Reach key={i} from={i < 4 ? [700, 420] : i < 8 ? [970, 420] : [1260, 420]} to={[p.x, p.y - 14]} delay={11500 + i * 120} />)}
        <A anim="travel" from="60,-100" delay={18100} dur={540}><At x={735} y={540} r={-5}>
          <Torn w={104} h={74} fill={LAYER.tags}>
            <text x="52" y="54" textAnchor="middle" className="sp-tile" fontSize="54" fill={C.coral}>?</text>
          </Torn>
        </At></A>
        <Label x={850} y={547} text="Hidden formatting error" size={24} fill={LAYER.tags} delay={18400} />
        {[0, 1, 2].map((i) => <A key={i} anim="pop" delay={18800 + i * 530} dur={460}>
          <ellipse cx={850} cy={625} rx={90 + i * 82} ry={55 + i * 52} fill="none" stroke={C.coral} strokeWidth="3" strokeDasharray="10 15" opacity={0.48 - i * 0.07} />
        </A>)}
      </Stage>,
    },
    // 4. The chart is a picture
    {
      describe: `The made-up report's chart page comes forward. The chart, titled “Water clarity, metres”, is marked as a picture, with frame corners and a “Picture” tag. Its bars: ${values.map((v, i) => `${names[i]} ${v}`).join(', ')}. The South bar is ringed and a bubble says “${sentence}”. Along the bottom, the four kinds of reader wait for the finding.`,
      stage: <Stage v={3}>
        <A anim="drop" dur={700} className="sp-wide"><At x={170} y={250} r={-7} s={0.5}><Cover year={coverYear} />
          <At x={20} y={420} r={4}><Strip text="Made-up example" size={34} pad={14} fill={C.mustard} /></At>
        </At></A>
        <Label x={220} y={146} text="Made-up example" size={24} fill={C.mustard} className="sp-narrow" delay={100} />
        <A anim="rise" delay={100} dur={700}><At x={480} y={100} s={0.9}>
          <g filter="url(#sp-piece)"><rect width="760" height="640" rx="6" fill={C.paper} /></g>
          <At x={40} y={34}><Strip text="Water clarity, metres" size={34} pad={16} /></At>
          <At x={100} y={196} s={1.25}><Chart labels={labels} /></At>
          <g stroke={C.ink} strokeWidth="7" fill="none" strokeLinecap="round">
            <path d="M80 214 V178 H116" /><path d="M644 178 H680 V214" /><path d="M80 588 V624 H116" /><path d="M644 624 H680 V588" />
          </g>
          <Ring cx={514} cy={412} rx={76} ry={128} colour={C.mustard} delay={8200} dur={600} r={0} />
          <A anim="slap" delay={1000} dur={450} idle="0.8"><At x={560} y={26} r={7}>
            <Torn w={190} h={62} fill={C.coral}>
              <At x={16} y={16}><PictureGlyph /></At>
              <text x="68" y="42" className="sp-strip" fontSize="30" fontWeight="700" fill="#fff">Picture</text>
            </Torn>
          </At></A>
          <A anim="pop" delay={9100} dur={550} idle="1"><At x={420} y={140}><Bubble text={sentence} size={38} tailAt={0.60} tailDepth={106} /></At></A>
        </At></A>
        {READERS.map(([kind], i) => <A key={kind} anim="rise" delay={10100 + i * 120} dur={500}><At x={560 + i * 160} y={760}><Img name={kind} w={92} center /></At></A>)}
      </Stage>,
    },
    // 5. Hidden layers
    {
      describe: `Behind the page, the report fans out into three stacked sheets of paper. The top sheet, white, is “What people see”. The middle sheet, light blue, is “${TEXT_LAYER}”, shown as lines of plain text, with web search and the AI chatbot beside it. The bottom sheet, yellow, is “${TAGS_LAYER}”, shown as numbered tags on a string, with the person listening beside it.`,
      stage: <Stage v={4}>
        {[
          [TAGS_LAYER, LAYER.tags, 320, 560, '-140,-360', <g>
            <path d="M40 74 Q250 102 470 72" stroke={C.ink} strokeWidth="4" fill="none" />
            {[1, 2, 3, 4].map((n, i) => <At key={n} x={90 + i * 110} y={76 + (i === 1 || i === 2 ? 8 : 2)} s={0.58}><StepTag n={n} fill={STEP_COLOUR[n]} /></At>)}
          </g>],
          [TEXT_LAYER, LAYER.text, 260, 380, '-70,-180', <g className="sp-mono" fontSize="24" fill={C.ink}>
            <text x="36" y="84">Annual Report {coverYear}</text>
            <text x="36" y="124">Mean water visibility</text>
            <text x="36" y="164">{labels.slice(0, 4).join('  ')} …</text>
          </g>],
          ['What people see', LAYER.see, 440, 200, null, <g>
            <rect x="24" y="22" width="452" height="34" fill={C.teal} />
            <path d="M24 46 C140 34 300 64 476 44 V58 H24 Z" fill={C.purple} />
            <At x={30} y={66} s={0.42}><Chart labels={labels} animate={false} /></At>
            <text x="234" y="104" className="sp-tile" fontSize="26" fill={C.ink}>Annual Report {coverYear}</text>
            {[0, 1, 2].map(i => <rect key={i} x="234" y={126 + i * 20} width={[200, 180, 198][i]} height="10" rx="5" fill="#e3d7c2" />)}
          </g>],
        ].map(([label, fill, x, y, from, art], i) =>
          <A key={label} anim={from ? 'travel' : 'drop'} from={from} delay={from ? [3900, 2200][i] : 100} dur={from ? 800 : 700} idle="0.6">
            <At x={x} y={y} r={[1.5, -1, 0.5][i]}><Sheet w={500} h={210} fill={fill} label={label} labelSize={28}>{art}</Sheet></At>
          </A>)}
        <A anim="pop" delay={2900} dur={450} idle="0.8"><At x={1170} y={410}><Img name="search" w={100} /></At></A>
        <A anim="pop" delay={3100} dur={450} idle="0.8"><At x={1285} y={420}><Img name="assistant" w={96} /></At></A>
        <A anim="pop" delay={4700} dur={450} idle="0.8"><At x={1274} y={600}><Img name="listener" w={78} /></At></A>
      </Stage>,
    },
    // 6. No description
    {
      describe: `Left: the chart as people see it, with the bubble “${sentence}”. Right: the tags that screen readers follow, where the chart is only an empty dashed frame with a question mark, and its description is blank, marked with a red no sign. Below, the person listening with a screen reader hears only “Image.”`,
      stage: <Stage v={5}>
        <Label x={200} y={70} text="What people see" />
        <A anim="drop" delay={100} dur={600}><At x={200} y={230} s={0.9}><Chart labels={labels} animate={false} /></At></A>
        <A anim="pop" delay={400} dur={500} idle="1"><At x={398} y={200}><Bubble text={sentence} size={34} /></At></A>
        <Label x={760} y={70} text={TAGS_LAYER} fill={LAYER.tags} delay={500} />
        <A anim="right" delay={600} dur={650}><At x={760} y={180}><Sheet w={600} h={380} fill={LAYER.tags}>
          <rect x="40" y="40" width="330" height="290" rx="8" fill="none" stroke={C.inkSoft} strokeWidth="5" strokeDasharray="16 12" />
          <text x="400" y="104" className="sp-label" fontSize="30" fill={C.ink}>Description:</text>
          <path d="M400 156 H570" stroke={C.inkSoft} strokeWidth="4" strokeDasharray="10 8" />
          <text x="400" y="210" className="sp-label" fontSize="26" fill={C.inkSoft}>(none saved)</text>
        </Sheet></At></A>
        <A anim="pop" delay={1000} dur={450} idle="1"><At x={965} y={365} s={1.3}><QMark fill={C.mustard} /></At></A>
        <A anim="slap" delay={1700} dur={400}><At x={1280} y={480}><NoSign r={66} /></At></A>
        <A anim="left" delay={2500} dur={600}><At x={640} y={598} s={0.95}><Person kind="listener" label={READERS[1][1]} /></At></A>
        <A anim="pop" delay={3900} dur={450} idle="1"><At x={935} y={650}><Bubble text="“Image.”" size={56} fill={C.paper} color={C.ink} tail="left" /></At></A>
      </Stage>,
    },
    // 7. Steps out of order
    {
      describe: `Left: the page people see, with method steps 1 and 2 in the left column and 3 and 4 in the right. Right: the step tags peel off the page and hang on a string in the order the hidden tags give them: ${hiddenOrder.join('; ')}. The “Store” tag is ringed, then the “Collect” tag: store comes before collect. The person listening hears “${order.join(', ')}”. A small card explicitly marked as an analogy compares this to icing a cake before baking it; the cake is not in the report.`,
      stage: <Stage v={6}>
        <Label x={210} y={70} text="What people see" />
        <A anim="drop" dur={650}><At x={210} y={200} r={-2}><g filter="url(#sp-piece)"><rect width="440" height="560" rx="6" fill={C.paper} /></g>
          <rect x="30" y="30" width="380" height="18" rx="9" fill="#e3d7c2" />
          {[1, 2, 3, 4].map(n => <At key={n} x={36 + (n > 2 ? 200 : 0)} y={110 + ((n - 1) % 2) * 190}>
            <circle cx="30" cy="30" r="30" fill={STEP_COLOUR[n]} /><text x="30" y="42" textAnchor="middle" className="sp-tile" fontSize="36" fill="#fff">{n}</text>
            {[0, 1, 2, 3].map(k => <rect key={k} x="0" y={78 + k * 22} width={[160, 140, 150, 110][k]} height="10" rx="5" fill="#e3d7c2" />)}
          </At>)}
        </At></A>
        <Label x={720} y={70} text={TAGS_LAYER} fill={LAYER.tags} delay={300} />
        <A anim="fade" delay={600} dur={300}><path d="M720 230 Q1050 280 1390 226" stroke={C.ink} strokeWidth="5" fill="none" strokeLinecap="round" /></A>
        {hiddenOrder.map((step, i) => {
          const n = order[i], x = 800 + i * 170, y = 242 + (i === 1 || i === 2 ? 14 : 4);
          const home = (n > 2 ? 476 : 276) - x, homeY = (n % 2 ? 300 : 490) - y;
          return <A key={step} anim="travel" from={`${home},${homeY}`} delay={[5200, 6100, 7000, 7900][i]} dur={600} idle="1.6">
            <At x={x} y={y}><StepTag n={n} fill={STEP_COLOUR[n]} label={stepWord(step)} /></At>
          </A>;
        })}
        <Ring cx={800} cy={340} rx={74} ry={112} colour={C.mustard} delay={10800} dur={450} r={-3} />
        <Ring cx={1310} cy={330} rx={74} ry={112} colour={C.mustard} delay={12400} dur={450} r={3} />
        <A anim="left" delay={1500} dur={600}><At x={820} y={630} s={0.6}><Person kind="listener" label={READERS[1][1]} /></At></A>
        <A anim="pop" delay={9200} dur={450} idle="1"><At x={1080} y={650}><Bubble text={`“${order.join(', ')} …”`} size={34} fill={C.paper} color={C.ink} tail="left" /></At></A>
        <A anim="drop" delay={13300} dur={450} idle="1.2"><At x={1320} y={700}><Warning s={0.8} /></At></A>
        <A anim="pop" delay={15000} dur={480}><At x={1050} y={770}>
          <Torn w={330} h={105} fill={C.paper}>
            <g filter="url(#sp-scissor)">
              <rect x="18" y="53" width="70" height="38" rx="4" fill={C.mustard} />
              <path d="M18 59 Q28 35 39 51 Q50 34 61 51 Q77 37 88 59" fill={C.pink} />
            </g>
            <text x="108" y="33" className="sp-label" fontSize="18" fontWeight="700" fill={C.inkSoft}>ANALOGY</text>
            <text x="108" y="64" className="sp-strip" fontSize="25" fontWeight="700" fill={C.ink}>Icing before</text>
            <text x="108" y="93" className="sp-strip" fontSize="25" fontWeight="700" fill={C.ink}>baking</text>
          </Torn>
        </At></A>
      </Stage>,
    },
    // 8. The lonely number
    {
      describe: `First, as people see it on the page: the big number “${orphan}” beside its label, “${orphanLabel}”. Then the same page as machines copy it out: the label line, then unrelated lines, and “${orphan}” last of all, alone, with a question mark.`,
      stage: <Stage v={7}>
        <Label x={200} y={70} text="What people see" />
        <A anim="rise" delay={200} dur={650}><At x={200} y={170} r={-1.5}>
          <g filter="url(#sp-piece)"><rect width="560" height="250" rx="6" fill={C.paper} /></g>
          <text x="30" y="148" className="sp-tile" fontSize="80" fill={C.coral}>{orphan}</text>
          {orphanLabel.match(/.{1,22}(\s|$)/g).slice(0, 4).map((line, i) => <text key={i} x="320" y={84 + i * 34} className="sp-label" fontSize="26" fill={C.ink}>{line.trim()}</text>)}
        </At></A>
        <Label x={860} y={70} text={TEXT_LAYER} fill={LAYER.text} delay={3600} />
        {copied.map((line, i) => <A key={line} anim="left" delay={3900 + i * 400} dur={550}>
          <At x={850} y={170 + i * 84} r={[-1, 1][i]}><Strip text={line.length > 34 ? `${line.slice(0, 33)}…` : line} size={22} pad={12} fill={LAYER.text} cls="sp-mono" bold={false} width={500} /></At>
        </A>)}
        <A anim="fade" delay={4800} dur={250}><path d="M1000 330 C960 370 970 400 1030 420" stroke={C.inkSoft} strokeWidth="4" strokeDasharray="8 8" fill="none" /></A>
        <A anim="drop" delay={4900} dur={650} idle="1.2"><At x={1010} y={420} r={-6}><Torn w={300} h={140} fill={C.coral}><text x="150" y="102" textAnchor="middle" className="sp-tile" fontSize="92" fill="#fff">{orphan}</text></Torn></At></A>
        <A anim="pop" delay={5400} dur={450} idle="1.5"><At x={1240} y={640} r={12}><QMark fill={C.mustard} /></At></A>
      </Stage>,
    },
    // 9. The wrong title
    {
      describe: `A folder labelled “Title saved inside the PDF” holds the title “${saved}”, with ${savedYear} ringed in red. Beside it, the cover says “${cover}”, with ${coverYear} ringed in teal. A “Which year?” question arrives after the conflicting dates. A carried-over year is one possible explanation, not recorded provenance.`,
      stage: <Stage v={8}>
        <A anim="right" delay={2950} dur={650}><At x={700} y={190} r={-2} s={1.3}>
          <Img name="folder" w={400} />
          <text x="34" y="110" className="sp-label" fontSize="22" fill={C.ink}>Title saved inside the PDF</text>
          <text x="34" y="160" className="sp-label" fontSize="24" fontWeight="700" fill={C.ink}>{savedStem}</text>
          <text x="34" y="250" className="sp-tile" fontSize="72" fill={C.ink}>{savedYear}</text>
          <Ring cx={104} cy={226} rx={104} ry={54} delay={5550} />
        </At></A>
        <Label x={240} y={120} text="On the cover" delay={100} />
        <A anim="left" delay={350} dur={650} idle="0.6"><At x={250} y={220} r={-4} s={0.95}>
          <Cover year={coverYear} />
          <Ring cx={70} cy={180} rx={66} ry={34} colour={C.teal} delay={1550} dur={550} r={-4} />
        </At></A>
        <Label x={677} y={704} text="Which year?" size={38} fill={LAYER.tags} delay={11900} />
      </Stage>,
    },
    // 10. What happens: search and listening
    {
      describe: `Left: a search result lists “${saved}”, with ${savedYear} ringed, while the ${coverYear} cover lies half hidden underneath. Right: the person listening with a screen reader hears only “Image.”, and the step tags hang tangled on their string in the order ${order.join(', ')}. Question marks, no alarms.`,
      stage: <Stage v={9}>
        <A anim="drop" delay={1300} dur={600}><At x={230} y={110}><Img name="search" w={170} /></At></A>
        <A anim="drop" delay={1500} dur={650}><At x={330} y={330} r={-14} s={0.55}><Cover year={coverYear} /></At></A>
        <A anim="rise" delay={2000} dur={600}><At x={230} y={460} r={-2}>
          <Torn w={500} h={150} fill="#fff">
            <At x={46} y={52}><SearchGlyph /></At>
            <text x="92" y="58" className="sp-label" fontSize="24" fontWeight="700" fill={C.sky}>{savedStem}</text>
            <text x="92" y="116" className="sp-tile" fontSize="48" fill={C.ink}>{savedYear}</text>
            <Ring cx={146} cy={100} rx={70} ry={36} delay={3600} dur={550} />
          </Torn>
        </At></A>
        <A anim="pop" delay={4000} dur={450} idle="1.4"><At x={690} y={360} r={10}><QMark fill={C.mustard} /></At></A>
        <A anim="drop" delay={4300} dur={500} idle="1"><At x={850} y={150}><Tangle order={order} /></At></A>
        <A anim="right" delay={3700} dur={550}><At x={960} y={560} s={0.8}><Person kind="listener" label={READERS[1][1]} /></At></A>
        <A anim="pop" delay={5000} dur={450} idle="1"><At x={1200} y={590}><Bubble text="“Image.”" size={44} fill={C.paper} color={C.ink} tail="left" /></At></A>
        <A anim="pop" delay={5900} dur={450} idle="1.4"><At x={1330} y={420} r={-10} s={0.8}><QMark fill={C.purple} /></At></A>
      </Stage>,
    },
    // 11. What happens: AI chatbots and reach
    {
      describe: `Two small paper fragments approach the AI chatbot before a clearly hypothetical answer says “${possibleAnswer}” under the label “Possible wrong answer”. A red pencil ring circles it. A separate teal reference headed “What the report actually says” reads “${coverYear} · ${sentence}”, showing why both the year and station in the possible answer are wrong. Two white copies of the possible wrong answer drift outward, away from the reference. Seven solid paths reach people; five end at an X, with a faint dashed continuation towards the people they do not reach.`,
      stage: <Stage v={10}>
        <A anim="left" dur={650} idle="0.6"><At x={330} y={160} s={0.9}><Person kind="assistant" label={READERS[3][1]} /></At></A>
        {[0, 1].map((i) => <A key={i} anim="travel" delay={2600 + i * 410} dur={660} from="360,-100">
          <At x={450 + i * 28} y={245 + i * 40} r={[-12, 9][i]} s={0.5}><PageSlip /></At>
        </A>)}
        <Label x={650} y={116} text="Possible wrong answer" size={25} fill={LAYER.tags} delay={5050} />
        <A anim="pop" delay={5650} dur={500} idle="0.8"><At x={760} y={250}><Bubble text={possibleAnswer} size={30} fill={C.paper} color={C.ink} tail="left" ring={{ delay: 7150, dur: 600 }} /></At></A>
        <Label x={735} y={352} text="What the report actually says" size={24} fill={LAYER.text} color={C.teal} delay={7950} />
        <Label x={735} y={402} text={`${coverYear} · ${sentence}`} size={30} fill={LAYER.text} delay={8450} />
        {[[1170, 120], [1200, 290]].map(([x, y], i) => <A key={i} anim="travel" delay={10200 + i * 300} dur={800} from={`${760 - x},${250 - y}`}>
          <At x={x} y={y} r={[6, -5, 4][i]} s={0.55}><Bubble text={possibleAnswer} size={32} fill={C.paper} color={C.inkSoft} tail="left" /></At>
        </A>)}
        {CROWD.map((p, i) => <A key={i} anim="pop" delay={11900 + i * 50} dur={320}><At x={p.x} y={p.y}><Mini body={p.body} skin={p.skin} /></At></A>)}
        {CROWD.map((p, i) => <Reach key={i} from={[330, 470]} to={[p.x, p.y - 14]} delay={12300 + i * 90} short={[1, 4, 6, 8, 11].includes(i)} />)}
        <Label x={430} y={620} text="Some paths stop here" size={25} fill={LAYER.tags} delay={14000} />
        <A anim="drop" delay={14800} dur={650}><At x={1000} y={640}><Crumpled text={sentence} /></At></A>
      </Stage>,
    },
    // 12. Garbage in, garbage out: missing or misleading inputs can lead to misleading answers.
    {
      describe: `A small paper strip reads “1950s · Early computing” beside the saying “Garbage in, garbage out”. Three paper scraps, “Missing description”, “Mixed-up order” and “Wrong year”, move towards a neutral AI box. A crumpled possible answer and a question mark come out, showing a possible misleading result from missing or misleading information.`,
      stage: <Stage v={11}>
        <Label x={430} y={82} text="Garbage in, garbage out" size={40} />
        <Label x={994} y={94} text="1950s · Early computing" size={30} fill={LAYER.text} delay={650} />
        <A anim="pop" delay={650} dur={600}><At x={760} y={264}>
          <Torn w={250} h={300} fill={LAYER.text}>
            <text x="125" y="64" textAnchor="middle" className="sp-tile" fontSize="52" fill={C.ink}>AI</text>
            <At x={52} y={87}><Img name="assistant" w={146} /></At>
          </Torn>
        </At></A>
        {[
          ['Missing description', LAYER.tags],
          ['Mixed-up order', LAYER.text],
          ['Wrong year', C.paper],
        ].map(([label, fill], i) => <A key={label} anim="travel" from="-360,0" delay={5850 + i * 700} dur={650}>
          <At x={344} y={266 + i * 108} r={[-3, 2, -2][i]}><Strip text={label} size={27} pad={15} fill={fill} /></At>
        </A>)}
        {[0, 1, 2].map(i => <Reach key={i} from={[652, 298 + i * 108]} to={[755, 412]} delay={7000 + i * 650} colour={C.coral} />)}
        <A anim="right" delay={8750} dur={650} idle="0.7"><At x={1120} y={404}><Crumpled text={possibleAnswer} /></At></A>
        <A anim="pop" delay={9820} dur={460} idle="0.7"><At x={1270} y={593}><QMark fill={C.mustard} /></At></A>
      </Stage>,
    },
    // 13. Repair the meaning: four concrete corrections, separated from publication extras.
    {
      describe: `Four paper repair cards show changes people can make: describe the chart as water clarity at three stations with the finding “${sentence}”, put method steps in the order 1, 2, 3, 4, join ${orphan} to its water-clarity label, and make the saved title match the ${coverYear} cover.`,
      stage: <Stage v={12}>
        <Label x={540} y={78} text="Repair the meaning" size={42} />
        <A anim="left" delay={550} dur={580}><At x={240} y={205} r={-1}>
          <Torn w={520} h={230} fill={C.paper}>
            <At x={20} y={16}><Strip text="Describe the chart" size={27} pad={14} fill={LAYER.tags} /></At>
            <text x="34" y="131" className="sp-label" fontSize="28" fill={C.ink}>Water clarity at three stations</text>
            <text x="34" y="182" className="sp-strip" fontSize="38" fontWeight="700" fill={C.purple}>{sentence}</text>
          </Torn>
        </At></A>
        <A anim="right" delay={1750} dur={580}><At x={840} y={205} r={1}>
          <Torn w={520} h={230} fill={C.paper}>
            <At x={20} y={16}><Strip text="Put steps in order" size={27} pad={14} fill={LAYER.text} /></At>
            {[1, 2, 3, 4].map((n, i) => <At key={n} x={76 + i * 124} y={78} s={0.65}><StepTag n={n} fill={STEP_COLOUR[n]} /></At>)}
          </Torn>
        </At></A>
        <A anim="left" delay={3000} dur={580}><At x={240} y={506} r={1}>
          <Torn w={520} h={230} fill={C.paper}>
            <At x={20} y={16}><Strip text="Keep number + label" size={27} pad={14} fill={LAYER.tags} /></At>
            <text x="28" y="149" className="sp-tile" fontSize="48" fill={C.coral}>{orphan}</text>
            <path d="M213 132 H244" stroke={C.inkSoft} strokeWidth="4" strokeLinecap="round" />
            <text x="254" y="125" className="sp-label" fontSize="25" fill={C.ink}>rise in water</text>
            <text x="254" y="157" className="sp-label" fontSize="25" fill={C.ink}>clarity</text>
          </Torn>
        </At></A>
        <A anim="right" delay={4250} dur={580}><At x={840} y={506} r={-1}>
          <Torn w={520} h={230} fill={C.paper}>
            <At x={20} y={16}><Strip text="Match the saved title" size={27} pad={14} fill={LAYER.text} /></At>
            <text x="28" y="131" className="sp-label" fontSize="30" fill={C.ink}>Cover: {coverYear}</text>
            <text x="28" y="183" className="sp-label" fontSize="30" fill={C.ink}>Saved title: {coverYear}</text>
          </Torn>
        </At></A>
      </Stage>,
    },
    // 14. A passport for wider reach, after the repairs.
    {
      describe: `An open paper passport carries four optional stamps: “Data” with a chart-data slip on wide screens, showing rows ${rows.map(row => row.join(' ')).join(', ')} from ${csvName}; “Clear summary”; “Links” for “Map 2” to the annex; and “Bookmarks” for ${data.travel.bookmarks.length} sections. The intact “${sentence}” slip and dotted paths towards people echo the opening. They show potential reach, not guaranteed search placement or AI accuracy.`,
      stage: <Stage v={13}>
        <A anim="pop" delay={480} dur={650}><At x={535} y={206}>
          <Img name="passport" w={620} />
          <rect x="44" y="38" width="532" height="380" filter="url(#sp-grain)" opacity="0.26" />
          <text x="174" y="76" textAnchor="middle" className="sp-label" fontSize="20" fill={C.purple} letterSpacing="3">FINDINGS PASSPORT</text>
          <text x="485" y="76" textAnchor="middle" className="sp-label" fontSize="20" fill={C.purple} letterSpacing="3">{coverYear}</text>
        </At></A>
        <A anim="left" delay={1750} dur={550} className="sp-wide"><At x={210} y={310} r={-5} s={0.86}>
          <Torn w={240} h={258} fill={C.paper}>
            <rect width="240" height="42" fill={C.teal} />
            <text x="14" y="29" className="sp-label" fontSize="22" fontWeight="700" fill="#fff">Chart data</text>
            {rows.map((row, i) => <text key={row[0]} x="19" y={94 + i * 47} className="sp-mono" fontSize="25" fill={C.ink}>{row.join('  ')}</text>)}
          </Torn>
        </At></A>
        {[
          ['DATA', 'chart values', C.teal, 700, 419, -8],
          ['CLEAR SUMMARY', 'for reuse', C.purple, 704, 565, 5],
          ['LINKS', '“Map 2” → annex', C.sky, 990, 424, 5],
          ['BOOKMARKS', `${data.travel.bookmarks.length} sections`, C.coral, 992, 570, -5],
        ].map(([title, sub, colour, x, y, r], i) =>
          <A key={title} anim="slap" delay={[2400, 4200, 6100, 7800][i]} dur={400}><At x={x} y={y} r={r}><Stamp text={title} sub={sub} color={colour} w={title.length > 10 ? 268 : 218} /></At></A>)}
        {[1, 3, 5, 7, 9, 11].map((index, i) => <A key={index} anim="pop" delay={8650 + i * 100} dur={320}>
          <At x={CROWD[index].x} y={CROWD[index].y}><Mini body={CROWD[index].body} skin={CROWD[index].skin} /></At>
        </A>)}
        {[1, 3, 5, 7, 9, 11].map((index, i) => <Reach key={index} from={[847, 660]} to={[CROWD[index].x, CROWD[index].y - 18]} delay={9050 + i * 140} />)}
        <A anim="pop" delay={8700} dur={500} idle="0.5"><At x={1160} y={150}><Bubble text={`${coverYear} · ${sentence}`} size={27} /></At></A>
      </Stage>,
    },
    // 15. Check your own PDF
    {
      describe: `A paper laptop shows a torn-out screenshot of the real tool's result for the scrambled sample: “${data.scrambled.headline}”, listing ${data.scrambled.pins.map(pin => `${pin.number}. ${pin.title} (${pin.bucket === 'fix' ? 'fix' : 'check'})`).join('; ')}. Paper pins with the same numbers drop onto a page beside it. Torn strips below read “Your PDF stays on your device” and “PreventionWeb.net/signal-check”.`,
      stage: <Stage v={14}>
        {'CHECK'.split('').map((ch, i) => <A key={i} anim="drop" delay={i * 110} dur={500} idle="0.8"><At x={590 + i * 96} y={34 + (i % 2) * 10} r={[-4, 3, -2, 5, -3][i]}><Tile ch={ch} size={100} fill={TILE_COLOURS[(i + 1) % TILE_COLOURS.length]} /></At></A>)}
        <A anim="left" delay={500} dur={650} className="sp-wide"><At x={150} y={300} r={-5}>
          <g filter="url(#sp-piece)"><rect width="210" height="290" rx="4" fill={C.paper} /></g>
          {[0, 1, 2, 3, 4].map(k => <rect key={k} x="20" y={34 + k * 22} width={[160, 140, 170, 120, 150][k]} height="10" rx="5" fill="#e3d7c2" />)}
          <rect x="20" y="160" width="170" height="100" fill="#d8e9ef" />
        </At></A>
        {allPins.map((pin, i) => <A key={pin.number} anim="drop" delay={3300 + i * 300} dur={460} className="sp-wide">
          <At x={[255, 205, 330, 300, 190][i]} y={[480, 360, 340, 420, 540][i]}><Pin number={pin.number} fix={pin.bucket === 'fix'} /></At>
        </A>)}
        <A anim="rise" delay={400} dur={700}><At x={420} y={165}><Img name="laptop" w={760} /></At></A>
        {/* The result, torn out and pasted over the laptop screen: all five rows where there is room… */}
        <A anim="slap" delay={1000} dur={450} className="sp-wide"><At x={512} y={196} r={-1.5}><ResultSheet headline={data.scrambled.headline} rows={allPins} /></At></A>
        {/* …and on narrow screens two rows and an honest count of the rest. */}
        <A anim="slap" delay={1000} dur={450} className="sp-narrow"><At x={512} y={196} r={-1.5}><ResultSheet headline={data.scrambled.headline} rows={allPins.slice(0, 2)} more={allPins.length - 2} /></At></A>
        <A anim="slap" delay={6200} dur={450} idle="0.8"><At x={800} y={785} r={-1}><Strip text="Your PDF stays on your device" size={24} pad={14} fill={C.ink} color="#fff" center /></At></A>
        <A anim="slap" delay={6900} dur={450}><At x={800} y={839} r={1}><Strip text="PreventionWeb.net/signal-check" size={31} pad={16} fill={C.teal} color="#fff" center /></At></A>
      </Stage>,
    },
  ];
  const visualIds = ['says-it', 'readers', 'machines', 'picture', 'layers', 'no-description',
    'order', 'lonely-number', 'wrong-title', 'search-and-listening', 'chatbots-and-reach',
    'garbage-in-garbage-out', 'repair', 'passport', 'check'];
  if (visuals.length !== visualIds.length) throw new Error(`story has ${visuals.length} visuals but ${visualIds.length} assigned IDs`);
  const byId = new Map(visualIds.map((id, i) => [id, visuals[i]]));
  return words.map((item) => {
    if (item.isChapterCard) return {
      ...item,
      describe: `Chapter ${item.chapter.number}: “${item.chapter.title}”. A large paper title, numbered tab and small chart sit on an open report page.`,
      stage: <ChapterCard number={item.chapter.number} title={item.chapter.title} />,
    };
    const visual = byId.get(item.id);
    if (!visual) throw new Error(`No visual for story scene ${item.id}`);
    return { ...item, ...visual };
  });
}
