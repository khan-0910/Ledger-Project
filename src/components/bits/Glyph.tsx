import React from 'react'

/**
 * LEDGER GLYPHS — one coherent vector icon family.
 * Ink-stroke style (matches the sticker system): 2.4 stroke, round caps.
 * Replaces every interface emoji; emojis in *user data* are ignored for display.
 */

export type GlyphName =
  // categories
  | 'food' | 'groceries' | 'education' | 'transport' | 'entertainment'
  | 'shopping' | 'living' | 'income' | 'other'
  // concept marks
  | 'lock' | 'party' | 'eye' | 'eye-off' | 'shield' | 'coin' | 'sprout'
  | 'trend-up' | 'trend-down' | 'sun' | 'repeat' | 'box' | 'sparkle'
  // methods
  | 'upi' | 'card' | 'cash' | 'bank'
  // goals / recurring seed glyphs
  | 'target' | 'laptop' | 'beach' | 'cushion' | 'pop' | 'wifi' | 'gradcap'
  | 'phone' | 'bus' | 'bulb' | 'pill' | 'chart' | 'compass' | 'search'
  | 'rocket' | 'coffee' | 'movie' | 'book' | 'food-simple'

const P = { stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const

const BODY: Record<GlyphName, React.ReactNode> = {
  food: <><path {...P} d="M7 4v7.5a2.5 2.5 0 0 1-2.5 2.5V20M4.5 4v3M9.5 4v3M14.5 12h6.5l-1 8h-4.5zM14.5 12c0-3 1.5-7 4-8" /></>,
  groceries: <><path {...P} d="M5 9h14l-1.2 9.5a2 2 0 0 1-2 1.5H8.2a2 2 0 0 1-2-1.5zM8.5 9a3.5 3.5 0 0 1 7 0" /></>,
  education: <><path {...P} d="M3.5 8.5 12 5l8.5 3.5L12 12zM7 10.5V15c0 1.4 2.2 2.8 5 2.8s5-1.4 5-2.8v-4.5M20.5 8.5V14" /></>,
  transport: <><path {...P} d="M5 16h14l-1.5-7.5a2 2 0 0 0-2-1.5h-7a2 2 0 0 0-2 1.5zM4 16h16v3h-2.5a1.5 1.5 0 0 1-3 0h-3a1.5 1.5 0 0 1-3 0H4zM7 11h10M7.5 13.5h.01M16.5 13.5h.01" /></>,
  entertainment: <><rect {...P} x="3.5" y="6" width="17" height="12.5" rx="2.5" /><path {...P} d="m10.5 9.8 4.5 2.5-4.5 2.5z" /></>,
  shopping: <><path {...P} d="M5.5 8.5h13l1 11h-15zM8.5 11V7a3.5 3.5 0 0 1 7 0v4" /></>,
  living: <><path {...P} d="m4 11 8-6.5L20 11M6.5 9.5V19h11V9.5M10.5 19v-5h3v5" /></>,
  income: <><path {...P} d="M12 4v16M6.5 8.5 12 4l5.5 4.5M18.5 15.5 13 20" transform="rotate(0)"/></>,
  other: <><path {...P} d="M5 8.5 12 5l7 3.5v7L12 19l-7-3.5zM5 8.5 12 12l7-3.5M12 12v7" /></>,
  lock: <><rect {...P} x="5.5" y="10.5" width="13" height="9.5" rx="2.5" /><path {...P} d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2" /></>,
  party: <><path {...P} d="m4.5 19.5 6-15 9.5 9.5zM10.5 4.5l3 3M20 14l-9.5-4.5" /><circle cx="6" cy="6" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="3.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="21" cy="8" r="1.1" fill="currentColor" stroke="none" /></>,
  eye: <><path {...P} d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" /><circle {...P} cx="12" cy="12" r="2.6" /></>,
  'eye-off': <><path {...P} d="M4 4l16 16M10 5.3A9.8 9.8 0 0 1 12 5c5.5 0 9 7 9 7a15 15 0 0 1-2.5 3.2M6.7 6.7A14.6 14.6 0 0 0 3 12s3.5 7 9 7a8.9 8.9 0 0 0 3.7-.8" /><path {...P} d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  shield: <><path {...P} d="M12 3.5 19 6v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6zM9.5 11.5l1.8 1.8 3.4-3.6" /></>,
  coin: <><circle {...P} cx="12" cy="12" r="8.5" /><path {...P} d="M9.5 9.5h5M12 9.5v7M9.8 13.5a2.3 2.3 0 0 0 4.4 0" /></>,
  sprout: <><path {...P} d="M12 20v-7M12 13c0-3.5-2.5-6-6-6 0 3.5 2.5 6 6 6zM12 13c0-3 2-5 5-5 0 3-2 5-5 5z" /></>,
  'trend-up': <><path {...P} d="m4 16 5-5 3.5 3.5L18 9M14 9h4v4" /></>,
  'trend-down': <><path {...P} d="m4 8.5 5 5 3.5-3.5L18 15.5M14 15.5h4v-4" /></>,
  sun: <><circle {...P} cx="12" cy="12" r="4.2" /><path {...P} d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" /></>,
  repeat: <><path {...P} d="M5.5 9.5A6.5 6.5 0 0 1 18 7.5M18.5 14.5A6.5 6.5 0 0 1 6 16.5M18 4.5v3h-3M6 19.5v-3h3" /></>,
  box: <><rect {...P} x="5" y="8" width="14" height="11" rx="2" /><path {...P} d="M4 8h16M10 8V5.5h4V8M10.5 12.5h3" /></>,
  sparkle: <><path {...P} d="M12 4l1.8 6.2L20 12l-6.2 1.8L12 20l-1.8-6.2L4 12l6.2-1.8z" /></>,
  upi: <><rect {...P} x="7" y="3.5" width="10" height="17" rx="2.5" /><path {...P} d="M10.5 17.5h3" /></>,
  card: <><rect {...P} x="3.5" y="6" width="17" height="12.5" rx="2.5" /><path {...P} d="M3.5 10h17M7 15h3.5" /></>,
  cash: <><rect {...P} x="3.5" y="7" width="17" height="10.5" rx="2" /><circle {...P} cx="12" cy="12.2" r="2.4" /><path {...P} d="M6.2 9.8h.01M17.8 14.6h.01" /></>,
  bank: <><path {...P} d="m4 9 8-5 8 5M5.5 9.5V18M9.5 9.5V18M14.5 9.5V18M18.5 9.5V18M4 18.5h16M4 21h16" transform="translate(0 -0.5)" /></>,
  target: <><circle {...P} cx="12" cy="12" r="8.5" /><circle {...P} cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  laptop: <><rect {...P} x="5" y="5.5" width="14" height="9.5" rx="1.8" /><path {...P} d="M3 18.5h18M10 18.5v-1.5h4v1.5" /></>,
  beach: <><path {...P} d="M3.5 18.5c3-1.5 6-1.5 8.5 0 2.5-1.5 5.5-1.5 8.5 0M12 15.5V8M12 8a5.5 5.5 0 0 1 7 3.5M12 8a5.5 5.5 0 0 0-7.5 2M17.5 5.5l.9-1" /></>,
  cushion: <><path {...P} d="M6 6.5h12a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2zM12 5v16M4 12h16" opacity="0.001" /><path {...P} d="M4.5 9.5h15v8a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2zM7 9.5v10M12 16.2c-1.8 0-3-1-3-2.4s1.2-2.4 3-2.4" /></>,
  pop: <><path {...P} d="M12 4.5c3 0 5.5 2.2 5.5 5 0 3.8-3.5 4-3.5 7.5h-4c0-3.5-3.5-3.7-3.5-7.5 0-2.8 2.5-5 5.5-5zM10 20.5h4" /></>,
  wifi: <><path {...P} d="M4 9.5a12.5 12.5 0 0 1 16 0M7 13a8.5 8.5 0 0 1 10 0M10 16.4a4.5 4.5 0 0 1 4 0M12 20h.01" /></>,
  gradcap: <><path {...P} d="M3.5 9.5 12 6l8.5 3.5L12 13zM6.5 11v4.2c0 1.2 2.4 2.4 5.5 2.4s5.5-1.2 5.5-2.4V11" /></>,
  phone: <><path {...P} d="M7 3.5h10a1.5 1.5 0 0 1 0 3H7a1.5 1.5 0 0 1 0-3zM8.5 6.5 8 17a2.5 2.5 0 0 0 5 .3l.5-10.8a2.5 2.5 0 0 0-5-.3z" transform="rotate(-8 12 12)" /></>,
  bus: <><path {...P} d="M5 5.5h14V17a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17zM5 10h14M8 5.5V10M8 18.5V20M16 18.5V20M7.5 13.5h.01M16.5 13.5h.01" /></>,
  bulb: <><path {...P} d="M12 4a5.5 5.5 0 0 1 3 10.1V17h-6v-2.9A5.5 5.5 0 0 1 12 4zM10 20h4" /></>,
  pill: <><rect {...P} x="4" y="9" width="16" height="7" rx="3.5" transform="rotate(-35 12 12)" /><path {...P} d="m9 14.5 6-5" /></>,
  chart: <><path {...P} d="M4 19.5h16M6.5 19.5V12M11 19.5V8M15.5 19.5v-6M20 19.5V5.5" /></>,
  compass: <><circle {...P} cx="12" cy="12" r="8.5" /><path {...P} d="m9 15 1.8-4.2L15 9l-1.8 4.2z" /></>,
  search: <><circle {...P} cx="10.5" cy="10.5" r="6.5" /><path {...P} d="m15.5 15.5 5 5" /></>,
  rocket: <><path {...P} d="M9 15c-2.5-1-3.5-3-3.5-6C5.5 5 9 2.5 12 2.5S18.5 5 18.5 9c0 3-1 5-3.5 6M9 15l-1.8 5.5L10 19l2 2 2-2 2.8 1.5L15 15M12 9.5h.01" /></>,
  coffee: <><path {...P} d="M5.5 8.5h11V15a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4zM16.5 10h1.5a2.5 2.5 0 0 1 0 5h-1.5M8 5c0-1 .5-1 .5-2M11.5 5c0-1 .5-1 .5-2" /></>,
  movie: <><rect {...P} x="3.5" y="6" width="17" height="12.5" rx="2.5" /><path {...P} d="M7.5 6v12.5M16.5 6v12.5M3.5 9h4M3.5 15h4M16.5 9h4M16.5 15h4" /></>,
  book: <><path {...P} d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21zM4 5.5v15.5" /><path {...P} d="M8.5 7.5H16" /></>,
  'food-simple': <><circle {...P} cx="12" cy="12" r="8.5" /><path {...P} d="M8.5 12h7" /></>,
}

export function Glyph({ name, size = 20, className, style }: { name: GlyphName; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {BODY[name] ?? BODY.other}
    </svg>
  )
}

/** Map legacy stored emoji (user data) to a glyph so old rows keep an icon. */
export const EMOJI_TO_GLYPH: Record<string, GlyphName> = {
  '🍜': 'food', '🧺': 'groceries', '📚': 'book', '🛺': 'bus', '🎬': 'movie', '🛍️': 'shopping', '🛡️': 'shield',
  '🏠': 'living', '💸': 'income', '📦': 'box', '📱': 'phone', '💳': 'card', '💵': 'cash', '🏦': 'bank',
  '🔒': 'lock', '🎉': 'party', '🎓': 'gradcap', '🎯': 'target', '🖥️': 'laptop', '🏖️': 'beach', '🛟': 'cushion',
  '🍿': 'pop', '🎧': 'upi', '📶': 'wifi', '📈': 'trend-up', '📉': 'trend-down', '🪙': 'coin', '🌱': 'sprout',
  '🌤️': 'sun', '🔁': 'repeat', '🪴': 'sprout', '🧭': 'compass', '📊': 'chart', '💪': 'shield', '👥': 'party',
  '🚌': 'bus', '💡': 'bulb', '🌐': 'upi', '💊': 'pill', '🧾': 'box', '🏆': 'target', '✈️': 'rocket',
  '🎁': 'box', '🚗': 'bus', '🎹': 'entertainment', '🎮': 'entertainment', '🐶': 'party', '💍': 'sparkle',
}

/** Reverse mapping: chosen glyph → a legacy emoji value stored in data. */
const GLYPH_NAMES = new Set<string>(Object.values(EMOJI_TO_GLYPH))

export function glyphFor(name: string | undefined, fallback: GlyphName = 'target'): GlyphName {
  if (!name) return fallback
  if (EMOJI_TO_GLYPH[name]) return EMOJI_TO_GLYPH[name]
  if (GLYPH_NAMES.has(name)) return name as GlyphName // glyph names stored directly
  return fallback
}

/** Pick a stored legacy emoji that matches the chosen glyph (keeps old data compatible). */
export function emojiForGlyph(g: GlyphName): string {
  for (const [emoji, name] of Object.entries(EMOJI_TO_GLYPH)) {
    if (name === g) return emoji
  }
  return '🎯'
}
