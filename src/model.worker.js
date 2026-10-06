import { assessSemantic } from './engine/semantic.js';
import { getSemanticModel } from './engine/models.js';
import { EmbeddingRunner } from './runtime/embedding-runner.js';
const runner=new EmbeddingRunner();let busy=false;
self.onmessage=async({data})=>{
  const post=message=>self.postMessage({...message,requestId:data.requestId});
  if(busy){post({type:'error',message:'A semantic request is already running. Cancel it before starting another.'});return;}
  busy=true;
  try {
    post({type:'progress',message:'Preparing selected checks and bounded evidence.',progress:{stage:'prepare',state:'started',completed:null,total:null,unit:null}});
    const model=getSemanticModel(data.modelId);
    if(runner.extractor && runner.loadedKey!==model.key)await runner.dispose();
    const semantic=await assessSemantic(data,(texts,selected)=>runner.embed(texts,selected,post));
    post({type:'result',semantic});
  }catch(error){try{await runner.dispose();}catch{}post({type:'error',message:error.message,stage:error.stage||null,code:error.code||null});}finally{busy=false;}
};
