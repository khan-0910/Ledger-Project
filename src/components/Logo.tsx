export default function LedgerLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="var(--ink)" />
      <circle cx="27" cy="31" r="11" stroke="var(--accent)" strokeWidth="4.5" />
      <circle cx="27" cy="31" r="3.4" fill="var(--accent)" />
      <path d="M41 22.5l10 8.5M41 39.5l10-8.5" stroke="var(--accent)" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
