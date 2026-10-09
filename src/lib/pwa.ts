import { create } from "zustand";
import { registerSW } from "virtual:pwa-register";
interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{outcome:string}> }
interface PwaState { offlineReady: boolean; updateReady: boolean; online: boolean; install: InstallEvent | null; update: () => Promise<void> }
export const usePwaStore = create<PwaState>(()=>({offlineReady:false,updateReady:false,online:typeof navigator === "undefined" ? true : navigator.onLine,install:null,update:async()=>{}}));
export function initializePwa() {
 const update = registerSW({onOfflineReady:()=>usePwaStore.setState({offlineReady:true}),onNeedRefresh:()=>usePwaStore.setState({updateReady:true})});
 usePwaStore.setState({update:()=>update(true)});
 window.addEventListener("online",()=>usePwaStore.setState({online:true}));
 window.addEventListener("offline",()=>usePwaStore.setState({online:false}));
 window.addEventListener("beforeinstallprompt",(event)=>{event.preventDefault();usePwaStore.setState({install:event as InstallEvent});});
 window.addEventListener("appinstalled",()=>usePwaStore.setState({install:null}));
}
