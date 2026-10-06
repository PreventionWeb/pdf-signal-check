import { createElement } from '../ui/element.js';
import { helpLabel } from '../help/popover.js';
const node=createElement;
/** Publication evidence first; metadata stores remain separate declared values. */
export function createIdentityComparison({kind,report,result,renderEvidence}) {
  const root=node('div','identity-comparison'),publication=node('section','identity-source identity-publication');
  publication.append(node('h4','','From the publication'),node('div','finding-crop-slot'),node('h5','','Recovered publication text'));
  const evidence=kind==='title'?result?.publicationCandidates || []:result?.evidence || [];
  publication.append(node('p','model-note',kind==='title'?'Recovered first-page title candidates; candidacy is heuristic.':'Explicit first-page byline candidates; candidacy does not authenticate authorship.'));
  evidence.slice(0,8).forEach(item=>publication.append(renderEvidence(item)));
  if(!evidence.length)publication.append(node('p','identity-unavailable','No comparable publication candidate was recovered. There is no located crop to show; missing evidence is not a match.'));
  if(evidence.length>8)publication.append(node('p','model-note',`${evidence.length-8} additional candidates are in the full evidence report.`));
  root.append(publication);
  const fields=kind==='title'?[
    ['Info metadata','info',[['Title',report.metadata.infoTitle]]],
    ['XMP metadata','xmp',(report.metadata.xmpTitles || []).length?(report.metadata.xmpTitles || []).map(t=>[`Title (${t.lang || 'unspecified language'})`,t.text]):[['Title',null]]],
  ]:[
    ['Info metadata','info',[['Authors',report.metadata.author]]],
    ['XMP metadata','xmp',[['Authors',(result?.metadataAuthors?.xmp || report.metadata.xmpAuthors || []).join('; ')]]],
  ];
  for(const [label,key,values] of fields){const section=node('section',`identity-source identity-${key}`);section.append(helpLabel(label,key,'h4'));const list=node('dl','identity-values');for(const [field,value] of values)list.append(node('dt','',field),node('dd',value && String(value).trim()?'':'identity-unavailable',value && String(value).trim()?value:'Not set'));section.append(list);root.append(section);}
  return root;
}
