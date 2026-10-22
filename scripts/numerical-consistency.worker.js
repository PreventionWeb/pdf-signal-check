// Developer-only harness: bounded synthetic text, shipped encoder, actual browser WASM.
import { EmbeddingRunner } from '../src/runtime/embedding-runner.js';
import { getSemanticModel } from '../src/engine/models.js';
self.onmessage = async ({data}) => {
 const runner = new EmbeddingRunner();
 try {
  const model = getSemanticModel(data.modelId);
  const output = await runner.embed(data.texts, model, p => self.postMessage(p));
  self.postMessage({type:'result',model,...output});
 } catch(error) { self.postMessage({type:'error',message:error.message}); }
 finally { await runner.dispose(); }
};
