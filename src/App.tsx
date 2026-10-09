import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { BottomTabBar } from "./components/BottomTabBar";
import { PageLoading } from "./components/PageLoading";
import { ToastViewport } from "./components/ToastViewport";
import { CommandPalette } from "./components/CommandPalette";
import { ResultPanel } from "./components/ResultPanel";
export default function App(){const path=useLocation().pathname;const focused=["/edit","/reader"].includes(path);return <div className="flex min-h-screen bg-bg text-fg"><Sidebar/><div className="min-w-0 flex-1"><header className="mobile-header"><NavLink to="/" className="font-bold">Local<span className="text-accent">PDF</span></NavLink><span className="text-xs text-muted">Private. On your device.</span></header><main className={`workspace ${focused?"focused":""}`}><Suspense fallback={<PageLoading/>}><Outlet/></Suspense></main></div>{!focused&&<BottomTabBar/>}<ToastViewport/><CommandPalette/><ResultPanel/></div>}
