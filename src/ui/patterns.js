import {createElement} from './element.js';
/** Complete, non-interactive Mangrove surfaces. State and event ownership stay with views. */
export function card(tag='section',className='') {
  const root=createElement(tag,`mg-card mg-card__vc mg-card--no-link ${className}`);
  const content=createElement('div','mg-card__content');root.append(content);
  return {root,content};
}
export function notice({title,description,tone='info',className='',titleTag='h3'}) {
  const root=createElement('section',`mg-notice mg-notice--${tone} ${className}`);
  const header=createElement('div','mg-notice__header');
  header.append(createElement('span','mg-icon mg-icon-info-circle mg-notice__icon'));
  header.firstChild.setAttribute('aria-hidden','true');
  header.append(createElement(titleTag,'mg-notice__title',title));
  const body=createElement('div','mg-notice__description');if(description)body.append(createElement('p','',description));
  const actions=createElement('div','mg-notice__actions');root.append(header,body,actions);
  return {root,body,actions};
}
export function checkRow(input,text) {
  const row=createElement('div','mg-form-check');
  const label=createElement('label','mg-form-check__label',text);label.htmlFor=input.id;
  row.append(input,label);return row;
}
export function formField(label,control,help) {
  const root=createElement('div','mg-form-field');root.append(label,control);if(help){help.classList.add('mg-form-help');root.append(help);}return root;
}
