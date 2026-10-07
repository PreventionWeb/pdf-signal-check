import React from 'react';
import { Button, Tag } from '../ui/react.jsx';

const GUIDANCE_TITLE = 'Making PDFs work for Humans and AI';

const challenges = [
  ['Complex layouts break the reading order when a PDF is turned into text.', 'Checked: reading order'],
  ['Figures without alt text lose their meaning in machine extraction.', 'Checked: image descriptions'],
  ['Missing headings, tags or document details make content harder to interpret.', 'Checked: tags and document properties'],
  ['Key numbers embedded in images are invisible to text extraction.', 'Check yourself'],
  ['Cross-references that aren’t links are dead ends for screen readers and AI.', 'Check yourself'],
];

const phases = [
  { title: 'Write for people and machines', checks: 'Headings, document title and description',
    items: ['Use clear, descriptive headings. They become the PDF’s tagged outline.', 'Keep one topic per paragraph, around three to five sentences.', 'Spell out acronyms, and name places and dates in the body text, not only in captions or footnotes.', 'Open with a short summary that gives the whole document’s context.'] },
  { title: 'Design graphics for eyes and parsers', checks: 'Image descriptions, decorative graphics',
    items: ['Write the alt text when you make the graphic, not at export.', 'Repeat key numbers in the text; never only inside an image.', 'Save charts as vector graphics so their labels stay text.', 'Avoid 3D charts, decorative textures, coloured backgrounds and watermarks.'] },
  { title: 'Lay out with structure', checks: 'Tags, untagged text, reading order',
    items: ['Use heading, list and table styles in Word, InDesign or LibreOffice. They export as tags.', 'Put table headers in the first row, and don’t merge cells just for looks.', 'Keep layouts simple and consistent, and avoid layered text boxes and decorative sidebars.', 'Rotate pages the right way up before publishing.'] },
  { title: 'Export a tagged PDF', checks: 'Tags, language, document properties, attachments',
    items: ['Choose “Create Tagged PDF”; don’t rely on defaults, and don’t flatten to print-ready.', 'Aim for PDF/UA, and PDF/A-3 if you embed source files such as CSV data.', 'Embed fonts, and fill in title, author, subject, keywords and language.', 'Keep files under about 10 MB without blurring images.'] },
  { title: 'Check what AI will see', checks: 'Everything above, in one pass',
    items: ['Run PDF Signal Check to see problems on the pages and get a fix list.', 'Also run PAC or Acrobat’s accessibility checker, and review the tags panel.', 'Open the PDF on a phone: if it’s painful to read there, fix the flow.', 'Use clear file names, such as UNDRR_Annual_Report_2024_Final_EN.pdf.'] },
];

/** About page: the narrative from the UNDRR–OCHA guidance and where this tool fits. Presentation only. */
export function AboutPage({ onStart, onPrivacy }) {
  return <article className="about-page" aria-labelledby="about-title">
    <section className="mg-hero mg-hero--split mg-hero--split-2-3 result-hero intake-hero about-hero" aria-labelledby="about-title">
      <div className="mg-container mg-container--slim">
        <div className="mg-hero__split-grid">
          <div className="mg-hero__content">
            <h1 id="about-title" className="mg-hero__title flow-title" tabIndex={-1}>Making PDFs work for people and AI</h1>
            <p className="mg-hero__summaryText">PDFs are still one of the UN’s most common ways to publish, but how they are read is changing. Search engines, chatbots and document assistants are increasingly the first “readers” of a PDF. They turn rich layouts, tables and images into raw text before a person ever sees it.</p>
            <p>When a PDF is well structured, people using screen readers and AI tools both get it right. When it isn’t, a machine struggles, and AI can misunderstand the document and give wrong answers about your work.</p>
            <div className="mg-hero__buttons"><Button onClick={onStart}>Check a PDF</Button></div>
          </div>
          <div className="mg-hero__media mg-hero__media--html intake-hero-points">
            <ul>
              <li><strong>Found more easily</strong><span>More relevant results in search, chatbots and knowledge hubs.</span></li>
              <li><strong>Quoted in context</strong><span>Sections keep their meaning when they’re summarized or quoted.</span></li>
              <li><strong>Misread less</strong><span>Tools can “see” headings, captions and document details.</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section className="about-section" aria-labelledby="about-why">
      <h2 id="about-why">Why this matters</h2>
      <p className="about-lead">Designing for accessibility is no longer just about compliance. It’s about making our knowledge discoverable and usable in the ways people, and their tools, now work.</p>
      <p>Structure helps everyone at once. The same tags, headings and descriptions that let a screen reader user follow a report also let an AI tool separate concepts and data correctly. Well-structured PDFs can be read with simpler extraction methods. That makes them faster and cheaper to process, with less computing power and energy.</p>
      <h3>What goes wrong</h3>
      <ul className="about-challenges">{challenges.map(([text, tag]) => <li key={text}>
        <span>{text}</span><Tag subtle className={tag === 'Check yourself' ? 'about-tag--manual' : undefined}>{tag}</Tag>
      </li>)}</ul>
    </section>

    <section className="about-section" aria-labelledby="about-example">
      <h2 id="about-example">The same page, read two ways</h2>
      <p>UNDRR and OCHA compared how a page of the <a href="https://www.undrr.org/media/107058/" target="_blank" rel="noopener noreferrer">Global Assessment Report 2025 Summary for Policymakers ↗</a> is meant to be read with what a PDF text extractor actually returns. The page mixes narrative text with a chart about urban population growth.</p>
      <div className="about-compare">
        <figure className="about-compare-column">
          <figcaption>How a person reads it</figcaption>
          <blockquote>
            <p>…particularly in cities where an additional 1.2 billion people are expected to be living by 2050 (Figure 5).</p>
            <p><strong>Figure 5. Projected urban population growth by 2050</strong><br />By 2050, cities are projected to add 1.2 billion residents. Over 98% of this growth will occur in the Global South.</p>
            <p>Global North 1.6% · Global South 98.4%</p>
          </blockquote>
        </figure>
        <figure className="about-compare-column about-compare-column--extracted">
          <figcaption>What an AI tool extracts</figcaption>
          <pre>{`billion people are expected to be living by
2050 (Figure 5). Each home and infrastructure…

+1.2
billion

Global South
98.4%

Global North 1.6%
…
Similar challenges exist … particularly in
cities where an additional 1.2`}</pre>
        </figure>
      </div>
      <p>Sentences start mid-thought, numbers like “+1.2” and “98.4%” lose what they measure, and the chart’s title isn’t tagged as a heading. Given only the extracted text and asked what drives the population growth, Copilot missed the link to urbanization. Given a correctly ordered version, it answered concisely and correctly.</p>
    </section>

    <section className="about-section" aria-labelledby="about-flow">
      <h2 id="about-flow">A production flow for PDFs that work</h2>
      <p>Most problems are cheapest to fix before export. These steps summarize the guidance; each card notes what PDF Signal Check can check for you.</p>
      <ol className="about-phases">{phases.map((phase, index) => <li key={phase.title} className="mg-card about-phase">
        <div className="mg-card__content">
          <p className="about-phase-number">Step {index + 1}</p>
          <h3 className="mg-card__title">{phase.title}</h3>
          <ul>{phase.items.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="about-phase-checks"><strong>This tool checks:</strong> {phase.checks}</p>
        </div>
      </li>)}</ol>
    </section>

    <section className="about-section" aria-labelledby="about-fit">
      <h2 id="about-fit">Where PDF Signal Check fits</h2>
      <p>PDF Signal Check automates the checks you can’t do by looking at a page. It finds missing or broken tags, text screen readers can’t reach, a scrambled reading order, images without descriptions, document details that don’t match the publication, attached files, and hidden text aimed at AI tools. It shows each one on the page, and gives you a fix list to send to whoever made the PDF.</p>
      <p>It doesn’t judge what images or charts mean, check facts, or certify PDF/UA or PDF/A conformance. And passing doesn’t mean a PDF is good for AI: long, unbroken paragraphs still parse poorly. Use it alongside a full accessibility checker and a human read-through.</p>
    </section>

    <section className="about-section" aria-labelledby="about-origins">
      <h2 id="about-origins">Where this comes from</h2>
      <p>PDF Signal Check builds on two pieces of work:</p>
      <ul className="about-origins">
        <li><strong>{GUIDANCE_TITLE}</strong> (version 1, September 2025): practical guidance produced by UNDRR and OCHA, based on best practice and industry consultation. The narrative, production flow and GAR2025 example on this page come from it.</li>
        <li><a href="https://github.com/khawkins98/PDF-A-go-actionable" target="_blank" rel="noopener noreferrer">PDF-A-go-actionable ↗</a>: Ken Hawkins’s browser-based PDF accessibility checker. Its local, in-browser approach shaped this tool’s design. The page rendering also draws on <a href="https://github.com/khawkins98/pdf-a-go-go" target="_blank" rel="noopener noreferrer">pdf-a-go-go ↗</a>.</li>
      </ul>
      <p>Before this tool, the same team experimented with an AI chat agent for reviewing PDFs; its <a href="https://gist.github.com/khawkins98/c19d0d699455a9fc26ebfeb1f28ea6ba" target="_blank" rel="noopener noreferrer">review prompt is published ↗</a>. PDF Signal Check runs its structural checks with rules instead, so your PDF never has to be uploaded to a chatbot.</p>
    </section>

    <section className="about-section" aria-labelledby="about-privacy">
      <h2 id="about-privacy">Privacy and AI</h2>
      <p>Your PDF is checked in your browser and never leaves your device. The structural checks need no AI. If you choose a local AI model, it downloads once and also runs on your device. AI can make mistakes, and this tool’s rules can miss issues or flag legitimate content, so review the evidence before relying on a result.</p>
      <Button onClick={onPrivacy}>Read the AI and privacy notice</Button>
    </section>
  </article>;
}
