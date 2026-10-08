/** Approximate serialized report budget; this is not a browser RAM measurement. */
export class ReportStore {
  constructor({maxSerializedBytes=20_000_000}={}) {
    if(!Number.isFinite(maxSerializedBytes)||maxSerializedBytes<1)throw new Error('Invalid report budget.');
    this.maxSerializedBytes=maxSerializedBytes;this.entries=new Map();this.estimatedBytes=0;
  }
  estimate(report){return new TextEncoder().encode(JSON.stringify(report)).byteLength;}
  canPut(id,report){const bytes=this.estimate(report),previous=this.entries.get(id)?.bytes||0;return {fits:this.estimatedBytes-previous+bytes<=this.maxSerializedBytes,bytes};}
  put(id,report){const admission=this.canPut(id,report);if(!admission.fits)return {...admission,stored:false};this.release(id);this.entries.set(id,{report:structuredClone(report),bytes:admission.bytes});this.estimatedBytes+=admission.bytes;return {...admission,stored:true};}
  get(id){const report=this.entries.get(id)?.report;return report?structuredClone(report):null;}
  release(id){const entry=this.entries.get(id);if(!entry)return false;this.estimatedBytes-=entry.bytes;this.entries.delete(id);return true;}
  clear(){this.entries.clear();this.estimatedBytes=0;}
}
