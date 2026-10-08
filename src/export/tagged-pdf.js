import { PDFName, PDFHexString, PDFOperator } from 'pdf-lib';

/** Logical structure for generated reports. Does not interpret the source PDF. */
export function createReportStructure(pdf) {
  const { context } = pdf;
  const root = context.obj({ Type: 'StructTreeRoot', K: [] });
  const rootRef = context.register(root);
  const document = context.obj({ Type: 'StructElem', S: 'Document', P: rootRef, K: [] });
  const documentRef = context.register(document);
  root.lookup(PDFName.of('K')).push(documentRef);
  pdf.catalog.set(PDFName.of('StructTreeRoot'), rootRef);
  pdf.catalog.set(PDFName.of('MarkInfo'), context.obj({ Marked: true }));
  pdf.catalog.set(PDFName.of('Lang'), PDFHexString.fromText('en'));
  pdf.catalog.set(PDFName.of('ViewerPreferences'), context.obj({ DisplayDocTitle: true }));
  const pages = new Map();

  function element(role, { parent = documentRef, alt, actualText } = {}) {
    const dict = context.obj({ Type: 'StructElem', S: role, P: parent, K: [] });
    if (alt) dict.set(PDFName.of('Alt'), PDFHexString.fromText(alt));
    if (actualText != null) dict.set(PDFName.of('ActualText'), PDFHexString.fromText(actualText));
    const ref = context.register(dict);
    context.lookup(parent).lookup(PDFName.of('K')).push(ref);
    return ref;
  }

  function mark(page, owner, draw) {
    if (!pages.has(page)) {
      const index = pages.size;
      const parents = context.obj([]);
      pages.set(page, { index, parents });
      page.node.set(PDFName.of('StructParents'), context.obj(index));
      page.node.set(PDFName.of('Tabs'), PDFName.of('S'));
    }
    const { parents } = pages.get(page);
    const mcid = parents.size();
    parents.push(owner);
    const dict = context.lookup(owner);
    dict.lookup(PDFName.of('K')).push(context.obj({ Type: 'MCR', Pg: page.ref, MCID: mcid }));
    const properties = context.obj({ MCID: mcid });
    const actualText = dict.get(PDFName.of('ActualText'));
    if (actualText) properties.set(PDFName.of('ActualText'), actualText);
    page.pushOperators(PDFOperator.of('BDC', [dict.get(PDFName.of('S')), properties]));
    try { draw(); } finally { page.pushOperators(PDFOperator.of('EMC')); }
  }

  function artifact(page, draw) {
    page.pushOperators(PDFOperator.of('BMC', [PDFName.of('Artifact')]));
    try { draw(); } finally { page.pushOperators(PDFOperator.of('EMC')); }
  }

  function finish() {
    const nums = [];
    for (const { index, parents } of pages.values()) nums.push(index, context.register(parents));
    root.set(PDFName.of('ParentTree'), context.register(context.obj({ Nums: nums })));
    root.set(PDFName.of('ParentTreeNextKey'), context.obj(pages.size));
  }
  return { element, mark, artifact, finish };
}
