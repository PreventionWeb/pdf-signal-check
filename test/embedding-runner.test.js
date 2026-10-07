import {it,expect} from 'vitest';
import {EmbeddingRunner} from '../src/runtime/embedding-runner.js';
import {getSemanticModel} from '../src/engine/models.js';
it('preserves primitive initialization failures as actionable model-init errors',async()=>{
 const runner=new EmbeddingRunner();runner.runtime={env:{},pipeline:async()=>{throw 'Download blocked';}};
 await expect(runner.ensure(getSemanticModel('minilm'))).rejects.toMatchObject({message:'Download blocked',stage:'model-init',code:'MODEL_INIT_FAILED'});
});
it('does not publish completed inference when a batch returns fewer vectors than texts',async()=>{
 const runner=new EmbeddingRunner();const model={...getSemanticModel('minilm'),dimensions:2};
 const tokenizer=()=>({attention_mask:{tolist:()=>[[1,1],[1,1]]},input_ids:{tolist:()=>[[1,2],[1,2]]}});tokenizer.encode=()=>[1,2];tokenizer.decode=()=> 'consumed';
 runner.loadedKey=model.key;runner.extractor={tokenizer,model:async()=>({last_hidden_state:{}})};runner.runtime={mean_pooling:()=>({normalize:()=>({tolist:()=>[[1,0]]})})};
 const events=[];await expect(runner.embed(['one','two'],model,e=>events.push(e))).rejects.toThrow(/invalid embedding/);expect(events.filter(e=>e.progress.state==='completed')).toHaveLength(0);
});
it('keeps asset timeout recovery information through model initialization failure', async () => {
 const runner=new EmbeddingRunner();
 runner.runtime={env:{},pipeline:async()=>{throw Object.assign(new Error('Model download stopped responding'),{code:'MODEL_ASSET_TIMEOUT'});}};
 await expect(runner.ensure(getSemanticModel('minilm'))).rejects.toMatchObject({stage:'model-init',code:'MODEL_ASSET_TIMEOUT'});
});
