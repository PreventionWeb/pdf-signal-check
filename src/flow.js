/** Small view-state controller. Analysis/model ownership stays in main.js. */
export class GuidedFlow {
  constructor(render) { this.stage='document'; this.render=render; this.issueId=null; this.category='problems'; this.reviewed=new Set(); }
  go(stage,{focus=true}={}) { this.stage=stage; this.render(); if(focus) document.querySelector('#flow-title')?.focus({preventScroll:true}); }
  reset() { this.issueId=null; this.category='problems'; this.reviewed.clear(); }
}
