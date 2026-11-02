'use client';
import {useEffect,useRef,useState} from 'react';
export function useForumLive(refresh:()=>void){const fn=useRef(refresh);fn.current=refresh;const [live,setLive]=useState(false);useEffect(()=>{let source:EventSource|null=null,fallback:ReturnType<typeof setInterval>|undefined,disposed=false;
 const update=()=>{if(!disposed&&document.visibilityState==='visible')fn.current();};
 const backup=()=>{if(!fallback)fallback=setInterval(update,5000);};
 const close=()=>{source?.close();source=null;if(fallback)clearInterval(fallback);fallback=undefined;setLive(false);};
 const open=()=>{close();if(disposed||document.visibilityState!=='visible'||!navigator.onLine)return;if(!('EventSource' in window)){backup();update();return;}source=new EventSource('/api/forum/stream');const ready=()=>{if(disposed)return;setLive(true);if(fallback)clearInterval(fallback);fallback=undefined;update();};source.addEventListener('ready',ready);source.addEventListener('change',update);source.addEventListener('unavailable',()=>{setLive(false);backup();});source.onerror=()=>{setLive(false);backup();};};
 const visibility=()=>document.visibilityState==='visible'?open():close();open();document.addEventListener('visibilitychange',visibility);window.addEventListener('online',open);window.addEventListener('offline',close);return()=>{disposed=true;close();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',open);window.removeEventListener('offline',close);};},[]);return live;}
export function ForumLiveBadge({live}:{live:boolean}){return <span className={'forum-live '+(live?'connected':'')}><span aria-hidden="true"/>{live?'Live updates':'Connecting to live updates…'}</span>;}
