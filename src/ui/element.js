/** Presentation only: component classes do not change app state or attach global listeners. */
export function createElement(tag,className='',text) {
  const element=document.createElement(tag);
  const classes=className?className.split(' '):[];
  if(tag==='button')classes.push('mg-button','mg-button-secondary','mg-button-outline');
  if(tag==='select')classes.push('mg-form-select');
  if(tag==='table')classes.push('mg-table','mg-table--data');
  if(tag==='label')classes.push('mg-form-label');
  element.className=classes.join(' ');
  if(text!=null)element.textContent=text;
  return element;
}
export function primaryButton(button) {button.classList.remove('mg-button-secondary','mg-button-outline');button.classList.add('mg-button-primary');return button;}
export function checkbox(input) {input.classList.add('mg-form-check__input','mg-form-check__input--checkbox');return input;}
