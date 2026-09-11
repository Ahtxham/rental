import { cn } from "@/lib/cn";

/**
 * Traffic drifting across the hero.
 *
 * Decoration, and it behaves like decoration: `aria-hidden`, no pointer events,
 * and faint enough that the headline over it loses no contrast. The point is a
 * sense of movement behind a page about going somewhere, not a picture anybody
 * is meant to look at.
 *
 * Three shapes rather than one repeated, and they are the shapes Musafir
 * actually rents: a saloon, a hatchback and a van. Nobody will consciously
 * notice; a single silhouette repeated five times is what they would notice.
 *
 * **Pure CSS transforms.** Every vehicle is one `translate3d` on the compositor,
 * so this costs no JavaScript, no layout and no paint per frame. The animation
 * is switched off entirely under `prefers-reduced-motion` (see globals.css)
 * rather than merely slowed, because a wall of cars frozen mid-air is worse
 * than no cars at all.
 */

/**
 * Front to the right, because that is the way they are travelling.
 *
 * The one cue that makes a silhouette read as a car rather than a lozenge is
 * the roofline: the cabin has to sit clearly PROUD of the bonnet and the boot.
 * At these sizes and opacities nothing else survives, so the paths spend their
 * detail there and almost nowhere else.
 */
const SHAPES = {
  saloon: {
    viewBox: "0 0 164 50",
    body:
      "M10,36 L8,29 Q9,24 15,23 L46,21 L62,7 Q65,5 70,5 L104,5 Q109,5 112,8 " +
      "L124,21 L148,24 Q156,26 156,31 L156,36 Z",
    wheels: [
      [38, 37],
      [130, 37],
    ],
    r: 9,
  },
  hatch: {
    viewBox: "0 0 136 50",
    body:
      "M8,36 L7,28 Q8,22 14,21 L30,19 L50,6 Q53,4 58,4 L88,4 Q93,4 96,7 " +
      "L108,20 L124,23 Q131,25 131,30 L131,36 Z",
    wheels: [
      [32, 37],
      [106, 37],
    ],
    r: 8.5,
  },
  van: {
    viewBox: "0 0 172 54",
    body:
      "M8,40 L8,14 Q8,7 17,7 L112,7 Q120,7 126,12 L146,28 Q160,31 160,37 L160,40 Z",
    wheels: [
      [42, 41],
      [128, 41],
    ],
    r: 9.5,
  },
} as const;

/**
 * The lanes, and why they all sit in the lower half.
 *
 * Nothing crosses the headline. The h1 finishes around 40% of the hero's
 * height, so the road starts below it: what is left above is sky, and the
 * effect reads as a composed scene rather than as clip art wandering over the
 * most important sentence on the site.
 *
 * Depth is carried by four things at once, because any one alone reads as an
 * accident: nearer vehicles are lower, bigger, faster and less faint. Delays
 * are NEGATIVE so the road is already busy on the first frame instead of empty
 * for the first twenty seconds.
 */
const LANES = [
  { shape: "hatch", top: "46%", width: 78, seconds: 39, delay: -11, opacity: 0.05 },
  { shape: "saloon", top: "56%", width: 96, seconds: 34, delay: -26, opacity: 0.06 },
  { shape: "van", top: "65%", width: 122, seconds: 43, delay: -5, opacity: 0.08 },
  { shape: "saloon", top: "73%", width: 142, seconds: 27, delay: -18, opacity: 0.1 },
  { shape: "hatch", top: "81%", width: 168, seconds: 22, delay: -2, opacity: 0.14 },
  // The nearest lane stops at 89%, not lower: a fifth of this van's height
  // hangs below its own top edge, and any further down the hero clipped its
  // wheels off and it read as a smudge rather than a vehicle.
  { shape: "van", top: "89%", width: 220, seconds: 16, delay: -7, opacity: 0.19 },
] as const;

const Vehicle = ({ shape, width }: { shape: keyof typeof SHAPES; width: number }) => {
  const { viewBox, body, wheels, r } = SHAPES[shape];
  return (
    <svg
      viewBox={viewBox}
      width={width}
      className="h-auto fill-paper"
      role="presentation"
      focusable="false"
    >
      <path d={body} />
      {wheels.map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r={r} />
      ))}
    </svg>
  );
};

export const HeroTraffic = ({ className }: { className?: string }) => (
  <div
    className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    aria-hidden
  >
    {/* The road they are on.
    
        A silhouette floating on flat colour reads as clip art; the same
        silhouette over ground reads as a scene. Two parts do that work: the
        surface, which deepens the green towards the bottom and so lifts the
        pale vehicles off it without touching the text above, and a single
        pale hairline at the very bottom for the far kerb. Both sit BEHIND the
        traffic. */}
    <div
      className="absolute inset-x-0 bottom-0 h-2/5"
      style={{
        backgroundImage: "linear-gradient(to bottom, transparent, rgba(4, 21, 15,0.55))",
      }}
    />
    <div
      className="absolute inset-x-0 bottom-0 h-px"
      style={{
        backgroundImage:
          "linear-gradient(to right, transparent, rgba(240, 181, 63,0.4) 22%, rgba(240, 181, 63,0.4) 78%, transparent)",
      }}
    />
    {LANES.map((lane, index) => (
      <div
        key={index}
        className="hero-drive absolute start-0"
        style={{
          top: lane.top,
          opacity: lane.opacity,
          animationDuration: `${lane.seconds}s`,
          animationDelay: `${lane.delay}s`,
        }}
      >
        <Vehicle shape={lane.shape} width={lane.width} />
      </div>
    ))}
  </div>
);
