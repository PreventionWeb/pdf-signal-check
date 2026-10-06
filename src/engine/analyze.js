import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument, PDFName } from 'pdf-lib';
import { inspectStructure, unsupportedFeatures } from './structure.js';
import { inspectPage } from './page.js';
import { readMetadata } from './metadata.js';
import { compareTitles } from './titles.js';
import { compareAuthors, inspectReadingOrder, inspectTextVisibility } from './advisories.js';
import { inspectAttachments } from './attachments.js';

export { pdfjs };
export const PROFILE = 'text-actionability-0.3';
export const LIMITS = { maxBytes: 50 * 1024 * 1024, maxPages: 200, maxOperators: 1_000_000, maxTextItems: 250_000 };
const check = (id, label, status, summary, evidence = []) => ({ id, label, required: true, status, summary, evidence });

export function finalize(report) {
  report.accepted = report.analysisComplete && report.checks.length > 0 && report.checks.every(c => !c.required || c.status === 'pass' || c.status === 'not-applicable');
  report.verdictReason = report.accepted ? 'All required checks passed for the supported text profile.' :
    report.checks.some(c => c.status === 'fail') ? 'One or more required checks found a defect.' : 'Compliance could not be established.';
  return report;
}

export async function analyzePdf(input, options = {}) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const limits = { ...LIMITS, ...options };
  const report = { schemaVersion: 1, appVersion: '0.8.0', profile: PROFILE, analyzedAt: new Date().toISOString(),
    file: { name: options.fileName || 'document.pdf', bytes: bytes.byteLength, pages: null },
    analysisComplete: false, accepted: false, metadata: {}, metadataConsistency: { status: 'uncertain', candidates: [] },
    semantic: null, attachments: {status:'not-assessed',inventoryComplete:false,files:[],orphanStreams:[],warnings:[],payloadsAnalyzed:false,reason:'Document parsing did not complete; attachment inventory not assessed.'}, authorConsistency: { status: 'uncertain', reason: 'Analysis not completed.', evidence: [] },
    readingOrder: { status: 'uncertain', reason: 'Analysis not completed.', evidence: [] },
    textVisibility: { status: 'uncertain', reason: 'Analysis not completed.', evidence: [] }, checks: [], pages: [], limitations: [
      'This is a project-specific text profile, not PDF/UA or PDF/A validation.',
      'Decoding checks identify suspicious output; they do not prove glyph-to-text semantic correctness.',
      'Logical order and role meaning are not visually verified. Artifact declarations are trusted.',
      'Meaningful graphics, Form XObjects, annotations, forms, optional layers, and ActualText replacements are outside the supported profile.',
    ] };
  let task;
  let stage = 'loading';
  const progress = (phase, percent, detail = {}) => options.onProgress?.({ phase, percent, percentIsStageEstimate: true, ...detail });
  try {
    if (bytes.byteLength > limits.maxBytes) throw new Error('The 50 MB analysis limit was exceeded.');
    if (new TextDecoder().decode(bytes.subarray(0, 1024)).indexOf('%PDF-') < 0) throw new Error('No PDF header found. Choose a PDF file.');
    progress('Reading PDF objects', 5, {stage:'parse',state:'started',completed:null,total:null,unit:null});
    const raw = await PDFDocument.load(bytes, { updateMetadata: false });
    if (raw.isEncrypted) throw new Error('Encrypted PDFs are outside the supported profile.');
    report.file.pages = raw.getPageCount();
    if (report.file.pages > limits.maxPages) throw new Error(`The ${limits.maxPages}-page analysis limit was exceeded.`);
    stage = 'analysis';
    const structure = inspectStructure(raw);
    report.attachments = inspectAttachments(raw);
    const rawContentErrors = [];
    const unsupported = unsupportedFeatures(raw, { onContentError: error => rawContentErrors.push(error) }).concat(structure.unsupported);
    if (report.attachments.files.some(file => file.embedded)) unsupported.push('Embedded file payloads require separate analysis outside this text profile; attachment contents have not been decoded or checked.');
    if (!report.attachments.inventoryComplete) unsupported.push('Attachment inventory was incomplete; attachment absence and supported content scope cannot be established.');
    if (report.attachments.files.some(file => !file.embedded)) unsupported.push('Associated external file references require analysis outside this text profile; no referenced file was fetched.');
    task = pdfjs.getDocument({ data: bytes.slice(), stopAtErrors: true, isEvalSupported: false,
      useSystemFonts: false, ...options.pdfjsOptions });
    const doc = await task.promise;
    const { info, metadata } = await doc.getMetadata();
    report.metadata = readMetadata(info, metadata?.getRaw());
    report.metadata.language = raw.catalog.get(PDFName.of('Lang'))?.decodeText?.() || report.metadata.language;
    const title = report.metadata.xmpTitles.find(t => t.text?.trim())?.text?.trim() || report.metadata.infoTitle?.trim();
    report.checks.push(check('load', 'Document parsing', 'pass', `${doc.numPages} page${doc.numPages === 1 ? '' : 's'} parsed with both PDF engines.`));
    report.checks.push(check('title', 'Metadata title', title ? 'pass' : 'fail', title ? 'A document title is present.' : 'No title is set in Info or XMP.', title ? [title] : []));
    let validLanguage = false;
    try { validLanguage = !!report.metadata.language && !!Intl.getCanonicalLocales(report.metadata.language).length; } catch { /* invalid */ }
    report.checks.push(check('language', 'Document language', validLanguage ? 'pass' : 'fail', validLanguage ? `Language: ${report.metadata.language}` : 'A valid document language tag is required.'));
    if (report.metadata.xmpError) report.checks.push(check('xmp', 'XMP parsing', 'indeterminate', report.metadata.xmpError));
    let operatorCount = 0, textCount = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      progress(`Inspecting page ${i} of ${doc.numPages}`, 10 + Math.round(80 * (i-1) / doc.numPages), {stage:'pages',state:'progress',completed:i-1,total:doc.numPages,unit:'pages'});
      const page = await doc.getPage(i);
      const text = await page.getTextContent({ includeMarkedContent: true, disableNormalization: true });
      const operators = await page.getOperatorList({ annotationMode: pdfjs.AnnotationMode.DISABLE });
      operatorCount += operators.fnArray.length; textCount += text.items.length;
      if (operatorCount > limits.maxOperators || textCount > limits.maxTextItems) throw new Error('Document content exceeded the analysis limits.');
      const tree = await page.getStructTree();
      report.pages.push({...inspectPage(text, operators, tree, i, structure, pdfjs.OPS),rotation:page.rotate});
      page.cleanup();
      progress(`Inspected page ${i} of ${doc.numPages}`, 10 + Math.round(80 * i / doc.numPages), {stage:'pages',state:i===doc.numPages?'completed':'progress',completed:i,total:doc.numPages,unit:'pages'});
    }
    const sum = field => report.pages.reduce((total, p) => total + p[field], 0);
    const chars = sum('characters'), bad = sum('suspicious'), untagged = sum('untaggedCharacters');
    const dangling = report.pages.flatMap(p => p.dangling.filter(k => !p.emptyContent.includes(k)));
    const emptyContent = report.pages.flatMap(p => p.emptyContent);
    if (emptyContent.length) unsupported.push(`Referenced marked-content sequences have no observed text or graphic content: ${emptyContent.join(', ')}.`);
    if (sum('nonArtifactGraphics')) unsupported.push(`${sum('nonArtifactGraphics')} non-artifact graphic painting operations need semantic inspection.`);
    report.checks.push(check('text', 'Decodable text', !chars || bad ? 'fail' : 'pass', !chars ? 'No non-artifact text could be extracted.' : bad ? `${bad} suspicious characters or glyph mappings detected.` : `${chars.toLocaleString()} non-artifact characters decoded without the suspicious-output indicators.`, report.pages.filter(p => p.suspicious).map(p => `Page ${p.number}: ${p.suspicious} indicators`)));
    report.checks.push(check('structure', 'Connected semantic tags', !structure.present || structure.errors.length || dangling.length ? 'fail' : 'pass', !structure.present ? 'No structure tree found.' : structure.errors.length || dangling.length ? 'Tag links are missing or inconsistent.' : `${structure.nodes.length} elements connect to ${structure.refs.size} marked-content references.`, [...structure.errors, ...dangling.map(k => `Content reference ${k} has no observed text or graphic content.`)]));
    report.checks.push(check('coverage', 'Text coverage', untagged || !chars ? 'fail' : 'pass', untagged ? `${untagged.toLocaleString()} extracted characters lack a connected tag.` : !chars ? 'No relevant text to account for.' : 'All extracted non-artifact text is associated with a structure element.'));
    report.checks.push(check('supported-content', 'Supported content scope', unsupported.length ? 'indeterminate' : 'pass', unsupported.length ? 'Some content requires analysis outside this text profile.' : 'No excluded content features were detected.', [...new Set(unsupported)]));
    const candidates = report.pages.slice(0, 3).flatMap(p => p.candidates).filter((c, i, all) => all.findIndex(x => x.text === c.text) === i).slice(0, 12);
    report.metadataConsistency = compareTitles(report.metadata, candidates);
    report.authorConsistency = compareAuthors(report.metadata, report.pages);
    report.readingOrder = inspectReadingOrder(report.pages);
    report.textVisibility = inspectTextVisibility(report.pages);
    const contentErrors = [...new Set([...rawContentErrors, ...report.pages.flatMap(p => p.contentErrors)])];
    report.checks.push(check('content-integrity', 'Marked-content integrity', contentErrors.length ? 'fail' : 'pass', contentErrors.length ? 'Marked-content identifiers or boundaries are inconsistent.' : 'Observed marked-content boundaries are balanced and page identifiers are unique.', contentErrors));
    report.analysisComplete = true;
    report.checks.push(check('completion', 'Analysis completion', 'pass', 'Every page and required check completed within the configured limits.'));
  } catch (error) {
    const incomplete = stage === 'analysis' || /limit|encrypt|password/i.test(error.message);
    report.checks.push(check(incomplete ? 'completion' : 'load', incomplete ? 'Analysis completion' : 'Document parsing', incomplete ? 'indeterminate' : 'fail', error.message));
  } finally {
    try { await task?.destroy(); } catch { /* already failed */ }
  }
  progress('Processing finished', 100, {stage:'analysis',state:'completed',completed:null,total:null,unit:null,analysisComplete:report.analysisComplete});
  return finalize(report);
}
