/** The TrainerDex wordmark. Pure type — no borrowed logo art. */
export function Logo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  if (size === 'sm') {
    return (
      <span className="font-display inline-flex items-baseline gap-1 text-[11px] leading-none tracking-tight">
        <span className="text-gold">✦</span>
        <span className="text-paper">TRAINER</span>
        <span className="text-dex-red">DEX</span>
      </span>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <span className="font-display text-gold text-[clamp(10px,2.4vw,16px)] tracking-[0.4em]">THE</span>
      <div className="shine px-2">
        <h1 className="font-display m-0 text-[clamp(26px,7.5vw,64px)] leading-none tracking-tight" style={{ textShadow: '0.06em 0.06em 0 #1c1a24, 0.12em 0.12em 0 #8a6008' }}>
          <span className="text-paper">TRAINER</span>
          <span className="text-dex-red">DEX</span>
        </h1>
      </div>
      <span aria-hidden className="sparkle text-gold text-2xl">
        ✦
      </span>
    </div>
  )
}
