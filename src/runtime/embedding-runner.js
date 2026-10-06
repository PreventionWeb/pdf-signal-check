/** One serially owned encoder; callers serialize jobs and terminate their worker to cancel. */
export class EmbeddingRunner {
  async ensure(model, emit = () => {}) {
    if(this.extractor && this.loadedKey!==model.key) await this.dispose();
    if(this.extractor)return { loadAndInitMs:0, state:'warm-encoder', assetSource:'not-needed', assets:[] };
    const started=performance.now(), assets=new Map();
    emit({type:'progress',message:`Initializing ${model.label}.`,progress:{stage:'model-init',state:'started',completed:null,total:null,unit:null}});
    try {
    this.runtime ||= await import('@huggingface/transformers');this.runtime.env.allowLocalModels=false;
    this.extractor=await this.runtime.pipeline('feature-extraction',model.id,{revision:model.revision,dtype:model.dtype,device:model.device,
      progress_callback:p=>{
        if(p.status!=='progress')return;
        const completed=Number.isFinite(p.loaded)?p.loaded:null,total=Number.isFinite(p.total)&&p.total>0?p.total:null;
        assets.set(p.file,{asset:p.file,reportedBytes:completed,totalBytes:total});
        emit({type:'progress',message:`Loading asset ${p.file}.`,progress:{stage:'asset-download',state:'progress',asset:p.file,completed,total,unit:'bytes',scope:'current asset only'}});
      }});
    } catch(error) {const failure=error instanceof Error?error:new Error(String(error));failure.stage='model-init';failure.code='MODEL_INIT_FAILED';throw failure;}
    this.loadedKey=model.key;
    const receipt={loadAndInitMs:performance.now()-started,state:'new-encoder',assetSource:'unknown-network-or-cache',assets:[...assets.values()]};
    emit({type:'progress',message:`${model.label} initialized.`,progress:{stage:'model-init',state:'completed',completed:null,total:null,unit:null}});
    return receipt;
  }
  async embed(texts,model,emit=()=>{}) {
    await this.ensure(model,emit);
      const vectors = [], provenance = [];
      // Small batches limit padded transformer attention/memory. Record what each encoder actually consumed.
      emit({type:'progress',message:`Preparing ${texts.length} bounded text inputs.`,progress:{stage:'inference',state:'started',completed:0,total:Math.ceil(texts.length/4),unit:'batches',completedTexts:0,totalTexts:texts.length}});
      for (let offset=0;offset<texts.length;offset+=4) {
        const batch=texts.slice(offset,offset+4).map(text=>`${model.prefix}${text}`);
        const inputs=this.extractor.tokenizer(batch,{padding:true,truncation:true,max_length:model.maxTokens});
        const masks=inputs.attention_mask.tolist(), ids=inputs.input_ids.tolist();
        for(let i=0;i<batch.length;i++) {
          const fullTokens=this.extractor.tokenizer.encode(batch[i]).length;
          const consumed=ids[i].filter((_,j)=>Number(masks[i][j])!==0);
          provenance.push({index:offset+i,inputTokens:fullTokens,consumedTokens:consumed.length,
            truncated:fullTokens>consumed.length,consumedText:this.extractor.tokenizer.decode(consumed,{skip_special_tokens:true})});
        }
        const output=await this.extractor.model(inputs);
        const pooled=model.pooling==='cls'?output.last_hidden_state.slice(null,0):this.runtime.mean_pooling(output.last_hidden_state,inputs.attention_mask);
        const rows=pooled.normalize(2,-1).tolist();
        if(rows.length!==batch.length||rows.some(v=>v.length!==model.dimensions||v.some(n=>!Number.isFinite(n))))throw new Error('The selected model returned invalid embedding values or dimensions.');
        vectors.push(...rows);
        const done=Math.min(offset+4,texts.length);
        emit({type:'progress',message:`Completed ${Math.ceil(done/4)} of ${Math.ceil(texts.length/4)} inference batches.`,progress:{stage:'inference',state:done===texts.length?'completed':'progress',completed:Math.ceil(done/4),total:Math.ceil(texts.length/4),unit:'batches',completedTexts:done,totalTexts:texts.length}});
      }
      if (vectors.some(v => v.length !== model.dimensions || v.some(n => !Number.isFinite(n)))) throw new Error('The selected model returned invalid embedding values or dimensions.');
      return {vectors,provenance};
  }
  async dispose() { try {await this.extractor?.dispose();} finally {this.extractor=null;this.loadedKey=null;} }
}
