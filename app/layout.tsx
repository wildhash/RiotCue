import type { Metadata } from "next";
import "@livekit/components-styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "RiotCue — Camera-on Chaos",
  description: "RiotCue: the live, multiplayer charades party with private prompts, synced countdowns, and instant wins."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a className="brand" href="/">RIOT<span>CUE</span><span className="brand-dot">.</span></a>
          <span className="topbar-tag">CAMERA-ON CHAOS</span>
        </header>
        <main>{children}</main>
        <footer className="footer">RIOTCUE · MAKE A SCENE, NOT A SPEECH.</footer>
      </body>
    </html>
  );
}
