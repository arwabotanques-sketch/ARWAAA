import { useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

// ─── Brand Colours ────────────────────────────────────────────────────────────
export const C = {
  green:  "#1a3d2b",
  olive:  "#4a6741",
  gold:   "#c9a84c",
  ivory:  "#f5f0e8",
  cream:  "#faf8f3",
  dark:   "#0f2419",
  text:   "#2c2c2c",
  muted:  "#5a7a5a",
} as const;

// ─── Global CSS ───────────────────────────────────────────────────────────────
export const GLOBAL_CSS = `
  @keyframes floatLeaf {
    0%,100% { transform: translateY(0) rotate(0deg); }
    33%      { transform: translateY(-22px) rotate(6deg); }
    66%      { transform: translateY(-10px) rotate(-4deg); }
  }
  @keyframes shimmerBar {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes bounceY {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(8px); }
  }
  @keyframes sunPulse {
    0%,100% { opacity: 0.25; }
    50%     { opacity: 0.55; }
  }
  @keyframes waPulse {
    0%,100% { box-shadow: 0 0 0 0   rgba(37,211,102,0.45); }
    50%     { box-shadow: 0 0 0 10px rgba(37,211,102,0);    }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes soapBubble {
    0%   { transform: translateY(0) scale(1) translateX(0); opacity: 0; }
    10%  { opacity: 0.6; }
    50%  { transform: translateY(-40vh) scale(1.1) translateX(15px); }
    90%  { opacity: 0.2; }
    100% { transform: translateY(-90vh) scale(0.7) translateX(-10px); opacity: 0; }
  }
  @keyframes waterRipple {
    0%   { transform: scale(0); opacity: 0.6; }
    100% { transform: scale(3.5); opacity: 0; }
  }
  @keyframes gradientShift {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }
  @keyframes glowPulse {
    0%,100% { box-shadow: 0 0 8px rgba(201,168,76,0.2); }
    50%      { box-shadow: 0 0 24px rgba(201,168,76,0.5), 0 0 48px rgba(201,168,76,0.15); }
  }
  @keyframes textShimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes floatUp {
    0%   { transform: translateY(0);    opacity: 0; }
    15%  { opacity: 0.7; }
    85%  { opacity: 0.4; }
    100% { transform: translateY(-80vh); opacity: 0; }
  }
  @keyframes tiltReset {
    to { transform: perspective(1000px) rotateX(0deg) rotateY(0deg); }
  }
  .leaf-1  { animation: floatLeaf 6s ease-in-out infinite; }
  .leaf-2  { animation: floatLeaf 8s ease-in-out infinite 1.2s; }
  .leaf-3  { animation: floatLeaf 7s ease-in-out infinite 2.4s; }
  .leaf-4  { animation: floatLeaf 9s ease-in-out infinite 0.6s; }
  .leaf-5  { animation: floatLeaf 5s ease-in-out infinite 3.1s; }
  .bounce  { animation: bounceY  2s ease-in-out infinite; }
  .sun     { animation: sunPulse 5s ease-in-out infinite; }
  html     { scroll-behavior: smooth; }
  ::-webkit-scrollbar { width: 0; }
  :focus-visible { outline: 2px solid rgba(201,168,76,0.6) !important; outline-offset: 2px; }
  input:focus, textarea:focus, select:focus { box-shadow: 0 0 0 2px rgba(201,168,76,0.25); }
  ::selection { background: rgba(201,168,76,0.3); color: #1a3d2b; }
  .magnetic { transition: transform 0.15s ease; }
  .magnetic:hover { transition: transform 0.08s ease; }
  .ripple-effect {
    position: relative;
    overflow: hidden;
  }
  .ripple-effect::after {
    content: '';
    position: absolute;
    inset: 50% auto auto 50%;
    width: 0; height: 0;
    background: rgba(255,255,255,0.25);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: waterRipple 0.6s ease-out;
    pointer-events: none;
  }
`;

// ─── Utility Components ───────────────────────────────────────────────────────
export function LeafSVG({ size = 40, color = C.gold, style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 40 60" style={{ opacity: 0.22, ...style }} aria-hidden>
      <path d="M20 0 Q36 16 30 36 Q24 52 20 60 Q16 52 10 36 Q4 16 20 0Z" fill={color} />
      <line x1="20" y1="4" x2="20" y2="56" stroke={color} strokeWidth="1" opacity=".45" />
    </svg>
  );
}

export function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-70px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 26 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.65, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export function GoldLine({ w = 32 }: { w?: number }) {
  return <div style={{ height: 1, width: w, backgroundColor: C.gold, flexShrink: 0 }} />;
}

export function SectionTag({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <GoldLine />
      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.42em", color: C.gold, textTransform: "uppercase" }}>{text}</span>
      <GoldLine />
    </div>
  );
}

export function SectionHeading({ tag, title, sub, light = false }: { tag: string; title: ReactNode; sub: string; light?: boolean }) {
  return (
    <div className="text-center mb-14">
      <SectionTag text={tag} />
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.85rem,4vw,3rem)", fontWeight: 700, color: light ? C.ivory : C.green, lineHeight: 1.18 }}>
        {title}
      </h2>
      <p style={{ fontFamily: "'DM Sans',sans-serif", color: light ? "rgba(245,240,232,0.62)" : C.muted, maxWidth: 520, margin: "0.9rem auto 0", lineHeight: 1.76, fontSize: "0.95rem" }}>
        {sub}
      </p>
    </div>
  );
}

export function BrandLogo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  const serif  = "'Playfair Display',serif";
  const sans   = "'DM Sans',sans-serif";
  const nameC  = light ? C.gold : C.green;
  const markSz = compact ? 26 : 32;
  return (
    <div className="flex items-center gap-2 select-none" style={{ cursor: "pointer" }}>
      <div style={{ position: "relative", width: markSz + 6, height: markSz + 8 }}>
        <svg width={9} height={11} viewBox="0 0 9 13" style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)" }} aria-hidden>
          <path d="M4.5 0 Q6 4 4.5 8 Q3 11 4.5 13" stroke={C.gold} strokeWidth=".9" fill="none" opacity=".9" />
          <path d="M4.5 3 Q7 2 7.5 4 Q5.5 4.8 4.5 4" fill={C.gold} />
          <path d="M4.5 3 Q2 2 1.5 4 Q3.5 4.8 4.5 4" fill={C.gold} />
        </svg>
        <span style={{ position: "absolute", top: 6, left: 0, fontFamily: serif, fontSize: markSz, fontWeight: 700, color: C.gold, lineHeight: 1, letterSpacing: "-1.5px" }}>AB</span>
      </div>
      <div>
        <div style={{ fontFamily: serif, fontSize: compact ? 13 : 16, fontWeight: 700, color: nameC, letterSpacing: "0.18em", lineHeight: 1.05 }}>ARWA</div>
        <div style={{ fontFamily: sans, fontSize: compact ? 8 : 9, fontWeight: 400, color: C.gold, letterSpacing: "0.35em", lineHeight: 1 }}>— BOTANIQS —</div>
      </div>
    </div>
  );
}

export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < Math.floor(rating) ? C.gold : "none"} stroke={C.gold} strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export function ProductCard({
  product, onView, onAddToCart, onQuickView, onToggleWishlist, inWishlist, viewMode = "grid",
}: {
  product: import("./data").Product;
  onView: () => void;
  onAddToCart: () => void;
  onQuickView: () => void;
  onToggleWishlist: () => void;
  inWishlist: boolean;
  viewMode?: "grid" | "list";
}) {
  const isGrid = viewMode === "grid";
  return (
    <div
      className={`group relative overflow-hidden transition-all duration-500 cursor-pointer ${isGrid ? "flex flex-col" : "flex flex-row gap-5"}`}
      style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.18)`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 24px 48px rgba(26,61,43,0.16)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; }}
    >
      {/* Image */}
      <div
        className={`relative overflow-hidden flex-shrink-0 ${isGrid ? "w-full" : "w-36 sm:w-48"}`}
        style={{ aspectRatio: isGrid ? "3/4" : "1/1" }}
        onClick={onView}
      >
        {product.imageUrl ? (
          <ImageWithFallback
            src={product.imageUrl}
            alt={`${product.name} ${product.subtitle}`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center" style={{ backgroundColor: "#eee8da" }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.8rem", color: C.muted }}>Arwa Botaniqs</span>
          </div>
        )}
        {/* Soft gradient for legibility over image */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "linear-gradient(to top, rgba(26,61,43,0.35) 0%, transparent 40%)" }} />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.discount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
              {product.discount}% OFF
            </span>
          )}
          {product.isBestSeller && (
            <span className="px-2 py-0.5 text-[10px]" style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
              Best Seller
            </span>
          )}
        </div>

        {/* Wishlist — always visible, top-right, subtle */}
        <button onClick={e => { e.stopPropagation(); onToggleWishlist(); }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: "rgba(245,240,232,0.9)", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} title="Wishlist">
          <svg width="14" height="14" viewBox="0 0 24 24" fill={inWishlist ? C.gold : "none"} stroke={inWishlist ? C.gold : C.green} strokeWidth="2.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Quick view — appears on hover, bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button onClick={e => { e.stopPropagation(); onQuickView(); }}
            className="flex items-center gap-1.5 px-4 py-2 text-[10px] uppercase tracking-widest font-medium rounded-full hover:scale-105 transition-transform"
            style={{ backgroundColor: "rgba(245,240,232,0.95)", backdropFilter: "blur(8px)", color: C.green, fontFamily: "'DM Sans',sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Quick View
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`p-4 flex flex-col ${isGrid ? "flex-1" : "flex-1 justify-center"}`}>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>
          Botanical Soap · {product.weight}
        </p>
        <h3 onClick={onView} style={{ fontFamily: "'Playfair Display',serif", fontSize: isGrid ? "1.05rem" : "1.2rem", fontWeight: 600, color: C.green, lineHeight: 1.25, marginBottom: 6, cursor: "pointer" }}
          className="hover:text-[#c9a84c] transition-colors">
          {product.name}<br />{product.subtitle}
        </h3>
        <div className="flex items-center gap-1.5">
          <StarRating rating={product.rating} size={12} />
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>({product.reviewCount})</span>
        </div>
        {!isGrid && (
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#4a5a4a", lineHeight: 1.7, marginTop: 6, maxWidth: 400 }}>
            {product.description.slice(0, 120)}...
          </p>
        )}
        <div className="flex items-baseline gap-3 mt-3 mb-4">
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", fontWeight: 700, color: C.green }}>Rs. {product.price.toLocaleString()}</span>
          {product.oldPrice > product.price && (
            <span className="line-through" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", color: "#aabba9" }}>Rs. {product.oldPrice.toLocaleString()}</span>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); onAddToCart(); }}
          className="group/btn relative overflow-hidden py-2.5 text-xs font-medium tracking-widest uppercase transition-all duration-300 hover:shadow-lg"
          style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.14em" }}>
          <span className="relative z-10 flex items-center justify-center gap-1.5">
            Add to Cart
          </span>
          <span className="absolute inset-0 translate-x-full group-hover/btn:translate-x-0 transition-transform duration-300" style={{ backgroundColor: C.gold }} />
          <span className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" style={{ color: C.green }}>Add to Cart</span>
        </button>
      </div>
    </div>
  );
}

// ─── Magnetic Button ──────────────────────────────────────────────────────────
export function MagneticButton({
  children, className = "", style, onClick, strength = 0.2, disabled, type = "button", "aria-label": ariaLabel,
}: {
  children: ReactNode; className?: string; style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void; strength?: number; disabled?: boolean;
  type?: "button" | "submit"; "aria-label"?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const move = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * strength;
    const y = (e.clientY - r.top  - r.height / 2) * strength;
    ref.current.style.transform  = `translate(${x}px, ${y}px)`;
    ref.current.style.transition = "transform 0.08s ease";
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.style.transform  = "translate(0, 0)";
    ref.current.style.transition = "transform 0.35s ease";
  };

  return (
    <button ref={ref} type={type} className={`magnetic ${className}`} style={style}
      onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      onMouseMove={move} onMouseLeave={reset}>
      {children}
    </button>
  );
}

// ─── Tilt Card ────────────────────────────────────────────────────────────────
export function TiltCard({
  children, className = "", style, maxTilt = 8,
}: {
  children: ReactNode; className?: string; style?: React.CSSProperties; maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    ref.current.style.transform  = `perspective(900px) rotateY(${x * maxTilt * 2}deg) rotateX(${-y * maxTilt}deg) scale3d(1.02,1.02,1.02)`;
    ref.current.style.transition = "transform 0.08s ease";
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.style.transform  = "perspective(900px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)";
    ref.current.style.transition = "transform 0.5s ease";
  };

  return (
    <div ref={ref} className={className} style={{ ...style, willChange: "transform" }}
      onMouseMove={move} onMouseLeave={reset}>
      {children}
    </div>
  );
}

// ─── Glow Button ─────────────────────────────────────────────────────────────
export function GlowButton({
  children, onClick, style, className = "", ariaLabel,
}: {
  children: ReactNode; onClick?: () => void; style?: React.CSSProperties; className?: string; ariaLabel?: string;
}) {
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - r.left, y: e.clientY - r.top, id: Date.now() });
    setTimeout(() => setRipple(null), 700);
    onClick?.();
  };

  return (
    <button onClick={handleClick} className={`magnetic ${className}`} style={{ ...style, position: "relative", overflow: "hidden" }} aria-label={ariaLabel}>
      {children}
      {ripple && (
        <span
          key={ripple.id}
          style={{
            position: "absolute",
            left: ripple.x,
            top:  ripple.y,
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.35)",
            transform: "translate(-50%,-50%) scale(0)",
            animation: "waterRipple 0.65s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      )}
    </button>
  );
}

// ─── Animated skeleton ────────────────────────────────────────────────────────
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{
      backgroundColor: "rgba(201,168,76,0.07)",
      backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.12) 50%, transparent 100%)",
      backgroundSize: "200% 100%",
      animation: "shimmerBar 1.6s ease-in-out infinite",
      ...style,
    }} />
  );
}
