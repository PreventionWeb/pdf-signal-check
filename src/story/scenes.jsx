import React from 'react';
import { finding, stepNumber, storyScript, yearOf } from './script.js';
import { A, At, Backdrop, Bubble, C, Chart, Cover, Img, NoSign, Person, QMark, Sheet, Stamp, StepTag, Strip, Tick, Tile, TILE_COLOURS, Torn, Warning } from './art.jsx';

/*
 * Eight scenes for "Your report says it. Does everyone understand it?". Text values on stage come from
 * snapshot.json (real engine output on the synthetic samples). Static markup is each scene's composed final
 * frame; <A anim> marks how a piece enters, timed to the narration. Pieces with className "sp-wide" are extras
 * that drop out on narrow screens, where only the central 4:3 of the stage shows.
 */

const stepWord = text => text.replace(/^\d[.)]\s*/, '').split(' ')[0];

// The three hidden layers, as coloured paper, recur across scenes.
const LAYER = { see: C.paper, text: '#cfe9f7', tags: '#fbe3a6' };
const STEP_COLOUR = { 1: C.teal, 2: C.sky, 3: C.coral, 4: C.purple };

const Stage = ({ children }) => <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><Backdrop />{children}</svg>;
const Label = ({ x, y, text, fill = C.paper, size = 34, ...anim }) => <A anim="drop" {...anim}><At x={x} y={y}><Strip text={text} fill={fill} size={size} pad={16} /></At></A>;
/** A paper map pin with its number. */
const Pin = ({ number, fix }) => <g>
  <g filter="url(#sp-scissor)"><path d="M0 0 C-24 -24 -24 -54 0 -54 C24 -54 24 -24 0 0 Z" fill={fix ? C.red : C.mustard} /></g>
  <text y="-26" textAnchor="middle" className="sp-label" fontSize="24" fontWeight="700" fill={fix ? '#fff' : C.ink}>{number}</text>
</g>;

export function scenes(data) {
  const words = storyScript(data);
  const sentence = finding(data);
  const cover = data.travel.title, saved = data.partly.savedTitle;
  const coverYear = yearOf(cover), savedYear = yearOf(saved);
  const hiddenOrder = data.partly.tagSteps;
  const drawn = data.scrambled.drawnLines;
  const orphan = drawn.at(-1);
  const beforeOrphan = drawn.slice(-3, -1);
  const [, ...rows] = data.travel.csvRows;
  const csvName = data.travel.attachments.find(file => /\.csv$/.test(file.name))?.name || 'data.csv';
  // The cameo shows the headline and two of the real pins: the fix, and the detached number from scene 6.
  const pins = [data.scrambled.pins[0], data.scrambled.pins.find(pin => pin.title.includes(orphan)) || data.scrambled.pins[1]];
  const labels = data.well.chartLabels;
  const values = labels.filter(text => /m$/.test(text)), names = labels.filter(text => !/m$/.test(text));
  const figures = [['reader', 'Reading'], ['listener', 'Screen reader'], ['assistant', 'AI assistant']];

  const visuals = [
    {
      describe: `The cover of the fictional “${cover}” drops onto a sheet of cream paper. Torn paper tiles spell out “Your report says it. Does EVERYONE understand it?”, with paper question marks around them.`,
      stage: <Stage>
        <A anim="drop" dur={800} idle="1"><At x={278} y={240} r={-6}><Cover year={coverYear} /></At></A>
        <A anim="slap" delay={500} dur={500}><At x={620} y={150} r={-1.5}><Strip text="Your report says it." size={56} /></At></A>
        <A anim="slap" delay={1100} dur={450}><At x={620} y={300} r={1.5}><Strip text="Does" size={56} fill={C.ink} color="#fff" /></At></A>
        {'EVERYONE'.split('').map((ch, i) =>
          <A key={i} anim="drop" delay={1450 + i * 110} dur={520} idle="0.8"><At x={612 + i * 98} y={420 + (i % 2) * 14} r={[-5, 4, -2, 6, -4, 3, -6, 2][i]}><Tile ch={ch} size={112} fill={TILE_COLOURS[i % TILE_COLOURS.length]} /></At></A>)}
        <A anim="slap" delay={2500} dur={450}><At x={760} y={610} r={-1}><Strip text="understand it?" size={56} /></At></A>
        <A anim="pop" delay={2500} dur={500} idle="1.4"><At x={1330} y={230} r={14}><QMark /></At></A>
        <A anim="pop" delay={2600} dur={500} idle="1.4" className="sp-wide"><At x={520} y={170} r={-16} s={0.75}><QMark fill={C.sky} /></At></A>
        <A anim="pop" delay={2700} dur={500} idle="1.4"><At x={1290} y={720} r={8} s={0.85}><QMark fill={C.coral} /></At></A>
      </Stage>,
    },
    {
      describe: `A paper bar chart of water visibility at three stations: ${values.map((v, i) => `${names[i]} ${v}`).join(', ')}. A speech bubble saying “${sentence}” lifts off the tallest bar and travels to three cut-paper figures in turn: a person reading, a person using a screen reader with headphones, and an AI assistant chat bubble. Each one gets a tick as the finding reaches them.`,
      stage: <Stage>
        <A anim="drop" dur={650}><At x={214} y={440} s={0.96}><Chart labels={labels} /></At></A>
        {figures.map(([kind, label], i) =>
          <A key={kind} anim="right" delay={600 + i * 180} dur={650} idle="0.7"><At x={770 + i * 235} y={440}><Person kind={kind} label={label} /></At></A>)}
        {/* One bubble: it appears over the tallest bar, then visits each figure in turn and stays with the last. */}
        <A anim="tour" delay={1600} dur={5200} idle="1" data-tour={`${460 - 1225},40;${460 - 1225},40;${770 - 1225},0;${1005 - 1225},0`}>
          <At x={1225} y={330}><Bubble text={sentence} size={34} /></At>
        </A>
        {[0, 1, 2].map(i => <A key={i} anim="pop" delay={3500 + i * 1300} dur={420}><At x={850 + i * 235} y={600}><Tick r={30} /></At></A>)}
      </Stage>,
    },
    {
      describe: 'The report page lifts and fans out into three stacked sheets of paper. The top sheet, white, is “What people see”. The middle sheet, light blue, is “Text tools pull out”, shown as lines of plain text. The bottom sheet, yellow, is “Tags screen readers follow”, shown as numbered tags on a string.',
      stage: <Stage>
        {[
          ['Tags screen readers follow', LAYER.tags, 380, 560, '-140,-360', <g>
            <path d="M40 74 Q250 102 470 72" stroke={C.ink} strokeWidth="4" fill="none" />
            {[1, 2, 3, 4].map((n, i) => <At key={n} x={90 + i * 110} y={76 + (i === 1 || i === 2 ? 8 : 2)} s={0.58}><StepTag n={n} fill={STEP_COLOUR[n]} /></At>)}
          </g>],
          ['Text tools pull out', LAYER.text, 310, 380, '-70,-180', <g className="sp-mono" fontSize="24" fill={C.ink}>
            <text x="36" y="84">Annual Report {coverYear}</text>
            <text x="36" y="124">Mean water visibility</text>
            <text x="36" y="164">{labels.slice(0, 4).join('  ')} …</text>
          </g>],
          ['What people see', LAYER.see, 240, 200, null, <g>
            <rect x="24" y="22" width="452" height="34" fill={C.teal} />
            <path d="M24 46 C140 34 300 64 476 44 V58 H24 Z" fill={C.purple} />
            {[0, 1, 2].map(i => <rect key={i} x={40 + i * 46} y={180 - (i + 2) * 22} width="34" height={(i + 2) * 22} fill={[C.sky, C.teal, C.coral][i]} />)}
            <text x="210" y="104" className="sp-tile" fontSize="28" fill={C.ink}>Annual Report {coverYear}</text>
            {[0, 1, 2].map(i => <rect key={i} x="210" y={126 + i * 20} width={[240, 200, 220][i]} height="10" rx="5" fill="#e3d7c2" />)}
          </g>],
        ].map(([label, fill, x, y, from, art], i) =>
          <A key={label} anim={from ? 'travel' : 'drop'} from={from} delay={from ? 900 + (2 - i) * 500 : 200} dur={from ? 900 : 700} idle="0.6">
            <At x={x} y={y} r={[1.5, -1, 0.5][i]}><Sheet w={500} h={210} fill={fill} label={label}>{art}</Sheet></At>
          </A>)}
        <A anim="pop" delay={2600} dur={500} idle="1.2"><At x={1320} y={175} r={10} s={0.85}><QMark fill={C.teal} /></At></A>
      </Stage>,
    },
    {
      describe: `Left: the chart as people see it, with the bubble “${sentence}”. Right: the tags that screen readers follow, where the chart is only an empty dashed frame with a question mark, and its description is blank, marked with a red no sign. Below, the screen reader user hears only “Image.”`,
      stage: <Stage>
        <Label x={200} y={70} text="What people see" />
        <A anim="drop" delay={200} dur={600}><At x={200} y={230} s={0.9}><Chart labels={labels} animate={false} /></At></A>
        <A anim="pop" delay={600} dur={500} idle="1"><At x={398} y={200}><Bubble text={sentence} size={34} /></At></A>
        <Label x={760} y={70} text="Tags screen readers follow" fill={LAYER.tags} delay={700} />
        <A anim="right" delay={900} dur={650}><At x={760} y={180}><Sheet w={600} h={380} fill={LAYER.tags}>
          <rect x="40" y="40" width="330" height="290" rx="8" fill="none" stroke={C.inkSoft} strokeWidth="5" strokeDasharray="16 12" />
          <text x="400" y="104" className="sp-label" fontSize="30" fill={C.ink}>Description:</text>
          <path d="M400 156 H570" stroke={C.inkSoft} strokeWidth="4" strokeDasharray="10 8" />
          <text x="400" y="210" className="sp-label" fontSize="26" fill={C.inkSoft}>(none saved)</text>
        </Sheet></At></A>
        <A anim="pop" delay={1400} dur={500} idle="1"><At x={965} y={365} s={1.3}><QMark fill={C.mustard} /></At></A>
        <A anim="slap" delay={2000} dur={450}><At x={1280} y={480}><NoSign r={66} /></At></A>
        <A anim="left" delay={3000} dur={650}><At x={330} y={630} s={0.74}><Person kind="listener" label="Screen reader" /></At></A>
        <A anim="pop" delay={3900} dur={500} idle="1"><At x={610} y={665}><Bubble text="“Image.”" size={44} fill={C.paper} color={C.ink} tail="left" /></At></A>
      </Stage>,
    },
    {
      describe: `Left: the page people see, with steps 1 and 2 in the left column and 3 and 4 in the right. Right: the step tags peel off the page and hang on a string in the order the hidden tags give them: ${hiddenOrder.join('; ')}. The screen reader user hears “${hiddenOrder.map(stepNumber).join(', ')}”, and a warning triangle drops beside them.`,
      stage: <Stage>
        <Label x={210} y={70} text="What people see" />
        <A anim="drop" dur={650}><At x={210} y={200} r={-2}><g filter="url(#sp-piece)"><rect width="440" height="560" rx="6" fill={C.paper} /></g>
          <rect x="30" y="30" width="380" height="18" rx="9" fill="#e3d7c2" />
          {[1, 2, 3, 4].map(n => <At key={n} x={36 + (n > 2 ? 200 : 0)} y={110 + ((n - 1) % 2) * 190}>
            <circle cx="30" cy="30" r="30" fill={STEP_COLOUR[n]} /><text x="30" y="42" textAnchor="middle" className="sp-tile" fontSize="36" fill="#fff">{n}</text>
            {[0, 1, 2, 3].map(k => <rect key={k} x="0" y={78 + k * 22} width={[160, 140, 150, 110][k]} height="10" rx="5" fill="#e3d7c2" />)}
          </At>)}
        </At></A>
        <Label x={720} y={70} text="Tags screen readers follow" fill={LAYER.tags} delay={400} />
        <A anim="fade" delay={700} dur={400}><path d="M720 230 Q1050 280 1390 226" stroke={C.ink} strokeWidth="5" fill="none" strokeLinecap="round" /></A>
        {hiddenOrder.map((step, i) => {
          const n = Number(stepNumber(step)), x = 800 + i * 170, y = 242 + (i === 1 || i === 2 ? 14 : 4);
          const home = (n > 2 ? 476 : 276) - x, homeY = (n % 2 ? 300 : 490) - y;
          return <A key={step} anim="travel" from={`${home},${homeY}`} delay={1300 + i * 600} dur={800} idle="1.6">
            <At x={x} y={y}><StepTag n={n} fill={STEP_COLOUR[n]} label={stepWord(step)} /></At>
          </A>;
        })}
        <path d="M790 470 C900 510 1180 510 1320 470" stroke={C.red} strokeWidth="5" fill="none" strokeDasharray="1" pathLength="1" data-anim="draw" data-delay="3800" data-dur="700" />
        <A anim="fade" delay={4400} dur={300}><g>
          <path d="M1300 454 L1324 468 L1302 488" stroke={C.red} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="1055" y="550" textAnchor="middle" className="sp-label" fontSize="32" fill={C.ink}>Read in this order</text>
        </g></A>
        <A anim="left" delay={2900} dur={600}><At x={820} y={630} s={0.6}><Person kind="listener" label="Screen reader" /></At></A>
        <A anim="pop" delay={3300} dur={500} idle="1"><At x={1080} y={650}><Bubble text={`“${hiddenOrder.map(stepNumber).join(', ')} …”`} size={34} fill={C.paper} color={C.ink} tail="left" /></At></A>
        <A anim="drop" delay={4600} dur={550} idle="1.2"><At x={1320} y={700}><Warning s={0.85} /></At></A>
      </Stage>,
    },
    {
      describe: `Lines of text as a tool pulls them out, in drawing order: “${beforeOrphan.join('”, “')}”. Then, on its own and much bigger, “${orphan}” drops away from its sentence, with a question mark. Later a folder labelled “Saved in the file” slides in: its title says “${saved}”, with ${savedYear} circled in red, while the small cover beside it says ${coverYear}.`,
      stage: <Stage>
        <Label x={200} y={70} text="Text tools pull out" fill={LAYER.text} />
        {beforeOrphan.map((line, i) => <A key={line} anim="left" delay={300 + i * 300} dur={600}>
          <At x={200} y={170 + i * 90} r={[-1, 1][i]}><Strip text={line.length > 40 ? `${line.slice(0, 39)}…` : line} size={26} pad={14} fill={LAYER.text} cls="sp-mono" bold={false} width={640} /></At>
        </A>)}
        <A anim="fade" delay={2200} dur={300}><path d="M400 312 C360 350 370 380 430 400" stroke={C.inkSoft} strokeWidth="4" strokeDasharray="8 8" fill="none" /></A>
        <A anim="drop" delay={2400} dur={800} idle="1.2"><At x={440} y={380} r={-6}><Torn w={440} h={200} fill={C.coral}><text x="220" y="146" textAnchor="middle" className="sp-tile" fontSize="132" fill="#fff">{orphan}</text></Torn></At></A>
        <A anim="pop" delay={3400} dur={500} idle="1.5"><At x={950} y={400} r={12} s={1.2}><QMark fill={C.mustard} /></At></A>
        <A anim="drop" delay={6400} dur={600} idle="0.6"><At x={1200} y={130} r={5} s={0.42}><Cover year={coverYear} /></At></A>
        <A anim="slap" delay={6700} dur={400} className="sp-wide"><At x={1200} y={95} r={-4}><Strip text="Cover" size={26} pad={12} /></At></A>
        <A anim="right" delay={6900} dur={650}><At x={990} y={560} r={-2}>
          <Img name="folder" w={400} />
          <text x="34" y="110" className="sp-label" fontSize="22" fill={C.ink}>Saved in the file</text>
          <text x="34" y="160" className="sp-label" fontSize="24" fontWeight="700" fill={C.ink}>{saved.replace(/\s*\S+$/, '')}</text>
          <text x="34" y="250" className="sp-tile" fontSize="72" fill={C.ink}>{savedYear}</text>
          <ellipse cx="104" cy="226" rx="104" ry="54" fill="none" stroke={C.red} strokeWidth="6" pathLength="1" strokeDasharray="1" data-anim="draw" data-delay="8700" data-dur="700" transform="rotate(-6 104 226)" />
        </At></A>
      </Stage>,
    },
    {
      describe: `An open paper passport. Four stamps land on its pages: “Data” (the attached file ${csvName}, with rows ${rows.map(row => row.join(' ')).join(', ')}), “schema.org” (a description search engines understand), “Links” (“Map 2” leads to the annex) and “Bookmarks” (${data.travel.bookmarks.length} sections). The person reading, the screen reader user and the AI assistant each get a tick.`,
      stage: <Stage>
        <A anim="pop" dur={700}><At x={480} y={190}>
          <Img name="passport" w={640} />
          <text x="179" y="78" textAnchor="middle" className="sp-label" fontSize="20" fill={C.purple} letterSpacing="3">FINDINGS PASSPORT</text>
          <text x="500" y="78" textAnchor="middle" className="sp-label" fontSize="20" fill={C.purple} letterSpacing="3">{coverYear}</text>
        </At></A>
        {[['DATA', 'CSV attached', C.teal, 659, 400, -8], ['SCHEMA.ORG', 'described for search', C.purple, 659, 562, 6], ['LINKS', '“Map 2” → annex', C.sky, 962, 405, 5], ['BOOKMARKS', `${data.travel.bookmarks.length} sections`, C.coral, 958, 562, -5]].map(([text, sub, colour, x, y, r], i) =>
          <A key={text} anim="slap" delay={1300 + i * 600} dur={380}><At x={x} y={y} r={r}><Stamp text={text} sub={sub} color={colour} w={text.length > 6 ? 250 : 220} /></At></A>)}
        <A anim="left" delay={700} dur={650} idle="0.8"><At x={238} y={300} r={-7}>
          <g filter="url(#sp-piece)"><rect width="250" height="300" rx="4" fill="#fff" /></g>
          <rect x="0" y="0" width="250" height="44" fill={C.teal} />
          <text x="18" y="30" className="sp-label" fontSize="22" fill="#fff" fontWeight="700">{csvName.replace(/^harbor-observatory-2025-/, '')}</text>
          {rows.map((row, i) => <text key={row[0]} x="22" y={96 + i * 52} className="sp-mono" fontSize="28" fill={C.ink}>{row.join(',')}</text>)}
          {/* paper clip on the bottom edge, clear of the file name */}
          <path d="M206 330 V262 Q206 244 188 244 Q170 244 170 262 V318" stroke="#8c8c9c" strokeWidth="6" fill="none" strokeLinecap="round" />
        </At></A>
        {figures.map(([kind, label], i) => <A key={kind} anim="right" delay={4200 + i * 250} dur={550}>
          <At x={1250} y={170 + i * 230} s={0.55}><Person kind={kind} label={label} /></At>
          <At x={1360} y={230 + i * 230}><Tick r={24} /></At>
        </A>)}
      </Stage>,
    },
    {
      describe: `A torn-out screenshot of the real tool's result for the scrambled sample: “${data.scrambled.headline}”, with ${pins.map(pin => `${pin.number}. ${pin.title} (${pin.bucket === 'fix' ? 'fix' : 'check'})`).join(' and ')}. Paper pins with the same numbers drop onto a page beside it. A paper laptop sits next to a torn strip: “Your PDF stays on your device”.`,
      stage: <Stage>
        {'CHECK'.split('').map((ch, i) => <A key={i} anim="drop" delay={i * 110} dur={500} idle="0.8"><At x={590 + i * 96} y={46 + (i % 2) * 10} r={[-4, 3, -2, 5, -3][i]}><Tile ch={ch} size={100} fill={TILE_COLOURS[(i + 1) % TILE_COLOURS.length]} /></At></A>)}
        <A anim="left" delay={500} dur={650} className="sp-wide"><At x={220} y={270} r={-5}>
          <g filter="url(#sp-piece)"><rect width="240" height="320" rx="4" fill={C.paper} /></g>
          {[0, 1, 2, 3, 4].map(k => <rect key={k} x="24" y={40 + k * 24} width={[180, 160, 190, 140, 170][k]} height="10" rx="5" fill="#e3d7c2" />)}
          <rect x="24" y="180" width="190" height="110" fill="#d8e9ef" />
        </At></A>
        {pins.map((pin, i) => <A key={pin.number} anim="drop" delay={1700 + i * 500} dur={480} className="sp-wide">
          <At x={[330, 420][i]} y={[480, 360][i]}><Pin number={pin.number} fix={pin.bucket === 'fix'} /></At>
        </A>)}
        <A anim="rise" delay={700} dur={700} idle="0.5"><At x={530} y={240} r={-2}>
          <Torn w={660} h={300} fill="#fff">
            <rect width="660" height="48" fill={C.teal} />
            <text x="24" y="33" className="sp-label" fontSize="24" fill="#fff" fontWeight="700">PDF Signal Check</text>
            <text x="28" y="112" className="sp-strip" fontSize="40" fontWeight="700" fill={C.ink}>{data.scrambled.headline}</text>
            {pins.map((pin, i) => <g key={pin.number}>
              <circle cx="52" cy={176 + i * 66} r="22" fill={pin.bucket === 'fix' ? C.red : C.mustard} />
              <text x="52" y={185 + i * 66} textAnchor="middle" className="sp-label" fontSize="24" fontWeight="700" fill={pin.bucket === 'fix' ? '#fff' : C.ink}>{pin.number}</text>
              <text x="90" y={185 + i * 66} className="sp-label" fontSize="27" fill={C.ink}>{pin.title.length > 40 ? `${pin.title.slice(0, 39)}…` : pin.title}</text>
              <text x="636" y={185 + i * 66} textAnchor="end" className="sp-label" fontSize="20" fill={C.inkSoft}>{pin.bucket === 'fix' ? 'Fix' : 'Check'}</text>
            </g>)}
          </Torn>
        </At></A>
        <A anim="left" delay={2900} dur={600}><At x={360} y={640}><Img name="laptop" w={220} /></At></A>
        <A anim="slap" delay={3300} dur={450} idle="0.8"><At x={610} y={710} r={-1.5}><Strip text="Your PDF stays on your device" size={36} pad={18} fill={C.ink} color="#fff" /></At></A>
      </Stage>,
    },
  ];
  return words.map((item, i) => ({ ...item, ...visuals[i] }));
}
