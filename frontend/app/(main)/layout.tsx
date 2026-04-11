import { NavBar } from "@/components/NavBar";
import { FooterSection } from "@/components/FooterSection";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
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
            {children}
            <FooterSection />
        </div>
    );
}
