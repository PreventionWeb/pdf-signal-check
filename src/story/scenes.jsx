import React from 'react';
import { finding, stepNumber, storyScript, yearOf } from './script.js';
import { A, At, Backdrop, Bubble, C, Chart, Cover, Laptop, NoSign, Person, QMark, Sheet, Stamp, StepTag, Strip, Tick, Tile, TILE_COLOURS, Torn, Warning, stripWidth } from './art.jsx';

/*
 * Eight scenes for "Your report says it. Does everyone understand it?". Text values on stage come from
 * snapshot.json (real engine output on the synthetic samples). Static markup is each scene's composed final
 * frame; <A anim> marks how a piece enters. Captions use [word|colour] for coloured key words.
 */

const stepWord = text => text.replace(/^\d[.)]\s*/, '').split(' ')[0];

// The three hidden layers, as coloured paper, recur across scenes.
const LAYER = { see: C.paper, text: '#cfe9f7', tags: '#fbe3a6' };
const STEP_COLOUR = { 1: C.teal, 2: C.sky, 3: C.coral, 4: C.purple };

const Stage = ({ children }) => <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><Backdrop />{children}</svg>;
const Label = ({ x, y, text, fill = C.paper, size = 34, ...anim }) => <A anim="drop" {...anim}><At x={x} y={y}><Strip text={text} fill={fill} size={size} pad={16} /></At></A>;

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
  const pins = data.scrambled.pins.slice(0, 4);
  const labels = data.well.chartLabels;
  const values = labels.filter(text => /m$/.test(text)), names = labels.filter(text => !/m$/.test(text));

  const visuals = [
    {
      describe: `The cover of the fictional “${cover}” drops onto a sheet of cream paper. Torn paper tiles spell out “Your report says it. Does EVERYONE understand it?”, with paper question marks around them.`,
      stage: <Stage>
        <A anim="drop" dur={800} idle="1"><At x={250} y={240} r={-6}><Cover year={coverYear} /></At></A>
        <A anim="slap" delay={500} dur={500}><At x={620} y={150} r={-1.5}><Strip text="Your report says it." size={56} /></At></A>
        <A anim="slap" delay={1100} dur={450}><At x={620} y={300} r={1.5}><Strip text="Does" size={56} fill={C.ink} color="#fff" /></At></A>
        {'EVERYONE'.split('').map((ch, i) =>
          <A key={i} anim="drop" delay={1450 + i * 110} dur={520} idle="0.8"><At x={612 + i * 98} y={420 + (i % 2) * 14} r={[-5, 4, -2, 6, -4, 3, -6, 2][i]}><Tile ch={ch} size={112} fill={TILE_COLOURS[i % TILE_COLOURS.length]} /></At></A>)}
        <A anim="slap" delay={2500} dur={450}><At x={760} y={610} r={-1}><Strip text="understand it?" size={56} /></At></A>
        <A anim="pop" delay={2500} dur={500} idle="1.4"><At x={1360} y={230} r={14}><QMark /></At></A>
        <A anim="pop" delay={2600} dur={500} idle="1.4"><At x={520} y={180} r={-16} s={0.7}><QMark fill={C.sky} /></At></A>
        <A anim="pop" delay={2700} dur={500} idle="1.4"><At x={1300} y={720} r={8} s={0.8}><QMark fill={C.coral} /></At></A>
      </Stage>,
    },
    {
      describe: `A paper bar chart of water visibility at three stations: ${values.map((v, i) => `${names[i]} ${v}`).join(', ')}. A speech bubble saying “${sentence}” lifts off the tallest bar, and copies fly to three cut-paper figures: a person reading, a person using a screen reader with headphones, and an AI assistant chat bubble. Each gets a tick.`,
      stage: <Stage>
        <A anim="drop" dur={650}><At x={190} y={440} s={1.05}><Chart labels={labels} /></At></A>
        <A anim="pop" delay={1000} dur={600} idle="1"><At x={500} y={358}><Bubble text={sentence} size={42} /></At></A>
        {[['reader', 'Reading'], ['listener', 'Screen reader'], ['assistant', 'AI assistant']].map(([kind, label], i) =>
          <A key={kind} anim="right" delay={1500 + i * 180} dur={650} idle="0.7"><At x={820 + i * 220} y={440}><Person kind={kind} label={label} /></At></A>)}
        {[0, 1, 2].map(i => <A key={i} anim="travel" delay={2500 + i * 260} dur={900} from={`${-320 - i * 220},${i === 1 ? 140 : 70}`}>
          <At x={820 + i * 220} y={i === 1 ? 230 : 302}><Bubble text={sentence} size={24} /></At>
        </A>)}
        {[0, 1, 2].map(i => <A key={i} anim="pop" delay={3400 + i * 200} dur={420}><At x={900 + i * 220} y={570}><Tick r={28} /></At></A>)}
      </Stage>,
    },
    {
      describe: 'The report page lifts and fans out into three stacked sheets of paper. The top sheet, white, is “What people see”. The middle sheet, light blue, is “Text tools pull out”, shown as lines of plain text. The bottom sheet, yellow, is “Tags screen readers follow”, shown as numbered tags on a string.',
      stage: <Stage>
        {[
          ['Tags screen readers follow', LAYER.tags, 380, 640, '-120,-490', <g>
            <path d="M40 42 Q250 70 470 40" stroke={C.ink} strokeWidth="4" fill="none" />
            {[1, 2, 3, 4].map((n, i) => <At key={n} x={90 + i * 110} y={44 + (i === 1 || i === 2 ? 8 : 2)} s={0.58}><StepTag n={n} fill={STEP_COLOUR[n]} /></At>)}
          </g>],
          ['Text tools pull out', LAYER.text, 320, 395, '-60,-245', <g className="sp-mono" fontSize="24" fill={C.ink}>
            <text x="36" y="52">Annual Report {coverYear}</text>
            <text x="36" y="92">Mean water visibility</text>
            <text x="36" y="132">{labels.slice(0, 4).join('  ')} …</text>
          </g>],
          ['What people see', LAYER.see, 260, 150, null, <g>
            <rect x="24" y="22" width="452" height="34" fill={C.teal} />
            <path d="M24 46 C140 34 300 64 476 44 V58 H24 Z" fill={C.purple} />
            {[0, 1, 2].map(i => <rect key={i} x={40 + i * 46} y={142 - (i + 2) * 14} width="34" height={(i + 2) * 14} fill={[C.sky, C.teal, C.coral][i]} />)}
            {[0, 1, 2].map(i => <rect key={i} x="210" y={84 + i * 22} width={[240, 200, 220][i]} height="10" rx="5" fill="#e3d7c2" />)}
          </g>],
        ].map(([label, fill, x, y, from, art], i) =>
          <A key={label} anim={from ? 'travel' : 'drop'} from={from} delay={from ? 900 + (2 - i) * 500 : 200} dur={from ? 900 : 700} idle="0.6">
            <At x={x} y={y} r={[1.5, -1, 0.5][i]}><Sheet w={500} h={170} fill={fill} label={label}>{art}</Sheet></At>
          </A>)}
        <A anim="pop" delay={2600} dur={500} idle="1.2"><At x={1420} y={150} r={10} s={0.8}><QMark fill={C.teal} /></At></A>
      </Stage>,
    },
    {
      describe: `Left: the chart as people see it, with the bubble “${sentence}”. Right: the tags that screen readers follow, where the chart is an empty dashed frame and its “Description” line is blank, marked with a red no sign. All that text tools pull out are loose labels, which tumble out: ${labels.join(', ')}. The screen reader user’s bubble says only “Image.” The AI assistant’s bubble holds the loose numbers and a question mark.`,
      stage: <Stage>
        <Label x={210} y={70} text="What people see" />
        <A anim="drop" dur={600}><At x={200} y={200} s={0.84}><Chart labels={labels} animate={false} /></At></A>
        <A anim="pop" delay={300} dur={500} idle="1"><At x={390} y={178}><Bubble text={sentence} size={32} /></At></A>
        <Label x={690} y={70} text="Tags screen readers follow" fill={LAYER.tags} delay={500} />
        <A anim="right" delay={700} dur={650}><At x={690} y={180}><Sheet w={560} h={250} fill={LAYER.tags}>
          <rect x="30" y="34" width="220" height="180" rx="6" fill="none" stroke={C.inkSoft} strokeWidth="4" strokeDasharray="14 10" />
          <text x="290" y="80" className="sp-label" fontSize="32" fill={C.ink}>Description:</text>
          <path d="M290 132 H520" stroke={C.inkSoft} strokeWidth="4" strokeDasharray="10 8" />
          <text x="290" y="190" className="sp-label" fontSize="26" fill={C.inkSoft}>(none saved)</text>
        </Sheet></At></A>
        <A anim="pop" delay={1300} dur={500} idle="1"><At x={830} y={305} s={0.9}><QMark fill={C.mustard} /></At></A>
        <A anim="slap" delay={1600} dur={450}><At x={1210} y={410}><NoSign r={48} /></At></A>
        {labels.map((label, i) => <A key={label} anim="drop" delay={2000 + i * 120} dur={560}>
          <At x={700 + (i % 3) * 190} y={470 + Math.floor(i / 3) * 72} r={[-8, 5, -3, 9, -6, 4][i]}><Strip text={label} size={30} pad={14} fill={LAYER.text} cls="sp-mono" bold={false} /></At>
        </A>)}
        <A anim="left" delay={2900} dur={600}><At x={300} y={640} s={0.62}><Person kind="listener" label="Screen reader" /></At></A>
        <A anim="pop" delay={3300} dur={500} idle="1"><At x={530} y={660}><Bubble text="“Image.”" size={34} fill={C.paper} color={C.ink} tail="left" /></At></A>
        <A anim="right" delay={3600} dur={600}><At x={850} y={640} s={0.62}><Person kind="assistant" label="AI assistant" /></At></A>
        <A anim="pop" delay={4000} dur={500} idle="1"><At x={1170} y={660}><Bubble text={`${labels[0]} ${labels[1]} ${labels[2]} … ?`} size={30} fill={C.paper} color={C.ink} tail="left" /></At></A>
      </Stage>,
    },
    {
      describe: `Left: the page people see, with steps 1 and 2 in the left column and 3 and 4 in the right. Right: the step tags peel off the page and hang on a string in the order the hidden tags give them: ${hiddenOrder.join('; ')}. A warning triangle drops beside them.`,
      stage: <Stage>
        <Label x={210} y={70} text="What people see" />
        <A anim="drop" dur={650}><At x={210} y={200} r={-2}><g filter="url(#sp-piece)"><rect width="440" height="560" rx="6" fill={C.paper} /></g>
          <rect x="30" y="30" width="380" height="18" rx="9" fill="#e3d7c2" />
          {[1, 2, 3, 4].map((n, i) => <At key={n} x={36 + (n > 2 ? 200 : 0)} y={110 + ((n - 1) % 2) * 190}>
            <circle cx="30" cy="30" r="30" fill={STEP_COLOUR[n]} /><text x="30" y="42" textAnchor="middle" className="sp-tile" fontSize="36" fill="#fff">{n}</text>
            {[0, 1, 2, 3].map(k => <rect key={k} x="0" y={78 + k * 22} width={[160, 140, 150, 110][k]} height="10" rx="5" fill="#e3d7c2" />)}
          </At>)}
        </At></A>
        <Label x={720} y={70} text="Tags screen readers follow" fill={LAYER.tags} delay={400} />
        <A anim="fade" delay={700} dur={400}><path d="M720 230 Q1050 280 1390 226" stroke={C.ink} strokeWidth="5" fill="none" strokeLinecap="round" /></A>
        {hiddenOrder.map((step, i) => {
          const n = Number(stepNumber(step)), x = 800 + i * 170, y = 242 + (i === 1 || i === 2 ? 14 : 4);
          const home = (n > 2 ? 476 : 276) - x, homeY = (n % 2 ? 300 : 490) - y;
          return <A key={step} anim="travel" from={`${home},${homeY}`} delay={1200 + i * 380} dur={900} idle="1.6">
            <At x={x} y={y}><StepTag n={n} fill={STEP_COLOUR[n]} label={stepWord(step)} /></At>
          </A>;
        })}
        <A anim="fade" delay={2900} dur={500}><g>
          <path d="M790 470 C900 510 1180 510 1320 470" stroke={C.red} strokeWidth="5" fill="none" strokeDasharray="1" pathLength="1" data-anim="draw" data-delay="2900" data-dur="700" />
          <path d="M1300 454 L1324 468 L1302 488" stroke={C.red} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="1055" y="550" textAnchor="middle" className="sp-label" fontSize="32" fill={C.ink}>Read in this order</text>
        </g></A>
        <A anim="left" delay={2900} dur={600}><At x={820} y={630} s={0.6}><Person kind="listener" label="Screen reader" /></At></A>
        <A anim="pop" delay={3200} dur={500} idle="1"><At x={1080} y={650}><Bubble text={`“${hiddenOrder.map(stepNumber).join(', ')} …”`} size={34} fill={C.paper} color={C.ink} tail="left" /></At></A>
        <A anim="drop" delay={3500} dur={550} idle="1.2"><At x={1340} y={700}><Warning s={0.85} /></At></A>
      </Stage>,
    },
    {
      describe: `Left: lines of text as a tool pulls them out, in drawing order: “${beforeOrphan.join('”, “')}”, and then, on its own at the end, “${orphan}”, with a question mark. Right: the cover says “${cover}”, but the title saved in the file says “${saved}”, circled in red.`,
      stage: <Stage>
        <Label x={200} y={70} text="Text tools pull out" fill={LAYER.text} />
        {beforeOrphan.map((line, i) => <A key={line} anim="left" delay={300 + i * 350} dur={600}>
          <At x={200} y={190 + i * 110} r={[-1, 1][i]}><Strip text={line.length > 40 ? `${line.slice(0, 39)}…` : line} size={28} pad={16} fill={LAYER.text} cls="sp-mono" bold={false} width={700} /></At>
        </A>)}
        <A anim="drop" delay={1300} dur={700} idle="1.3"><At x={330} y={540} r={-9}><Torn w={260} h={120} fill={C.coral}><text x="130" y="86" textAnchor="middle" className="sp-tile" fontSize="76" fill="#fff">{orphan}</text></Torn></At></A>
        <A anim="pop" delay={1900} dur={500} idle="1.5"><At x={690} y={600} r={12}><QMark fill={C.mustard} /></At></A>
        <A anim="fade" delay={1700} dur={400}><path d="M330 530 C250 470 290 400 330 372" stroke={C.inkSoft} strokeWidth="4" strokeDasharray="8 8" fill="none" /></A>
        <A anim="right" delay={2600} dur={650} idle="0.6"><At x={1010} y={110} r={5} s={0.72}><Cover year={coverYear} /></At></A>
        <A anim="slap" delay={2900} dur={420}><At x={1220} y={130} r={-4}><Strip text="Cover" size={30} pad={14} /></At></A>
        <A anim="right" delay={3400} dur={650}><At x={870} y={500} r={-2}>
          <g filter="url(#sp-piece)"><path d="M0 30 Q0 0 30 0 H170 Q190 0 196 20 L206 46 H500 Q520 46 520 66 V250 H0 Z" fill="#e9c98b" /></g>
          <text x="28" y="34" className="sp-label" fontSize="24" fill={C.ink}>Saved in the file</text>
          <text x="28" y="118" className="sp-label" fontSize="32" fill={C.ink}>{saved.replace(/\s*\S+$/, '')}</text>
          <text x="28" y="200" className="sp-tile" fontSize="72" fill={C.ink}>{savedYear}</text>
          <ellipse cx="96" cy="176" rx="104" ry="54" fill="none" stroke={C.red} strokeWidth="6" pathLength="1" strokeDasharray="1" data-anim="draw" data-delay="4100" data-dur="700" transform="rotate(-6 96 176)" />
        </At></A>
      </Stage>,
    },
    {
      describe: `A paper passport opens. Four stamps land on its pages: “Data” (the attached file ${csvName}, with rows ${rows.map(row => row.join(' ')).join(', ')}), “schema.org” (a description search engines understand), “Links” (“Map 2” leads to the annex) and “Bookmarks” (${data.travel.bookmarks.length} sections). The person reading, the screen reader user and the AI assistant each get a tick.`,
      stage: <Stage>
        <A anim="pop" dur={700}><At x={500} y={220}>
          <g filter="url(#sp-piece)"><rect x="-18" y="-16" width="656" height="492" rx="18" fill={C.purple} /></g>
          <g filter="url(#sp-piece)"><rect width="310" height="460" rx="6" fill="#fdf3e1" /><rect x="310" width="310" height="460" rx="6" fill="#fbeedd" /></g>
          <path d="M310 6 V454" stroke="#d8c3a0" strokeWidth="3" />
          <text x="155" y="48" textAnchor="middle" className="sp-label" fontSize="22" fill={C.purple} letterSpacing="3">FINDINGS PASSPORT</text>
          <text x="465" y="48" textAnchor="middle" className="sp-label" fontSize="22" fill={C.purple} letterSpacing="3">{coverYear}</text>
        </At></A>
        {[['DATA', 'CSV attached', C.teal, 655, 380, -8], ['SCHEMA.ORG', 'described for search', C.purple, 655, 570, 6], ['LINKS', '“Map 2” → annex', C.sky, 965, 380, 5], ['BOOKMARKS', `${data.travel.bookmarks.length} sections`, C.coral, 965, 570, -5]].map(([text, sub, colour, x, y, r], i) =>
          <A key={text} anim="slap" delay={900 + i * 520} dur={380}><At x={x} y={y} r={r}><Stamp text={text} sub={sub} color={colour} w={text.length > 6 ? 270 : 230} /></At></A>)}
        <A anim="left" delay={600} dur={650} idle="0.8"><At x={215} y={300} r={-7}>
          <g filter="url(#sp-piece)"><rect width="250" height="300" rx="4" fill="#fff" /></g>
          <rect x="0" y="0" width="250" height="44" fill={C.teal} />
          <text x="18" y="30" className="sp-label" fontSize="22" fill="#fff" fontWeight="700">{csvName.replace(/^harbor-observatory-2025-/, '')}</text>
          {rows.map((row, i) => <text key={row[0]} x="22" y={96 + i * 52} className="sp-mono" fontSize="28" fill={C.ink}>{row.join(',')}</text>)}
          <path d="M200 -26 V40 Q200 58 182 58 Q164 58 164 40 V-12" stroke="#8c8c9c" strokeWidth="6" fill="none" strokeLinecap="round" />
        </At></A>
        {[C.coral, C.teal, C.mustard].map((colour, i) => <A key={colour} anim="drop" delay={2900 + i * 150} dur={500} idle="1">
          <At x={1070 + i * 26} y={200}><g filter="url(#sp-piece)"><path d={`M0 0 H20 V${110 - i * 24} L10 ${98 - i * 24} L0 ${110 - i * 24} Z`} fill={colour} /></g></At>
        </A>)}
        {[['reader'], ['listener'], ['assistant']].map(([kind], i) => <A key={kind} anim="right" delay={3400 + i * 200} dur={550}>
          <At x={1260} y={170 + i * 230} s={0.55}><Person kind={kind} label={['Reading', 'Screen reader', 'AI assistant'][i]} /></At>
          <At x={1370} y={220 + i * 230}><Tick r={24} /></At>
        </A>)}
      </Stage>,
    },
    {
      describe: `The real tool on a paper laptop, showing its result for the scrambled sample: “${data.scrambled.headline}”. Pins drop onto a page beside it: ${pins.map(pin => `${pin.number}. ${pin.title} (${pin.bucket === 'fix' ? 'fix' : 'check'})`).join('; ')}. A torn tile reads “Your PDF stays on your device”.`,
      stage: <Stage>
        {'CHECK'.split('').map((ch, i) => <A key={i} anim="drop" delay={i * 110} dur={500} idle="0.8"><At x={565 + i * 96} y={50 + (i % 2) * 10} r={[-4, 3, -2, 5, -3][i]}><Tile ch={ch} size={100} fill={TILE_COLOURS[(i + 1) % TILE_COLOURS.length]} /></At></A>)}
        <A anim="rise" delay={500} dur={700}><At x={560} y={280}><Laptop>
          <rect width="600" height="44" fill={C.teal} />
          <text x="20" y="30" className="sp-label" fontSize="22" fill="#fff" fontWeight="700">PDF Signal Check</text>
          <text x="24" y="94" className="sp-strip" fontSize="34" fontWeight="700" fill={C.ink}>{data.scrambled.headline}</text>
          {pins.map((pin, i) => <A key={pin.number} anim="left" delay={1300 + i * 230} dur={450}><g>
            <circle cx="44" cy={144 + i * 54} r="19" fill={pin.bucket === 'fix' ? C.red : C.mustard} />
            <text x="44" y={152 + i * 54} textAnchor="middle" className="sp-label" fontSize="22" fontWeight="700" fill={pin.bucket === 'fix' ? '#fff' : C.ink}>{pin.number}</text>
            <text x="76" y={152 + i * 54} className="sp-label" fontSize="23" fill={C.ink}>{pin.title.length > 40 ? `${pin.title.slice(0, 39)}…` : pin.title}</text>
            <text x="580" y={152 + i * 54} textAnchor="end" className="sp-label" fontSize="18" fill={C.inkSoft}>{pin.bucket === 'fix' ? 'Fix' : 'Check'}</text>
          </g></A>)}
        </Laptop></At></A>
        <A anim="left" delay={700} dur={650}><At x={230} y={340} r={-5}>
          <g filter="url(#sp-piece)"><rect width="250" height="330" rx="4" fill={C.paper} /></g>
          {[0, 1, 2, 3, 4, 5].map(k => <rect key={k} x="24" y={40 + k * 24} width={[190, 170, 200, 150, 180, 120][k]} height="10" rx="5" fill="#e3d7c2" />)}
          <rect x="24" y="200" width="200" height="100" fill="#d8e9ef" />
        </At></A>
        {pins.map((pin, i) => <A key={pin.number} anim="drop" delay={1500 + i * 230} dur={480}>
          <At x={[350, 266, 420, 300][i]} y={[580, 400, 420, 510][i]}>
            <g filter="url(#sp-piece)"><path d="M0 0 C-22 -22 -22 -50 0 -50 C22 -50 22 -22 0 0 Z" fill={pin.bucket === 'fix' ? C.red : C.mustard} /></g>
            <text y="-24" textAnchor="middle" className="sp-label" fontSize="22" fontWeight="700" fill={pin.bucket === 'fix' ? '#fff' : C.ink}>{pin.number}</text>
          </At>
        </A>)}
        <A anim="slap" delay={2800} dur={450} idle="0.8"><At x={800 - stripWidth('Your PDF stays on your device', 36, 18) / 2} y={765} r={-1.5}><Strip text="Your PDF stays on your device" size={36} pad={18} fill={C.ink} color="#fff" /></At></A>
      </Stage>,
    },
  ];
  return words.map((item, i) => ({ ...item, ...visuals[i] }));
}
