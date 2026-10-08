import React from 'react';
import { Button, Tag } from '../ui/react.jsx';

const GUIDANCE_TITLE = 'Making PDFs work for Humans and AI';

const challenges = [
  ['Steps can come out in the wrong order, so a person or tool encounters the result before the action it depends on.', 'Checks for order clues'],
  ['A chart without a useful written description can leave someone listening without its main finding.', 'Checks for missing descriptions'],
  ['A saved title can name last year’s report even when the cover shows the new year, giving software conflicting clues.', 'Looks for title disagreements'],
  ['A number can lose its label when text is copied out, leaving a research tool or chatbot without what it measures.', 'Checks for separated values'],
  ['A reference such as “Map 2” may have no link, so readers cannot jump to the evidence it names.', 'Checks for missing links'],
];

const phases = [
  { title: 'Write for people and machines', checks: 'Headings, document title and description',
    items: ['Use clear, descriptive headings and heading styles. With a tagged export, they can help form the PDF’s structure.', 'Keep one topic per paragraph, around three to five sentences.', 'Spell out acronyms, and name places and dates in the body text, not only in captions or footnotes.', 'Open with a short summary that gives the whole document’s context.'] },
  { title: 'Explain what the graphics mean', checks: 'Image descriptions, decorative graphics',
    items: ['Write a useful text description when you make the graphic, not at export. Explain its main finding.', 'Include key numbers and what they measure in the text or a data table, not only inside an image.', 'Keep chart labels as text where possible, and check the exported PDF.', 'Mark purely decorative graphics as decoration so they do not interrupt someone listening.'] },
  { title: 'Lay out with structure', checks: 'Tags, untagged text, reading order',
    items: ['Use heading, list and table styles in your authoring tool. Enable tagged export and check that those roles are preserved in the PDF.', 'Put table headers in the first row, and don’t merge cells just for looks.', 'Keep layouts simple and consistent, and avoid layered text boxes and decorative sidebars.', 'Rotate pages the right way up before publishing.'] },
  { title: 'Export a tagged PDF', checks: 'Tags, language, document properties, attachments',
    items: ['Choose “Create Tagged PDF”; don’t rely on defaults, and don’t flatten to print-ready.', 'Aim for PDF/UA, and PDF/A-3 if you embed source files such as CSV data.', 'Embed fonts, and fill in title, author, subject, keywords and language.', 'Keep files under about 10 MB without blurring images.'] },
  { title: 'Check the different ways people use it', checks: 'The checks above, within the tool’s limits',
    items: ['Run PDF Signal Check, review the evidence and give the fix list to whoever can edit the source document.', 'Use a full accessibility checker and test the reading order and chart descriptions with a screen reader.', 'Copy text out and check that steps, numbers and labels still belong together. Also review the page on a phone.', 'Match the saved title, year and authors to the publication. Export an updated PDF and check again.'] },
];

/** About page: the narrative from the UNDRR–OCHA guidance and where this tool fits. Presentation only. */
export function AboutPage({ onStart, onPrivacy }) {
  return <article className="about-page" aria-labelledby="about-title">
    <section className="mg-hero mg-hero--split mg-hero--split-2-3 result-hero intake-hero about-hero" aria-labelledby="about-title">
      <div className="mg-container mg-container--slim">
        <div className="mg-hero__split-grid">
          <div className="mg-hero__content">
            <h1 id="about-title" className="mg-hero__title flow-title" tabIndex={-1}>Making PDFs work for people and AI</h1>
            <p className="mg-hero__summaryText">Your report can reach people who see the page, people who listen with a screen reader, and machines that analyse its contents. A screen reader is software that speaks the page aloud. Search engines help people find reports, research tools compare findings, and AI chatbots use them to answer questions.</p>
            <p>Those routes can carry your findings far beyond the file. But a small mistake in the PDF’s hidden structure can travel too: a chart’s finding may disappear, a number may lose its meaning, or the wrong year may be repeated.</p>
            <div className="mg-hero__buttons"><Button onClick={onStart}>Check a PDF</Button></div>
          </div>
          <div className="mg-hero__media mg-hero__media--html intake-hero-points">
            <ul>
              <li><strong>Carry the finding</strong><span>Describe what a chart shows for people accessing it another way.</span></li>
              <li><strong>Keep the context</strong><span>Connect numbers to labels and steps to their intended order.</span></li>
              <li><strong>Identify the right report</strong><span>Match the saved title and year to the publication.</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section className="about-section" aria-labelledby="about-why">
      <h2 id="about-why">Why this matters</h2>
      <p className="about-lead">A report has more than its visible page. It can also carry text that software extracts and hidden labels called tags, which identify headings, paragraphs, images and reading order.</p>
      <p>When that information is missing or misleading, a person may miss the finding and an AI chatbot may repeat the wrong fact with confidence. Good structure removes some avoidable confusion. It still needs human review: tags can be present but wrong, and a saved chart description may not explain the chart.</p>
      <p><a href="https://www.undrr.org/our-work" target="_blank" rel="noopener noreferrer">UNDRR helps people understand and act on disaster risk ↗</a>. <a href="https://www.preventionweb.net/about-preventionweb" target="_blank" rel="noopener noreferrer">PreventionWeb shares knowledge for disaster risk reduction and resilience ↗</a>.</p>
      <p>That is why the meaning inside a PDF matters to this service. PDF reports are part of the backbone of shared risk knowledge. A small omission can travel through search, research, summaries and AI answers, changing how people understand the evidence. Keeping findings clear and usable helps people bring that evidence into decisions about risk and resilience.</p>
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
          <figcaption>The intended reading</figcaption>
          <blockquote>
            <p>…particularly in cities where an additional 1.2 billion people are expected to be living by 2050 (Figure 5).</p>
            <p><strong>Figure 5. Projected urban population growth by 2050</strong><br />By 2050, cities are projected to add 1.2 billion residents. Over 98% of this growth will occur in the Global South.</p>
            <p>Global North 1.6% · Global South 98.4%</p>
          </blockquote>
        </figure>
        <figure className="about-compare-column about-compare-column--extracted">
          <figcaption>What a text extractor returns</figcaption>
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
      <p>Sentences start mid-thought, numbers like “+1.2” and “98.4%” lose what they measure, and the chart’s title isn’t tagged as a heading. In this example, Copilot missed the link to urbanization when given only the extracted text. With a correctly ordered version, it answered correctly. That illustrates why the input matters; it does not establish how every AI system will respond.</p>
    </section>

    <section className="about-section" aria-labelledby="about-flow">
      <h2 id="about-flow">A production flow for PDFs that work</h2>
      <p>Start in the source document, where you can repair the meaning as well as the appearance. These steps adapt the guidance; each card names the checks this tool contributes. Review the evidence yourself, then export and check again.</p>
      <ol className="about-phases">{phases.map((phase, index) => <li key={phase.title} className="mg-card about-phase">
        <div className="mg-card__content">
          <p className="about-phase-number">Step {index + 1}</p>
          <h3 className="mg-card__title">{phase.title}</h3>
          <ul>{phase.items.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="about-phase-checks"><strong>This tool checks:</strong> {phase.checks}</p>
        </div>
      </li>)}</ol>
    </section>

    <section className="about-section" aria-labelledby="about-reuse">
      <h2 id="about-reuse">Then help the findings travel further</h2>
      <p>Once the basic problems are addressed, make the report easier to use elsewhere. Share the data behind charts, add a clear summary and publishing details, make references clickable, and add bookmarks that jump to sections.</p>
      <p>In the results, optional suggestions under “Make it travel further” are separate from the things to fix or check and do not add to their count. Suspected problems, such as a reference without a link, still need review under Check. An attached data file or description does not guarantee that a search engine or AI tool will use it.</p>
    </section>

    <section className="about-section" aria-labelledby="about-fit">
      <h2 id="about-fit">Where PDF Signal Check fits</h2>
      <p>PDF Signal Check looks for problems you may not notice on the page: missing or broken tags, missing image descriptions, clues to mixed-up reading order, and document details that disagree with the publication. It also lists attachments and screens for hidden instruction-like text. You get a fix list with evidence and page pins where the issue can be located.</p>
      <p>Start with Fix, then review Check. “Couldn’t check” describes limits of the tool, not tasks in your PDF. Make changes in the source document or a PDF editor; this tool does not repair the file for you.</p>
      <p>A clear result does not guarantee accessibility, search visibility or accurate AI answers. The tool does not interpret chart pixels, verify facts or certify PDF/UA or PDF/A conformance. Use it alongside a full accessibility check and a human review of the report’s meaning.</p>
    </section>

    <section className="about-section" aria-labelledby="about-origins">
      <h2 id="about-origins">Where this comes from</h2>
      <p>PDF Signal Check is a free service from UNDRR and PreventionWeb. It builds on two pieces of work:</p>
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
