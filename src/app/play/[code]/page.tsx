import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingScreen } from "@/components/game/GameShell";
import { PlayScreen } from "@/components/screens/PlayScreen";

export const metadata: Metadata = {
  title: "Join the Quest - Playwright Pixel Quest",
  robots: { index: false },
};

export default function PlayPage({ params }: PageProps<"/play/[code]">) {
  return (
    <Suspense fallback={<LoadingScreen label="Joining the party" />}>
      <PlayScreen params={params} />
    </Suspense>
  );
}
