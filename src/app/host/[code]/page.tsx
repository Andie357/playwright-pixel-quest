import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingScreen } from "@/components/game/GameShell";
import { HostScreen } from "@/components/screens/HostScreen";

export const metadata: Metadata = {
  title: "Host Console - Playwright Pixel Quest",
  robots: { index: false },
};

export default function HostPage({ params }: PageProps<"/host/[code]">) {
  return (
    <Suspense fallback={<LoadingScreen label="Opening host console" />}>
      <HostScreen params={params} />
    </Suspense>
  );
}
