import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM",
  description: "Dark CRM System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${geist.variable} h-full`}>
      <body className="h-full bg-[var(--background)] text-[var(--text)]">
        {/* Innovative animated background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>

          {/* Circuit grid SVG overlay */}
          <div className="circuit-grid absolute inset-0" />

          {/* Aurora beam 1 — diagonal sweep top-left */}
          <div
            className="aurora-beam-1 absolute"
            style={{
              width: "140vw",
              height: "60vh",
              top: "-20vh",
              left: "-20vw",
              background:
                "linear-gradient(135deg, transparent 0%, rgba(201,140,10,0.06) 30%, rgba(201,140,10,0.12) 50%, rgba(201,140,10,0.06) 70%, transparent 100%)",
              transform: "rotate(-15deg)",
              filter: "blur(60px)",
            }}
          />

          {/* Aurora beam 2 — bottom-right accent */}
          <div
            className="aurora-beam-2 absolute"
            style={{
              width: "120vw",
              height: "50vh",
              bottom: "-15vh",
              right: "-20vw",
              background:
                "linear-gradient(315deg, transparent 0%, rgba(34,211,238,0.05) 30%, rgba(124,58,237,0.08) 55%, rgba(34,211,238,0.04) 75%, transparent 100%)",
              transform: "rotate(10deg)",
              filter: "blur(80px)",
            }}
          />

          {/* Center pulse node */}
          <div
            className="pulse-node absolute rounded-full"
            style={{
              width: 320,
              height: 320,
              top: "35%",
              left: "55%",
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, rgba(201,140,10,0.10) 0%, rgba(201,140,10,0.04) 40%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* Edge node top-right */}
          <div
            className="pulse-node-2 absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              top: "5%",
              right: "10%",
              background:
                "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
          />

          {/* Edge node bottom-left */}
          <div
            className="pulse-node-3 absolute rounded-full"
            style={{
              width: 240,
              height: 240,
              bottom: "8%",
              left: "5%",
              background:
                "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)",
              filter: "blur(55px)",
            }}
          />

          {/* Scanline effect */}
          <div className="scanlines absolute inset-0" />
        </div>

        <div className="relative h-full" style={{ zIndex: 1 }}>
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
