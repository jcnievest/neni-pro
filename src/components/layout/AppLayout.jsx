import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <TopBar />
      <main className="px-4 pt-4 pb-24">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}