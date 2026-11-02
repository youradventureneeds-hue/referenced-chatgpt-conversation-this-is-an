/** A bounded SSE notification stream. Snapshots are fetched separately after each change. */
export function createForumStream({getVersion,signal,intervalMs=2000,lifetimeMs=25000}){
 let stopped=false,timer,wake,controller,abort;
 const stop=()=>{if(stopped)return;stopped=true;clearTimeout(timer);wake?.();signal?.removeEventListener('abort',abort);};
 const pause=()=>new Promise(resolve=>{wake=resolve;timer=setTimeout(resolve,intervalMs);});
 const encode=new TextEncoder();
 return new ReadableStream({start(output){controller=output;const emit=(event,data,version)=>{if(!stopped)controller.enqueue(encode.encode((version===undefined?'':'id: '+version+'\n')+'event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n'));};abort=()=>{if(stopped)return;controller.close();stop();};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
  void(async()=>{try{const started=Date.now();let previous=await getVersion();if(stopped)return;controller.enqueue(encode.encode('retry: 1500\n\n'));emit('ready',{version:previous},previous);
   while(!stopped&&Date.now()-started<lifetimeMs){await pause();if(stopped)break;if(Date.now()-started>=lifetimeMs)break;const value=await getVersion();if(stopped)break;if(value!==previous){previous=value;emit('change',{version:value},value);}else controller.enqueue(encode.encode(': heartbeat\n\n'));}
   if(!stopped){controller.close();stop();}
  }catch{if(!stopped){emit('unavailable',{});controller.close();stop();}}})();
 },cancel(){stop();}});
}
