import { useMemo, type CSSProperties, type ReactNode } from "react";

import type { QuestTheme } from "@/lib/quests";

export type SceneTheme = QuestTheme | "lobby" | "victory";

const W = 192;
const H = 108;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Canvas {
  nodes: ReactNode[] = [];

  rect(x: number, y: number, w: number, h: number, fill: string, opacity?: number) {
    this.nodes.push(
      <rect
        key={this.nodes.length}
        x={Math.round(x)}
        y={Math.round(y)}
        width={Math.max(0, Math.round(w))}
        height={Math.max(0, Math.round(h))}
        fill={fill}
        opacity={opacity}
      />,
    );
  }

  group(children: (c: Canvas) => void, props: { className?: string; style?: CSSProperties }) {
    const inner = new Canvas();
    children(inner);
    this.nodes.push(
      <g key={this.nodes.length} className={props.className} style={props.style}>
        {inner.nodes}
      </g>,
    );
  }

  sky(colors: string[], bottom: number) {
    const band = bottom / colors.length;
    colors.forEach((color, i) => {
      this.rect(0, Math.floor(i * band), W, Math.ceil(band) + 1, color);
      // dithered seam between bands
      if (i > 0) {
        for (let x = (i % 2) * 2; x < W; x += 4) this.rect(x, Math.floor(i * band) - 1, 2, 1, color);
      }
    });
  }

  circle(cx: number, cy: number, r: number, fill: string, opacity?: number) {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      this.rect(cx - half, cy + dy, half * 2 + 1, 1, fill, opacity);
    }
  }

  ridge(rand: () => number, base: number, amp: number, step: number, fill: string, cap?: string) {
    const p1 = rand() * 10;
    const p2 = rand() * 10;
    for (let x = 0; x < W; x += step) {
      const n = Math.sin(x * 0.045 + p1) * 0.6 + Math.sin(x * 0.11 + p2) * 0.3 + (rand() - 0.5) * 0.15;
      const y = Math.round(base - amp * (0.5 + 0.5 * n));
      this.rect(x, y, step, H - y, fill);
      if (cap && y < base - amp * 0.7) this.rect(x, y, step, 2, cap);
    }
  }

  stars(rand: () => number, count: number, maxY: number) {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * maxY);
      const twinkle = rand() > 0.6;
      this.nodes.push(
        <rect
          key={this.nodes.length}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={rand() > 0.8 ? "#ffcd75" : "#f4f4f4"}
          className={twinkle ? "px-star" : undefined}
          style={twinkle ? { animationDelay: `${(rand() * 2.4).toFixed(2)}s` } : undefined}
        />,
      );
    }
  }

  cloud(x: number, y: number, size: number, color: string, duration: number, delay: number) {
    this.group(
      (c) => {
        c.rect(x, y + 2 * size, 12 * size, 3 * size, color);
        c.rect(x + 2 * size, y, 5 * size, 3 * size, color);
        c.rect(x + 6 * size, y + size, 4 * size, 2 * size, color);
        c.rect(x, y + 5 * size, 12 * size, size, "#94b0c2", 0.6);
      },
      { className: "px-cloud", style: { animationDuration: `${duration}s`, animationDelay: `${-delay}s` } },
    );
  }

  ground(y: number, top: string, fill: string, rand: () => number, speck?: string) {
    this.rect(0, y, W, H - y, fill);
    this.rect(0, y, W, 2, top);
    for (let x = 0; x < W; x += 3) if (rand() > 0.55) this.rect(x, y - 1, 1, 1, top);
    if (speck) {
      for (let i = 0; i < 40; i++) this.rect(Math.floor(rand() * W), y + 3 + Math.floor(rand() * (H - y - 3)), 2, 1, speck);
    }
  }

  pine(x: number, baseY: number, h: number, light: string, dark: string) {
    this.rect(x - 1, baseY - 3, 2, 3, "#733e39");
    const tiers = 3;
    const th = Math.max(3, Math.floor(h / tiers) + 1);
    for (let r = 0; r < h; r++) {
      const tier = Math.floor(r / (h / tiers));
      const within = r - Math.floor(tier * (h / tiers));
      const width = Math.min(1 + 2 * Math.floor(within * 0.9 + tier * 1.3), th * 2 + 3);
      const y = baseY - 3 - h + r;
      const left = x - Math.floor(width / 2);
      this.rect(left, y, width, 1, light);
      this.rect(x, y, Math.ceil(width / 2), 1, dark);
    }
  }

  castle(x: number, baseY: number, wall: string, shade: string) {
    const w = 44;
    const h = 22;
    this.rect(x, baseY - h, w, h, wall);
    this.rect(x + w - 8, baseY - h, 8, h, shade);
    for (let i = 0; i < w; i += 4) this.rect(x + i, baseY - h - 3, 2, 3, wall);
    // towers
    for (const tx of [x - 6, x + w - 4]) {
      this.rect(tx, baseY - h - 12, 10, h + 12, wall);
      this.rect(tx + 6, baseY - h - 12, 4, h + 12, shade);
      for (let i = 0; i < 10; i += 4) this.rect(tx + i, baseY - h - 15, 2, 3, wall);
      this.rect(tx + 3, baseY - h - 6, 3, 4, "#ffcd75");
    }
    // keep
    this.rect(x + 16, baseY - h - 16, 12, 16, wall);
    this.rect(x + 24, baseY - h - 16, 4, 16, shade);
    this.rect(x + 21, baseY - h - 26, 1, 10, "#0d0e17");
    this.rect(x + 22, baseY - h - 26, 6, 4, "#b13e53");
    this.rect(x + 19, baseY - h - 10, 4, 5, "#ffcd75");
    // gate
    this.rect(x + 18, baseY - 10, 8, 10, "#0d0e17");
    this.rect(x + 19, baseY - 11, 6, 1, "#0d0e17");
  }

  colosseum(x: number, baseY: number, w: number) {
    const h = 34;
    this.rect(x, baseY - h, w, h, "#94b0c2");
    this.rect(x, baseY - h, w, 2, "#f4f4f4");
    this.rect(x, baseY - 12, w, 12, "#566c86");
    for (let i = 0; i < w; i += 6) this.rect(x + i, baseY - h - 3, 3, 3, "#94b0c2");
    for (let row = 0; row < 2; row++) {
      const ry = baseY - h + 5 + row * 11;
      for (let i = 3; i < w - 4; i += 8) {
        this.rect(x + i, ry + 1, 5, 7, "#333c57");
        this.rect(x + i + 1, ry, 3, 1, "#333c57");
      }
    }
    for (let i = 3; i < w - 4; i += 8) this.rect(x + i, baseY - 9, 5, 9, "#1a1c2c");
    for (const fx of [x + 6, x + w / 2, x + w - 8]) {
      this.rect(fx, baseY - h - 14, 1, 11, "#0d0e17");
      this.rect(fx + 1, baseY - h - 14, 6, 4, "#b13e53");
    }
  }

  tower(cx: number, baseY: number) {
    const w = 26;
    const x = cx - w / 2;
    const top = 26;
    this.rect(x, top, w, baseY - top, "#566c86");
    this.rect(x + w - 7, top, 7, baseY - top, "#333c57");
    for (let y = top + 3; y < baseY; y += 5) {
      for (let i = ((y / 5) % 2) * 3; i < w - 7; i += 6) this.rect(x + i, y, 4, 1, "#333c57");
    }
    for (let i = -2; i < w + 2; i += 4) this.rect(x + i, top - 4, 2, 4, "#566c86");
    this.rect(x - 2, top - 1, w + 4, 2, "#94b0c2");
    // roof
    for (let r = 0; r < 18; r++) {
      const rw = 2 + r * 1.6;
      this.rect(cx - rw / 2, top - 22 + r, rw, 1, r % 4 === 0 ? "#5d275d" : "#b13e53");
    }
    this.rect(cx, top - 30, 1, 8, "#0d0e17");
    this.rect(cx + 1, top - 30, 7, 4, "#ffcd75");
    // glowing windows
    for (const [wx, wy] of [[x + 6, top + 10], [x + 13, top + 24], [x + 6, top + 40], [x + 13, top + 54]] as const) {
      this.circle(wx + 2, wy + 3, 5, "#ffcd75", 0.15);
      this.rect(wx, wy, 4, 6, "#ffcd75");
      this.rect(wx, wy, 4, 1, "#ef7d57");
    }
    this.rect(cx - 4, baseY - 12, 8, 12, "#0d0e17");
  }

  torch(x: number, y: number) {
    this.circle(x + 1, y - 4, 14, "#ffcd75", 0.08);
    this.circle(x + 1, y - 4, 8, "#ef7d57", 0.12);
    this.rect(x - 1, y, 5, 2, "#0d0e17");
    this.rect(x, y + 2, 3, 6, "#733e39");
    this.group(
      (c) => {
        c.rect(x - 1, y - 6, 5, 6, "#b13e53");
        c.rect(x, y - 9, 3, 8, "#ef7d57");
        c.rect(x + 1, y - 11, 1, 9, "#ffcd75");
      },
      { className: "px-flame" },
    );
  }

  bricks(top: number, bottom: number) {
    this.rect(0, top, W, bottom - top, "#333c57");
    for (let y = top; y < bottom; y += 6) {
      this.rect(0, y, W, 1, "#1a1c2c");
      const offset = (y / 6) % 2 === 0 ? 0 : 6;
      for (let x = offset; x < W; x += 12) this.rect(x, y, 1, 6, "#1a1c2c");
      for (let x = offset + 2; x < W; x += 24) this.rect(x, y + 1, 6, 1, "#566c86");
    }
  }

  volcano(cx: number, baseY: number) {
    const top = 34;
    for (let y = top; y < baseY; y++) {
      const half = 10 + (y - top) * 1.55;
      this.rect(cx - half, y, half * 2, 1, "#333c57");
      this.rect(cx + half * 0.25, y, half * 0.75, 1, "#1a1c2c");
    }
    this.rect(cx - 10, top, 20, 3, "#ef7d57");
    this.rect(cx - 6, top, 12, 2, "#ffcd75");
    for (const [sx, len] of [[-6, 22], [3, 32], [-1, 14]] as const) {
      for (let i = 0; i < len; i++) {
        const wobble = Math.round(Math.sin(i * 0.5) * 1.5);
        this.rect(cx + sx + wobble + Math.round(i * (sx < 0 ? -0.35 : 0.3)), top + 2 + i, 2, 1, i % 6 === 0 ? "#ffcd75" : "#ef7d57");
      }
    }
    this.circle(cx, top - 6, 16, "#ef7d57", 0.12);
  }

  embers(rand: () => number, count: number) {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rand() * W);
      const y = 70 + Math.floor(rand() * 30);
      this.nodes.push(
        <rect
          key={this.nodes.length}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={rand() > 0.5 ? "#ffcd75" : "#ef7d57"}
          className="px-ember"
          style={{ animationDuration: `${(3 + rand() * 4).toFixed(2)}s`, animationDelay: `${(-rand() * 6).toFixed(2)}s` }}
        />,
      );
    }
  }
}

function drawScene(theme: SceneTheme): ReactNode[] {
  const c = new Canvas();
  const rand = mulberry32(theme.length * 7919 + theme.charCodeAt(0) * 31);

  switch (theme) {
    case "lobby":
    case "victory": {
      const victory = theme === "victory";
      c.sky(victory ? ["#3b5dc9", "#41a6f6", "#73eff7", "#ffcd75"] : ["#29366f", "#3b5dc9", "#41a6f6", "#73eff7"], 80);
      c.circle(156, 24, 10, "#ffcd75");
      c.circle(156, 24, 14, "#ffcd75", 0.2);
      c.cloud(20, 14, 1, "#f4f4f4", 60, 10);
      c.cloud(90, 26, 1, "#f4f4f4", 80, 40);
      c.cloud(140, 8, 1, "#f4f4f4", 70, 5);
      c.ridge(rand, 70, 22, 4, "#566c86", "#f4f4f4");
      c.ridge(rand, 82, 8, 3, "#257179");
      c.castle(74, 88, "#94b0c2", "#566c86");
      c.ground(88, "#a7f070", "#38b764", rand, "#257179");
      if (victory) c.stars(rand, 30, 50);
      break;
    }
    case "forest": {
      c.sky(["#3b5dc9", "#41a6f6", "#73eff7", "#a7f070"], 78);
      c.circle(30, 20, 8, "#ffcd75");
      c.cloud(60, 12, 1, "#f4f4f4", 70, 20);
      c.cloud(130, 22, 1, "#f4f4f4", 90, 50);
      c.ridge(rand, 66, 20, 4, "#257179");
      for (let x = 2; x < W; x += 7) c.pine(x + Math.floor(rand() * 4), 82, 14 + Math.floor(rand() * 8), "#257179", "#1d5961");
      c.ground(86, "#a7f070", "#38b764", rand, "#257179");
      for (const [x, h] of [[10, 34], [36, 28], [160, 36], [184, 26], [140, 22]] as const) c.pine(x, 96, h, "#38b764", "#257179");
      break;
    }
    case "arena": {
      c.sky(["#5d275d", "#b13e53", "#ef7d57", "#ffcd75"], 78);
      c.circle(96, 52, 18, "#ffcd75");
      c.circle(96, 52, 24, "#ffcd75", 0.18);
      c.cloud(20, 18, 1, "#ef7d57", 80, 30);
      c.cloud(120, 10, 1, "#ef7d57", 70, 0);
      c.ridge(rand, 76, 10, 4, "#5d275d");
      c.colosseum(24, 90, 144);
      c.ground(90, "#ffcd75", "#e4a672", rand, "#ef7d57");
      break;
    }
    case "tower": {
      c.sky(["#0d0e17", "#1a1c2c", "#29366f", "#3b5dc9"], 84);
      c.stars(rand, 70, 70);
      c.circle(32, 22, 9, "#f4f4f4");
      c.rect(28, 18, 3, 2, "#94b0c2");
      c.rect(34, 25, 2, 2, "#94b0c2");
      c.circle(32, 22, 14, "#f4f4f4", 0.08);
      c.ridge(rand, 80, 16, 4, "#333c57");
      c.tower(120, 92);
      c.ridge(rand, 90, 6, 3, "#1a1c2c");
      c.ground(92, "#38b764", "#257179", rand, "#1d5961");
      break;
    }
    case "dungeon": {
      c.rect(0, 0, W, H, "#1a1c2c");
      c.bricks(0, 88);
      // arch doorway
      c.rect(80, 46, 32, 42, "#0d0e17");
      for (let r = 0; r < 8; r++) {
        const archWidth = 18 + r * 2;
        c.rect(96 - archWidth / 2, 38 + r, archWidth, 1, "#0d0e17");
      }
      c.rect(78, 44, 2, 44, "#566c86");
      c.rect(112, 44, 2, 44, "#566c86");
      for (let i = 0; i < 6; i++) c.rect(84 + i * 4, 46, 1, 42, "#333c57", 0.5);
      c.torch(42, 48);
      c.torch(148, 48);
      c.rect(0, 0, W, 14, "#0d0e17", 0.6);
      c.rect(0, 14, W, 10, "#0d0e17", 0.3);
      c.ground(88, "#94b0c2", "#566c86", rand);
      for (let x = 0; x < W; x += 16) c.rect(x + ((x / 16) % 2) * 8, 92, 1, 16, "#333c57");
      c.rect(0, 98, W, 1, "#333c57");
      break;
    }
    case "boss": {
      c.sky(["#0d0e17", "#5d275d", "#b13e53", "#ef7d57"], 84);
      c.stars(rand, 25, 30);
      c.cloud(10, 10, 1, "#5d275d", 50, 0);
      c.cloud(130, 18, 1, "#5d275d", 60, 30);
      c.ridge(rand, 82, 14, 4, "#5d275d");
      c.volcano(96, 92);
      c.embers(rand, 40);
      c.ridge(rand, 96, 8, 3, "#1a1c2c");
      c.ground(96, "#b13e53", "#0d0e17", rand);
      for (let x = 6; x < W; x += 22) c.rect(x, 100 + (x % 5), 8 + (x % 7), 1, "#ef7d57");
      break;
    }
  }

  return c.nodes;
}

export function PixelLandscape({ theme, className = "" }: { theme: SceneTheme; className?: string }) {
  const nodes = useMemo(() => drawScene(theme), [theme]);

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        shapeRendering="crispEdges"
        className="pixelated h-full w-full"
      >
        {nodes}
      </svg>
      <div className="absolute inset-0 bg-linear-to-b from-ink/40 via-ink/10 to-ink/55" />
    </div>
  );
}
