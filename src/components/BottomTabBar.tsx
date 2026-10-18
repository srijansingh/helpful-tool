import { NavLink } from "react-router-dom";
import { House as Home, FolderOpen, Scan as ScanLine, GridFour as Grid2X2, Gear as Settings } from "@phosphor-icons/react";
export const DESTINATIONS = [{to:"/",label:"Home",icon:Home},{to:"/files",label:"Files",icon:FolderOpen},{to:"/scan",label:"Scan",icon:ScanLine},{to:"/tools",label:"Tools",icon:Grid2X2},{to:"/settings",label:"Settings",icon:Settings}];
export function BottomTabBar(){return <nav className="app-tabs" aria-label="Main navigation">{DESTINATIONS.map(({to,label,icon:Icon})=><NavLink key={to} end={to==="/"} to={to} className={({isActive})=>isActive ? "tab active" : "tab"}><Icon size={21} aria-hidden="true"/><span>{label}</span></NavLink>)}</nav>}
