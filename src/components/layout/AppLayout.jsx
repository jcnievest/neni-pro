import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import MobileNav from "./MobileNav";
import TrialBanner from "@/components/TrialBanner";
import AccessGate from "@/components/AccessGate";

export default function AppLayout() {
  return (
    <div className="bg-background max-w-lg mx-auto relative" style={{ minHeight: "100dvh" }}>
      <TopBar />
      <TrialBanner />
      <main className="px-4 pt-4 pb-24" style={{ WebkitOverflowScrolling: "touch" }}>
        <AccessGate>
          <Outlet />
        </AccessGate>
      </main>
      <MobileNav />
    </div>
  );
}
