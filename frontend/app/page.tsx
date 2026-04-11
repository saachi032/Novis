import { NavBar } from "@/components/NavBar";
import { HeroSection } from "@/components/HeroSection";
import { StatsBalanceCards } from "@/components/StatsBalanceCards";
import { DashboardSection } from "@/components/DashboardSection";
import { StrategySection } from "@/components/StrategySection";
import { FooterSection } from "@/components/FooterSection";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-brand-bg text-brand-black">
      <div
        className="pointer-events-none absolute -left-32 top-[40vh] h-[28rem] w-[28rem] rounded-full bg-brand-gray/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-[20vh] h-[22rem] w-[22rem] rounded-full bg-brand-gray/20"
        aria-hidden
      />

      <NavBar />
      <HeroSection />
      <StatsBalanceCards />

      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="h-px w-full bg-brand-gray/50" aria-hidden />
      </div>

      <DashboardSection />
      <StrategySection />
      <FooterSection />
    </div>
  );
}
