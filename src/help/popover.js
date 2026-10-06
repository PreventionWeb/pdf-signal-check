import { helpPlacement } from './placement.js';
import { HELP_TOPICS } from './catalog.js';
let nextId=0;
/** Interactive contextual help. Opening it reads local copy only; links are explicit. */
export function helpTip(key,{label,extraText}={}) {
  const topic=HELP_TOPICS[key];if(!topic)throw new Error(`Unknown help topic: ${key}`);
  const root=document.createElement('span');root.className='help-tip';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='help-trigger';trigger.textContent='i';trigger.setAttribute('aria-label',label || `About ${topic.title}`);
  const popup=document.createElement('div');popup.className='help-popover';popup.id=`help-${++nextId}`;popup.setAttribute('popover','auto');popup.setAttribute('role','region');
  const title=document.createElement('h4');title.id=`${popup.id}-title`;title.textContent=topic.title;popup.setAttribute('aria-labelledby',title.id);trigger.setAttribute('aria-controls',popup.id);trigger.setAttribute('aria-expanded','false');
  const close=document.createElement('button');close.type='button';close.className='help-close';close.textContent='×';close.setAttribute('aria-label',`Close help about ${topic.title}`);
  popup.append(title,close);for(const text of [...(extraText?[extraText]:[]),...topic.text]){const p=document.createElement('p');p.textContent=text;popup.append(p);}
  for(const reference of topic.references || []){const a=document.createElement('a');a.href=reference.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`${reference.label} ↗`;a.setAttribute('aria-label',`${reference.label} (opens in a new tab)`);popup.append(a);}
  root.append(trigger,popup);let pinned=false,timer,quietUntil=0;
  const position=()=>{
    const viewport={width:innerWidth,height:innerHeight};
    popup.style.width=`${Math.min(340,innerWidth-24)}px`;popup.style.maxHeight=`${innerHeight-24}px`;
    const placement=helpPlacement(trigger.getBoundingClientRect(),viewport,popup.offsetHeight);
    for(const key of ['width','left','top','maxHeight'])popup.style[key]=`${placement[key]}px`;
  };
  const show=()=>{clearTimeout(timer);if(!popup.matches(':popover-open'))popup.showPopover();position();trigger.setAttribute('aria-expanded','true');};
  const hide=()=>{clearTimeout(timer);if(popup.matches(':popover-open'))popup.hidePopover();pinned=false;trigger.setAttribute('aria-expanded','false');};
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!pinned&&!root.matches(':hover')&&!root.contains(document.activeElement))hide();},180);};
  trigger.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&performance.now()>quietUntil)show();});trigger.addEventListener('pointerleave',schedule);trigger.addEventListener('focus',()=>{if(performance.now()>quietUntil)show();});trigger.onclick=()=>{if(pinned)hide();else {pinned=true;show();}};
  popup.addEventListener('pointerenter',()=>clearTimeout(timer));popup.addEventListener('pointerleave',schedule);root.addEventListener('focusout',schedule);root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();quietUntil=performance.now()+350;hide();trigger.focus({preventScroll:true});hide();}});close.onclick=()=>{hide();trigger.focus({preventScroll:true});hide();};
  popup.addEventListener('beforetoggle',e=>{if(e.newState==='closed')quietUntil=performance.now()+350;});
  popup.addEventListener('toggle',e=>{if(e.newState==='closed'){pinned=false;trigger.setAttribute('aria-expanded','false');}});
  return root;
}
export function helpLabel(text,key,tag='span') {const label=document.createElement(tag);label.className='help-label';label.append(document.createTextNode(text),helpTip(key,{label:`About ${text}`}));return label;}
