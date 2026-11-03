import { ref, onBeforeUnmount } from 'vue'
import { readSSE } from './sse.js'
export function useCopyStream() {
  const text=ref(''), streaming=ref(false), error=ref(''), result=ref(null), stopped=ref(false)
  let controller
  async function start(body){
    if(streaming.value)return
    text.value='';error.value='';result.value=null;stopped.value=false;streaming.value=true
    controller=new AbortController()
    try{
      const res=await fetch((import.meta.env.VITE_API_BASE ?? '')+'/api/copy/stream',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal})
      if(!res.ok){const j=await res.json().catch(()=>({}));throw Error(j.message||'请求失败')}
      if(!res.headers.get('content-type')?.includes('text/event-stream')||!res.body)throw Error('服务器未返回事件流')
      for await(const ev of readSSE(res.body)){
        const data=JSON.parse(ev.data)
        if(ev.event==='delta'){if(data.reset)text.value='';text.value+=data.text}
        else if(ev.event==='done'){text.value=data.content;result.value=data}
        else if(ev.event==='error')throw Error(data.message)
      }
      if(!result.value)throw Error('连接中断，草稿未保存')
    }catch(e){if(e.name==='AbortError')stopped.value=true;else error.value=e.message}
    finally{streaming.value=false;controller=null}
  }
  const stop=()=>controller?.abort()
  onBeforeUnmount(stop)
  return {text,streaming,error,result,stopped,start,stop}
}

