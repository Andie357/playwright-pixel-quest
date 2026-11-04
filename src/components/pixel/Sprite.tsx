import { useMemo } from "react";

type Palette = Record<string, string>;

interface SpriteArt {
  rows: string[];
  palette: Palette;
}

const mirror = (half: string[]) => half.map((row) => row + [...row].reverse().join(""));

const OUTLINE = "#0d0e17";

export const HERO: SpriteArt = {
  rows: [
    "....rrr.....",
    "...rrr......",
    "..kkkkkk....",
    ".khhhhhhk...",
    ".khHhhhhk.w.",
    ".kkkkkkkk.w.",
    ".kskkssk..w.",
    ".kssssssk.w.",
    "..kkkkkk.yyy",
    ".kbbbbbbk.k.",
    "kbbyybbbbsk.",
    "kbbbbbbbbk..",
    ".kbbBBbbk...",
    ".knnk.knnk..",
    ".kkk...kkk..",
  ],
  palette: {
    k: OUTLINE,
    r: "#b13e53",
    h: "#94b0c2",
    H: "#f4f4f4",
    s: "#f4c29a",
    w: "#f4f4f4",
    y: "#ffcd75",
    b: "#3b5dc9",
    B: "#29366f",
    n: "#733e39",
  },
};

const BUG_ROWS = mirror([
  "..k....",
  "...k...",
  "....kkk",
  "..kkmmm",
  ".kmmmmm",
  ".kmWkmm",
  "kmmWWmm",
  "kmmmmmm",
  "kmmllll",
  ".kmmmmm",
  "..kk.kk",
  ".k...k.",
]);

export function enemyArt(body: string, belly: string): SpriteArt {
  return { rows: BUG_ROWS, palette: { k: OUTLINE, m: body, l: belly, W: "#f4f4f4" } };
}

export const ENEMIES: SpriteArt[] = [
  enemyArt("#38b764", "#a7f070"),
  enemyArt("#94b0c2", "#f4f4f4"),
  enemyArt("#5d275d", "#b13e53"),
  enemyArt("#ef7d57", "#ffcd75"),
];

export const BOSS: SpriteArt = {
  rows: mirror([
    "k...........",
    "kk.......k..",
    "kwk......kk.",
    "kwwk......kk",
    "kwwwk...kkkk",
    "kwwwwk.kmmmm",
    "kwwwwwkmmmmm",
    ".kwwwwkmmEEm",
    ".kwwwkmmmEkm",
    "..kwwkmmmmmm",
    "...kwkmmTmTm",
    "....kkmmmmmm",
    ".....kmmllll",
    ".....kmmllll",
    "....kmmkllll",
    "...kmmk.kmmm",
    "...kkk...kkk",
  ]),
  palette: {
    k: OUTLINE,
    w: "#5d275d",
    m: "#b13e53",
    l: "#ef7d57",
    E: "#ffcd75",
    T: "#f4f4f4",
  },
};

export const TROPHY: SpriteArt = {
  rows: mirror([
    "..kkkkkk",
    ".kkyyyyy",
    "k.kyYyyy",
    "k.kyYyyy",
    ".kkyYyyy",
    "...kyyyy",
    "....kyyy",
    ".....kky",
    "......ky",
    ".....kky",
    "....kyyy",
    "....kkkk",
  ]),
  palette: { k: OUTLINE, y: "#ffcd75", Y: "#f4f4f4" },
};

export const CHECK: SpriteArt = {
  rows: [
    ".......kk",
    "......kgk",
    ".....kgk.",
    "kk..kgk..",
    "kgkkgk...",
    ".kggk....",
    "..kk.....",
  ],
  palette: { k: OUTLINE, g: "#a7f070" },
};

export function Sprite({
  art,
  scale = 4,
  className = "",
  title,
}: {
  art: SpriteArt;
  scale?: number;
  className?: string;
  title?: string;
}) {
  const { width, height, rects } = useMemo(() => {
    const w = Math.max(...art.rows.map((r) => r.length));
    const out: { x: number; y: number; w: number; fill: string }[] = [];
    art.rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        const fill = art.palette[ch];
        let run = 1;
        while (fill && row[x + run] === ch) run++;
        if (fill) out.push({ x, y, w: run, fill });
        x += run;
      }
    });
    return { width: w, height: art.rows.length, rects: out };
  }, [art]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      className={`pixelated ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
