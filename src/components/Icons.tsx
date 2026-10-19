import React from 'react'

export interface IconProps {
  size?: number
  className?: string
  strokeWidth?: number
}

function Svg({ size = 20, className, strokeWidth = 1.9, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const Eye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const EyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6 0 9.5 7 9.5 7a17.4 17.4 0 0 1-2.2 3.2M6.1 6.1A16.6 16.6 0 0 0 2.5 12s3.5 7 9.5 7a9.4 9.4 0 0 0 4-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Svg>
)

export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const Search = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.8-3.8" />
  </Svg>
)

export const X = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const ChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
  </Svg>
)

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Svg>
)

export const ChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />
  </Svg>
)

export const Trash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20l1-13" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
)

export const Pencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20l.9-3.6L16.4 4.9a1.6 1.6 0 0 1 2.3 0l.4.4a1.6 1.6 0 0 1 0 2.3L7.6 19.1 4 20Z" />
  </Svg>
)

export const Download = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
    <path d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
  </Svg>
)

export const Upload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 14V4m0 0L8 8m4-4 4 4" />
    <path d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
  </Svg>
)

export const Sun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)

export const Moon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Svg>
)

export const Gear = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19 12a7 7 0 0 0-.2-1.6l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.8-1.6L13.3 2h-2.6l-.4 2.9a7 7 0 0 0-2.8 1.6l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .5.1 1.1.2 1.6l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.8 1.6l.4 2.9h2.6l.4-2.9a7 7 0 0 0 2.8-1.6l2.3 1 2-3.4-2-1.5c.1-.5.2-1.1.2-1.6Z" />
  </Svg>
)

export const Home = (p: IconProps) => (
  <Svg {...p}>
    <path d="m3.5 10.5 8.5-7 8.5 7" />
    <path d="M5.5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h10A1.5 1.5 0 0 0 18.5 19V9.5" />
  </Svg>
)

export const ListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8.5 6h12M8.5 12h12M8.5 18h12" />
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
  </Svg>
)

export const Pie = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
    <path d="M14.5 2.6A9 9 0 0 1 21.4 9.5h-6.9V2.6Z" />
  </Svg>
)

export const Target = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Svg>
)

export const Repeat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9a5 5 0 0 1 5-5h9m0 0-3-3m3 3-3 3" />
    <path d="M20 15a5 5 0 0 1-5 5H6m0 0 3 3m-3-3 3-3" />
  </Svg>
)

export const Logout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
    <path d="M10 8l-4 4 4 4M6 12h9" />
  </Svg>
)

export const Wallet = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2.5" />
    <path d="M3 9.5h18" />
    <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
)

export const Lock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
)

export const Shield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8 19.5 6v6c0 4.8-3.2 7.7-7.5 9.2C7.7 19.7 4.5 16.8 4.5 12V6L12 2.8Z" />
  </Svg>
)

export const Party = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20 10 6l8 8-14 6Z" />
    <path d="M10 6 6.5 14.5 18 14 10 6Z" fill="currentColor" stroke="none" opacity="0.25" />
    <path d="M15 2.5v2M20.5 5l-1.4 1.4M21.5 11h-2" />
  </Svg>
)

export const Calendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 9.5h17M8 2.8V6M16 2.8V6" />
  </Svg>
)

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
)

export const Alert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 2.8 19.5h18.4L12 3Z" />
    <path d="M12 10v4.2" />
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
)

export const ArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />
  </Svg>
)

export const Filter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Svg>
)

export const Sparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
  </Svg>
)

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </Svg>
)
