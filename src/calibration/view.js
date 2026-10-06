import { createElement } from '../ui/element.js';
import {BENCHMARK_TIMEOUT_MS} from './workload.js';
import { getSemanticModel } from '../engine/models.js';
const el=(tag,text='')=>createElement(tag,'',text);
export function createCalibrationView({getSelectedModel=()=> 'minilm',onBusy=()=>{},timeoutMs=BENCHMARK_TIMEOUT_MS}={}) {
  const root=el('section');root.className='calibration-panel';
  root.append(el('h3','Optional: test this browser'));
  const cost=el('p'),note=el('p','This uses a tiny public synthetic PDF and fixed text, never your uploaded document. Timing is not a device requirement or document ETA. Its separate encoder is released after completion; screening cannot run simultaneously. This optional attempt has a five-minute time limit.');
  const run=el('button','Test selected model locally'),cancelButton=el('button','Cancel device test'),status=el('p'),result=el('div');
  run.type=cancelButton.type='button';status.setAttribute('role','status');cancelButton.hidden=true;
  root.append(cost,note,run,cancelButton,status,result);
  let worker,epoch=0,busy=false,receipt=null,conditions,heartbeat,deadlineTimer,visibilityHandler,previousWall;
  const refresh=()=>{const m=getSemanticModel(getSelectedModel());cost.textContent=`${m.label}: up to ${(m.graphBytes/1e6).toFixed(2)} MB model + ${(m.tokenizerBytes/1e6).toFixed(2)} MB tokenizer, plus runtime (~26.86 MB uncompressed). Asset transfer/cache cost varies. Running explicitly permits these downloads.`;};
  const stopTracking=()=>{clearInterval(heartbeat);clearTimeout(deadlineTimer);document.removeEventListener('visibilitychange',visibilityHandler);};
  const setBusy=value=>{busy=value;run.disabled=value;cancelButton.hidden=!value;onBusy(value);};
  const cancel=()=>{const wasActive=busy||!!worker;++epoch;worker?.terminate();worker=null;stopTracking();setBusy(false);if(wasActive)status.textContent='Device test canceled. Previously completed results are retained.';};
  run.onclick=()=>{
    refresh();const modelId=getSelectedModel(),runEpoch=++epoch;
    conditions={startedHidden:document.hidden,visibilityChanges:0,possibleSleepOrSchedulingGap:false};
    previousWall=Date.now();heartbeat=setInterval(()=>{const now=Date.now();if(now-previousWall>5000)conditions.possibleSleepOrSchedulingGap=true;previousWall=now;},1000);
    visibilityHandler=()=>{conditions.visibilityChanges++;};document.addEventListener('visibilitychange',visibilityHandler);
    worker ||= new Worker(new URL('./benchmark.worker.js',import.meta.url),{type:'module'});
    const activeWorker=worker;setBusy(true);status.textContent='Starting the synthetic browser test…';
    const active=()=>epoch===runEpoch&&worker===activeWorker;
    const fail=message=>{if(!active())return;activeWorker.terminate();worker=null;stopTracking();setBusy(false);status.textContent=`Device test unavailable: ${message}. No device capability verdict was made.`;};
    deadlineTimer=setTimeout(()=>fail('The explicit device-test time budget expired; retry or continue without benchmarking'),timeoutMs);
    activeWorker.onerror=e=>fail(e.message||'Worker error');
    activeWorker.onmessage=({data})=>{
      if(!active()||data.requestId!==runEpoch)return;
      if(data.type==='progress')status.textContent=data.message;
      else if(data.type==='error')fail(data.message);
      else if(data.type==='result'){
        const now=Date.now();if(now-previousWall>5000)conditions.possibleSleepOrSchedulingGap=true;
        activeWorker.terminate();worker=null;stopTracking();setBusy(false);receipt={...data.receipt,conditions};result.replaceChildren();
        result.append(el('h4',`Measured: ${receipt.model.label}`),el('p',`Synthetic ${receipt.fixture.pages}-page parse: ${Math.round(receipt.fixture.parseMs)} ms. Encoder load and initialization: ${Math.round(receipt.load.loadAndInitMs)} ms (${receipt.load.state}; asset network/cache source ${receipt.load.assetSource}).`),
          el('p',`Three warm sample runs: median ${Math.round(receipt.warm.medianMs)} ms; range ${Math.round(receipt.warm.minimumMs)}–${Math.round(receipt.warm.maximumMs)} ms. Four fixed text inputs per run; ${receipt.workload.tokenCap}-token cap.`),el('p',receipt.note));
        if(conditions.startedHidden||conditions.visibilityChanges||conditions.possibleSleepOrSchedulingGap)result.append(el('p','Timing conditions changed or a scheduling gap was observed. This may affect measurements; rerun in a visible, active tab. Sleep itself cannot be confirmed.'));
        const download=el('button','Download device timing receipt');download.type='button';download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='synthetic-device-timing.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};result.append(download);
        status.textContent='Device test complete. No document speed or memory guarantee is implied.';
      }
    };
    activeWorker.postMessage({requestId:runEpoch,modelId});
  };
  cancelButton.onclick=cancel;refresh();
  return {root,refresh,cancel,destroy(){cancel();root.remove();},get receipt(){return receipt;}};
}
