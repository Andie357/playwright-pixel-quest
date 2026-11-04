import Link from "next/link";
import type { ReactNode } from "react";

import { PixelLandscape, type SceneTheme } from "@/components/pixel/PixelLandscape";
import { HERO, Sprite } from "@/components/pixel/Sprite";
import { Panel, PixelHeading } from "@/components/pixel/ui";

export function GameShell({ theme, children }: { theme: SceneTheme; children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col">
      <PixelLandscape theme={theme} />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </main>
  );
}

export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <GameShell theme="lobby">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <Sprite art={HERO} scale={6} className="animate-bob" />
        <PixelHeading className="text-sm md:text-lg">
          {label}
          <span className="animate-blink">...</span>
        </PixelHeading>
      </div>
    </GameShell>
  );
}

export function MessageScreen({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <GameShell theme="dungeon">
      <div className="flex flex-1 items-center justify-center p-6">
        <Panel className="flex max-w-xl flex-col items-center gap-5 p-8 text-center">
          <PixelHeading className="text-lg text-gold md:text-2xl">{title}</PixelHeading>
          <p className="text-2xl">{message}</p>
          {action ?? (
            <Link href="/" className="pixel-btn">
              Back to start
            </Link>
          )}
        </Panel>
      </div>
    </GameShell>
  );
}
