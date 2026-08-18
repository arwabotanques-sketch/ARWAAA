import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { useState } from "react";
import * as React from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import productImg from "@/imports/WhatsApp_Image_2026-07-02_at_11.47.16_PM.jpeg";
import logoImg from "@/imports/WhatsApp_Image_2026-07-02_at_11.46.54_PM.jpeg";
import { useStore } from "../store";
import { REVIEWS } from "../data";
import { C, FadeIn, SectionHeading, SectionTag, GoldLine, LeafSVG, StarRating } from "../shared";
import { ScrollReveal } from "../components/ScrollReveal";
import {
  Leaf, Star, ShoppingCart, ArrowRight, ChevronDown, Truck,
  RotateCcw, Shield, Heart, Sun, Droplets, Sparkles, Check,
  Award, Users, Clock,
} from "lucide-react";

// ─── Shared luxury helpers (defined once, module scope) ──────────────────────

// Magnetic Button — cursor pulls the button slightly toward it
function Magnetic({ children, strength = 0.3 }: { children: React.ReactNode; strength?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <motion.div ref={ref}
      onMouseMove={e => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setPos({ x: (e.clientX - rect.left - rect.width / 2) * strength, y: (e.clientY - rect.top - rect.height / 2) * strength });
      }}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }} transition={{ type: "spring", stiffness: 150, damping: 12, mass: 0.3 }}
      className="inline-block">
      {children}
    </motion.div>
  );
}

// Cursor Glow — soft ambient light that follows the mouse within a section
function CursorGlow({ color = "rgba(201,168,76,0.07)" }: { color?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" onMouseMove={e => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }} style={{ pointerEvents: "auto" }}>
      {pos && (
        <div className="absolute rounded-full pointer-events-none" style={{
          left: pos.x - 200, top: pos.y - 200, width: 400, height: 400,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          transition: "left 0.15s ease-out, top 0.15s ease-out",
        }} />
      )}
    </div>
  );
}

// Organic morphing blob — ambient background shape
function OrganicBlob({ className, color }: { className?: string; color: string }) {
  return (
    <div className={`absolute pointer-events-none blur-3xl ${className}`} style={{
      background: color, borderRadius: "42% 58% 65% 35% / 45% 40% 60% 55%",
      animation: "blobMorph 12s ease-in-out infinite",
    }} />
  );
}

// Film grain overlay — very subtle ambient texture
function GrainOverlay({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      opacity,
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
    }} />
  );
}

// Word-by-word reveal for premium headline entrances
function SplitReveal({ text, delayStart = 0, ...rest }: { text: string; delayStart?: number } & React.HTMLAttributes<HTMLSpanElement>) {
  const words = text.split(" ");
  return (
    <span {...rest}>
      {words.map((w, i) => (
        <motion.span key={i} initial={{ opacity: 0, y: 14, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: delayStart + i * 0.05 }} style={{ display: "inline-block", marginRight: "0.28em" }}>
          {w}
        </motion.span>
      ))}
    </span>
  );
}

// Image parallax on scroll — self-contained, no prop drilling
function ParallaxImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerDelta = rect.top + rect.height / 2 - window.innerHeight / 2;
      setOffset(centerDelta * 0.08); // subtle
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div ref={ref} className={className} style={{ overflow: "hidden" }}>
      <img src={src} alt={alt} className="w-full h-full object-cover" style={{ transform: `translateY(${offset}px) scale(1.15)`, transition: "transform 0.1s linear" }} />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const navigate = useNavigate();
  const { products } = useStore();
  const heroProduct = products.find(p => p.isFeatured) || products[0];
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
    });
  };

  return (
    <section onMouseMove={handleMouseMove} className="relative min-h-screen flex items-center overflow-hidden" style={{ backgroundColor: C.green }}>
      <CursorGlow />
      <GrainOverlay />
      <div className="sun absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 65% 28%, rgba(201,168,76,0.16) 0%, transparent 62%)` }} />
      <div className="sun absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 28% 72%, rgba(74,103,65,0.45) 0%, transparent 55%)`, animationDelay: "2s" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at ${50 + mouse.x * 6}% ${50 + mouse.y * 6}%, rgba(201,168,76,0.08) 0%, transparent 45%)`, transition: "background 0.3s ease-out" }} />

      <div className="leaf-1 absolute top-24 left-6 pointer-events-none" style={{ transform: `translate(${mouse.x * -8}px, ${mouse.y * -8}px)`, transition: "transform 0.4s ease-out" }}><LeafSVG size={52} color={C.gold} /></div>
      <div className="leaf-2 absolute top-36 right-10 pointer-events-none" style={{ transform: `translate(${mouse.x * 6}px, ${mouse.y * -6}px)`, transition: "transform 0.4s ease-out" }}><LeafSVG size={38} color={C.ivory} /></div>
      <div className="leaf-3 absolute bottom-44 left-14 pointer-events-none" style={{ transform: `translate(${mouse.x * -5}px, ${mouse.y * 5}px)`, transition: "transform 0.4s ease-out" }}><LeafSVG size={46} color={C.olive} style={{ opacity: 0.3 }} /></div>
      <div className="leaf-4 absolute top-1/2 right-6 pointer-events-none" style={{ transform: `translate(${mouse.x * 9}px, ${mouse.y * 9}px)`, transition: "transform 0.4s ease-out" }}><LeafSVG size={62} color={C.gold} style={{ opacity: 0.18 }} /></div>
      <div className="leaf-5 absolute bottom-24 right-20 pointer-events-none" style={{ transform: `translate(${mouse.x * -7}px, ${mouse.y * 7}px)`, transition: "transform 0.4s ease-out" }}><LeafSVG size={32} color={C.ivory} /></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 grid lg:grid-cols-2 gap-12 items-center">
        {/* Text column */}
        <div className="text-center lg:text-left">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="flex items-center justify-center lg:justify-start gap-3 mb-8">
            <GoldLine />
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", letterSpacing: "0.42em", color: C.gold, textTransform: "uppercase" }}>Premium Botanical Beauty · Pakistan</span>
          </motion.div>

          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2.6rem,6vw,4.6rem)", fontWeight: 700, color: C.ivory, lineHeight: 1.08 }}>
            <SplitReveal text="Naturally Beautiful," delayStart={0.4} /><br />
            <SplitReveal text="Inside & Out" delayStart={0.65} style={{ color: C.gold, fontStyle: "italic" }} />
          </h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.72 }}
            style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "1.08rem", color: "rgba(245,240,232,0.72)", lineHeight: 1.78, maxWidth: 480, margin: "1.5rem auto 0" }}
            className="lg:mx-0">
            Crafted from 100% botanical extracts — a luxury beauty soap that cleanses, brightens, and nourishes every skin type. From the heart of nature.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.96 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mt-10">
            <Magnetic>
              <button onClick={() => navigate("/shop")}
                className="group relative overflow-hidden px-9 py-4 text-sm font-medium"
                style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.16em", textTransform: "uppercase", minWidth: 210 }}>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Shop Now <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 translate-x-full group-hover:translate-x-0 transition-transform duration-300" style={{ backgroundColor: "#b8962e" }} />
              </button>
            </Magnetic>
            <Magnetic strength={0.2}>
              <button onClick={() => navigate("/shop")}
                className="px-9 py-4 text-sm font-medium border transition-all hover:bg-white/10"
                style={{ borderColor: "rgba(245,240,232,0.35)", color: C.ivory, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.16em", textTransform: "uppercase", minWidth: 210 }}>
                Explore Collection
              </button>
            </Magnetic>
          </motion.div>

          {/* Trust strip */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
            className="flex items-center justify-center lg:justify-start gap-6 mt-12">
            {[["100%", "Botanical"], ["4.9★", "Rated"], ["2-4", "Day Delivery"]].map(([v, l]) => (
              <div key={l} className="text-center lg:text-left">
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", fontWeight: 700, color: C.gold }}>{v}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "rgba(245,240,232,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating product visual */}
        <div className="hidden lg:flex items-center justify-center relative" style={{ perspective: 1000 }}>
          <motion.div
            className="float-slow relative"
            animate={{ rotateY: mouse.x * 8, rotateX: -mouse.y * 8 }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
            style={{ transformStyle: "preserve-3d" }}>
            <div className="absolute inset-0 blur-3xl" style={{ background: `radial-gradient(circle, rgba(201,168,76,0.35) 0%, transparent 70%)`, transform: "scale(1.3)" }} />
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(201,168,76,0.25)", boxShadow: "0 30px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
              {heroProduct?.imageUrl ? (
                <ImageWithFallback src={heroProduct.imageUrl} alt={heroProduct.name} className="w-[85%] h-[85%] object-cover rounded-full" />
              ) : (
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: C.gold, textAlign: "center" }}>Arwa Botaniqs</span>
              )}
            </div>
            {heroProduct && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.3 }}
                className="absolute -bottom-4 -left-4 sm:left-0 px-5 py-3 flex items-center gap-2"
                style={{ backgroundColor: "rgba(245,240,232,0.95)", backdropFilter: "blur(10px)", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
                <Sparkles size={14} color={C.gold} />
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 600, color: C.green }}>Rs. {heroProduct.price.toLocaleString()}</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        className="bounce absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", letterSpacing: "0.35em", color: `rgba(201,168,76,0.65)`, textTransform: "uppercase" }}>Scroll</span>
        <ChevronDown size={15} color={`rgba(201,168,76,0.65)`} />
      </motion.div>
    </section>
  );
}

// ─── Featured Product ─────────────────────────────────────────────────────────
function FeaturedProduct() {
  const { addToCart, toggleWishlist, wishlist, products, productsLoading } = useStore();
  const navigate = useNavigate();
  const product = products.find(p => p.isFeatured) || products.find(p => p.isBestSeller) || products[0];
  const [qty, setQty] = useState(1);
  const inWishlist = product ? wishlist.has(product.id) : false;

  if (!productsLoading && !product) return null;
  if (!product) {
    return (
      <section className="py-24" style={{ backgroundColor: C.ivory }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted }}>Loading…</div>
      </section>
    );
  }

  return (
    <section className="py-24 overflow-hidden" style={{ backgroundColor: C.ivory }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn><SectionHeading tag="Featured Product" title="The Beauty Soap" sub="Our hero product — a luxurious botanical soap crafted to cleanse, brighten, and nourish your skin naturally." /></FadeIn>

        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center mt-4">
          <FadeIn delay={0.1}>
            <div className="relative group/img" style={{ perspective: 1000 }}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const rx = ((e.clientY - rect.top) / rect.height - 0.5) * -6;
                const ry = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
                (e.currentTarget.querySelector("[data-tilt]") as HTMLElement).style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
              }}
              onMouseLeave={e => { (e.currentTarget.querySelector("[data-tilt]") as HTMLElement).style.transform = "rotateX(0) rotateY(0)"; }}>
              <div className="absolute top-4 left-4 z-10 w-16 h-16 rounded-full flex flex-col items-center justify-center" style={{ backgroundColor: "rgba(201,168,76,0.85)", backdropFilter: "blur(6px)", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 700, color: C.green, lineHeight: 1 }}>{product.discount}%</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: C.green }}>OFF</span>
              </div>
              <div data-tilt className="overflow-hidden cursor-pointer" style={{ aspectRatio: "4/5", transition: "transform 0.3s ease-out", transformStyle: "preserve-3d", boxShadow: "0 30px 60px rgba(26,61,43,0.18)" }} onClick={() => navigate(`/products/${product.slug}`)}>
                <ImageWithFallback src={productImg} alt="Arwa Botaniqs Beauty Soap surrounded by botanical flowers and leaves" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" />
              </div>
              <div className="absolute -right-3 sm:right-0 bottom-10 p-4" style={{ backgroundColor: "rgba(26,61,43,0.9)", backdropFilter: "blur(8px)", minWidth: 150 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.28em", color: C.gold, textTransform: "uppercase", marginBottom: 2 }}>100% Botanical</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.ivory }}>No Harmful Chemicals</p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.18}>
            <div>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", letterSpacing: "0.28em", textTransform: "uppercase", backgroundColor: "rgba(201,168,76,0.14)", color: C.gold, padding: "4px 12px" }}>Premium Beauty Soap</span>
              <h2 className="mt-5 mb-1" style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 700, color: C.green, lineHeight: 1.15, cursor: "pointer" }} onClick={() => navigate(`/products/${product.slug}`)}>
                {product.name}<br /><span style={{ fontStyle: "italic", color: C.olive }}>{product.subtitle}</span>
              </h2>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted, letterSpacing: "0.08em" }}>Weight: {product.weight} · For All Skin Types</p>
              <div className="flex items-center gap-1 mt-3 mb-6">
                <StarRating rating={product.rating} />
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted, marginLeft: 6 }}>({product.reviewCount} Reviews)</span>
              </div>
              <div className="flex items-baseline gap-4 mb-5">
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "2.6rem", fontWeight: 700, color: C.green }}>Rs. {product.price.toLocaleString()}</span>
                <span className="line-through" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "1.2rem", color: "#aabba9" }}>Rs. {product.oldPrice.toLocaleString()}</span>
                {product.oldPrice > product.price && (
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 600, backgroundColor: C.gold, color: C.green, padding: "2px 8px" }}>Save Rs. {(product.oldPrice - product.price).toLocaleString()}</span>
                )}
              </div>
              <p className="mb-7" style={{ fontFamily: "'DM Sans',sans-serif", color: "#4a5a4a", lineHeight: 1.84, fontSize: "0.95rem" }}>
                {product.description.slice(0, 200)}...
              </p>
              <div className="grid grid-cols-2 gap-2.5 mb-8">
                {product.benefits.slice(0, 6).map(b => (
                  <div key={b} className="flex items-center gap-2">
                    <Check size={13} color={C.gold} />
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#4a5a4a" }}>{b}</span>
                  </div>
                ))}
              </div>

              {/* Quantity + Buttons */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center border" style={{ borderColor: "rgba(26,61,43,0.3)" }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 transition-colors"><span style={{ fontSize: "1.2rem", color: C.green }}>−</span></button>
                  <span className="w-10 text-center" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", color: C.green, fontWeight: 600 }}>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 transition-colors"><span style={{ fontSize: "1.2rem", color: C.green }}>+</span></button>
                </div>
                <button onClick={() => toggleWishlist(product)} className="w-10 h-10 flex items-center justify-center border hover:border-[#c9a84c] transition-colors"
                  style={{ borderColor: "rgba(26,61,43,0.3)" }} aria-label="Wishlist">
                  <Heart size={18} fill={inWishlist ? C.gold : "none"} color={inWishlist ? C.gold : C.green} />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Magnetic strength={0.15}>
                  <button onClick={() => navigate("/checkout")}
                    className="group w-full py-4 text-sm font-medium relative overflow-hidden"
                    style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                    <span className="relative z-10">Buy Now</span>
                    <span className="absolute inset-0 translate-x-full group-hover:translate-x-0 transition-transform duration-300" style={{ backgroundColor: C.gold }} />
                    <span className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: C.green }}>Buy Now</span>
                  </button>
                </Magnetic>
                <Magnetic strength={0.15}>
                  <button onClick={() => addToCart(product, qty)}
                    className="w-full py-4 text-sm font-medium border flex items-center justify-center gap-2 hover:bg-[rgba(26,61,43,0.05)] transition-colors"
                    style={{ borderColor: C.green, color: C.green, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                    <ShoppingCart size={15} /> Add to Cart
                  </button>
                </Magnetic>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 pt-6" style={{ borderTop: `1px solid rgba(26,61,43,0.1)` }}>
                <div className="flex items-center gap-2"><Truck size={14} color={C.muted} /><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted }}>Delivery 2–4 Days · Rs. 300</span></div>
                <div className="flex items-center gap-2"><RotateCcw size={14} color={C.muted} /><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted }}>2-Day Returns</span></div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─── Why Choose Arwa ──────────────────────────────────────────────────────────
const BENEFITS = [
  { Icon: Leaf,     title: "Natural Ingredients",  desc: "Sourced from nature's purest botanical extracts — zero synthetic additives, ever." },
  { Icon: Shield,   title: "Acne Control",          desc: "Neem and Tea Tree actively neutralise acne-causing bacteria for clearer skin." },
  { Icon: Sparkles, title: "Skin Brightening",      desc: "Vitamin E and Aloe Vera restore natural radiance and even your skin tone." },
  { Icon: Droplets, title: "Oil Control",           desc: "Balances sebum production for a matte, fresh finish all day long." },
  { Icon: Sun,      title: "Deep Cleansing",        desc: "Activated Charcoal draws out deep-seated impurities from your pores." },
  { Icon: Heart,    title: "Hydration",             desc: "Honey and Olive Extract lock in lasting moisture for soft, supple skin." },
  { Icon: Star,     title: "Baby Friendly",         desc: "Gentle enough for the most delicate skin — trusted by families across Pakistan." },
  { Icon: Users,    title: "Sensitive Skin",        desc: "Paraben-free and sulphate-free — safe for reactive skin types." },
];

function WhyChooseArwa() {
  return (
    <section className="relative py-24 overflow-hidden" style={{ backgroundColor: C.green }}>
      <OrganicBlob className="w-96 h-96 -top-32 -right-32 opacity-[0.06]" color={C.gold} />
      <OrganicBlob className="w-72 h-72 bottom-0 -left-20 opacity-[0.05]" color={C.ivory} />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn><SectionHeading tag="Why Arwa" title="Crafted for Every Skin Story" sub="Eight reasons why thousands of Pakistanis have made Arwa Botaniqs their daily skincare ritual." light /></FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map(({ Icon, title, desc }, i) => (
            <FadeIn key={title} delay={i * 0.05}>
              <div className="group p-6 transition-all duration-300 hover:-translate-y-1.5 cursor-default"
                style={{ backgroundColor: "rgba(245,240,232,0.05)", border: "1px solid rgba(201,168,76,0.14)" }}>
                <div className="w-11 h-11 flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: "rgba(201,168,76,0.13)" }}>
                  <Icon size={20} color={C.gold} />
                </div>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 600, color: C.ivory, marginBottom: 6 }}>{title}</h3>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.83rem", color: "rgba(245,240,232,0.55)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Ingredient Showcase ──────────────────────────────────────────────────────
function IngredientShowcase() {
  const { products } = useStore();
  const product = products.find(p => p.isFeatured) || products.find(p => p.isBestSeller) || products[0];
  if (!product || product.ingredients.length === 0) return null;
  return (
    <section className="relative py-24 overflow-hidden" style={{ backgroundColor: C.ivory }}>
      <OrganicBlob className="w-80 h-80 top-0 -right-24 opacity-[0.04]" color={C.olive} />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn><SectionHeading tag="Key Ingredients" title="From Nature's Laboratory" sub="Every ingredient carefully selected from the world's finest botanical sources, working in harmony with your skin." /></FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {product.ingredients.map(({ name, emoji, desc }, i) => (
            <FadeIn key={name} delay={i * 0.06}>
              <div className="group p-5 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl cursor-default"
                style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
                <div className="text-3xl mb-3">{emoji}</div>
                <div style={{ height: 1, width: 28, backgroundColor: C.gold, margin: "0 auto 12px" }} />
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 600, color: C.green, marginBottom: 4 }}>{name}</h3>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, lineHeight: 1.65 }}>{desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Benefits Timeline ────────────────────────────────────────────────────────
const TIMELINE = [
  { when: "Day 1",    Icon: Sparkles, title: "Immediate Freshness",    desc: "Your skin feels instantly clean, soft, and deeply refreshed from the very first use." },
  { when: "Week 1",   Icon: Droplets, title: "Pores Visibly Cleaner",  desc: "Activated Charcoal and Tea Tree draw out impurities — pores look noticeably tighter." },
  { when: "Week 2",   Icon: Shield,   title: "Acne Begins to Fade",    desc: "Neem and Tea Tree's antibacterial action visibly reduces breakouts and redness." },
  { when: "Week 3",   Icon: Sun,      title: "Skin Tone Brightens",    desc: "Vitamin E and Aloe Vera work to even your complexion and restore natural radiance." },
  { when: "Month 1",  Icon: Award,    title: "Transformative Glow",    desc: "Consistent use delivers a clear, bright, hydrated complexion you will love every day." },
];

function BenefitsTimeline() {
  return (
    <section className="py-24" style={{ backgroundColor: C.green }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn><SectionHeading tag="Your Skin Journey" title="Results You Can See" sub="A transparent timeline of what to expect when you make Arwa Botaniqs part of your daily ritual." light /></FadeIn>
        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px hidden md:block" style={{ backgroundColor: "rgba(201,168,76,0.25)" }} />
          <div className="space-y-12">
            {TIMELINE.map(({ when, Icon, title, desc }, i) => {
              const isLeft = i % 2 === 0;
              return (
                <FadeIn key={when} delay={i * 0.1}>
                  <div className={`flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0 ${isLeft ? "" : "md:flex-row-reverse"}`}>
                    <div className={`md:w-[calc(50%-28px)] ${isLeft ? "md:text-right md:pr-8" : "md:pl-8"}`}>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.28em", textTransform: "uppercase", backgroundColor: "rgba(201,168,76,0.14)", color: C.gold, padding: "3px 10px", display: "inline-block", marginBottom: 6 }}>{when}</span>
                      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 600, color: C.ivory }}>{title}</h3>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "rgba(245,240,232,0.58)", lineHeight: 1.72, marginTop: 4 }}>{desc}</p>
                    </div>
                    <div className="hidden md:flex w-14 justify-center flex-shrink-0">
                      <div className="breathe w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.gold, boxShadow: `0 0 0 5px rgba(201,168,76,0.18)` }}>
                        <Icon size={17} color={C.green} />
                      </div>
                    </div>
                    <div className="hidden md:block md:w-[calc(50%-28px)]" />
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Animated Stats ───────────────────────────────────────────────────────────
function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  useState(() => {}); // keep hook order stable across renders
  React.useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

const STATS = [
  { value: 15000, suffix: "+", label: "Happy Customers" },
  { value: 100, suffix: "%", label: "Botanical Ingredients" },
  { value: 4.9, suffix: "★", label: "Average Rating", decimal: true },
  { value: 24, suffix: "hr", label: "Dispatch Time" },
];

function StatItem({ stat, active }: { stat: typeof STATS[number]; active: boolean }) {
  const count = useCountUp(stat.decimal ? stat.value * 10 : stat.value, active);
  const display = stat.decimal ? (count / 10).toFixed(1) : count.toLocaleString();
  return (
    <div className="text-center">
      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: C.gold, lineHeight: 1 }}>
        {display}{stat.suffix}
      </p>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,240,232,0.5)", marginTop: 10 }}>
        {stat.label}
      </p>
    </div>
  );
}

function AnimatedStats() {
  const [active, setActive] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); observer.disconnect(); } },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-16" style={{ backgroundColor: C.green, borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map(stat => <StatItem key={stat.label} stat={stat} active={active} />)}
      </div>
    </section>
  );
}

// ─── Customer Reviews ─────────────────────────────────────────────────────────
function CustomerReviews() {
  return (
    <section className="relative py-24 overflow-hidden" style={{ backgroundColor: C.ivory }}>
      <OrganicBlob className="w-96 h-96 top-10 -left-32 opacity-[0.04]" color={C.gold} />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn><SectionHeading tag="Customer Stories" title="Loved Across Pakistan" sub="Real stories from real customers who have discovered the difference that botanical luxury makes." /></FadeIn>
        <div className="flex flex-wrap justify-center gap-12 mb-14">
          {[{ n: "500+", l: "Happy Customers" }, { n: "4.9★", l: "Average Rating" }, { n: "100%", l: "Botanical Extracts" }].map(s => (
            <FadeIn key={s.l} className="text-center">
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "2.4rem", fontWeight: 700, color: C.green }}>{s.n}</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted }}>{s.l}</div>
            </FadeIn>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {REVIEWS.map(({ id, name, city, rating, title, text, date, verified }, i) => (
            <FadeIn key={id} delay={i * 0.08}>
              <div className="p-6 flex flex-col h-full" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
                <StarRating rating={rating} size={13} />
                <p className="mt-2 mb-1 font-semibold" style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.9rem", color: C.green }}>{title}</p>
                <p className="flex-1 mb-4" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#4a5a4a", lineHeight: 1.75, fontStyle: "italic" }}>"{text}"</p>
                <div className="flex items-center gap-3 pt-4" style={{ borderTop: `1px solid rgba(26,61,43,0.08)` }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.green, color: C.gold, fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: "0.9rem" }}>{name[0]}</div>
                  <div>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", fontWeight: 600, color: C.green }}>{name}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>{city} · {verified && "✓ Verified"}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Brand Story ──────────────────────────────────────────────────────────────
function BrandStory() {
  return (
    <section id="brand-story" className="relative py-24 overflow-hidden" style={{ backgroundColor: C.cream }}>
      <GrainOverlay opacity={0.02} />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <FadeIn>
            <div>
              <SectionTag text="Our Story" />
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.9rem,4vw,2.9rem)", fontWeight: 700, color: C.green, lineHeight: 1.18 }}>
                <SplitReveal text="Rooted in Nature," /><br /><SplitReveal text="Made for You." style={{ fontStyle: "italic", color: C.olive }} />
              </h2>
              <p style={{ fontFamily: "'DM Sans',sans-serif", color: "#4a5a4a", lineHeight: 1.88, fontSize: "0.96rem", marginTop: "1.5rem" }}>
                Arwa Botaniqs was born from a simple belief — that the most powerful skincare ingredients are the ones nature has been perfecting for thousands of years. We are a Faisalabad-based botanical beauty brand committed to creating products as gentle on your skin as they are on the planet.
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", color: "#4a5a4a", lineHeight: 1.88, fontSize: "0.96rem", marginTop: "1rem", marginBottom: "2rem" }}>
                Every Arwa Botaniqs product is crafted with 100% botanical extracts — no harmful parabens, no sulphates, no compromises. We believe everyone deserves luxury skincare that actually works, made with integrity and love.
              </p>
              <div className="flex flex-wrap gap-8">
                {[{ n: "100%", l: "Natural Extracts" }, { n: "Zero", l: "Harmful Chemicals" }, { n: "24/7", l: "Customer Support" }].map(s => (
                  <div key={s.l} className="text-center">
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 700, color: C.green }}>{s.n}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="relative">
              <div style={{ aspectRatio: "1/1" }}>
                <ParallaxImage src={productImg} alt="Arwa Botaniqs Beauty Soap" className="w-full h-full" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 py-4 text-center" style={{ backgroundColor: "rgba(26,61,43,0.88)" }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.38em", textTransform: "uppercase", color: C.gold }}>Nature. Purity. You.</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "Is Arwa Botaniqs soap suitable for all skin types?", a: "Yes! Our Beauty Soap is formulated to work harmoniously with all skin types — oily, dry, combination, sensitive, and even baby skin. The botanical ingredients naturally adapt to your skin's unique needs." },
  { q: "How often should I use the soap?", a: "For best results, use twice daily — morning and evening. You can adjust frequency based on how your skin responds." },
  { q: "Are there any harmful chemicals in the formula?", a: "Absolutely not. Our soap contains zero parabens, sulphates, synthetic fragrances, or harmful preservatives. Every ingredient is 100% botanical and nature-derived." },
  { q: "How long before I see visible results?", a: "Many customers notice fresher skin from the very first use. Visible improvements in acne and skin tone typically appear within 2–3 weeks of consistent daily use." },
  { q: "What payment methods do you accept?", a: "We accept JazzCash, EasyPaisa, Cash on Delivery (COD), Visa, Mastercard, and all major debit and credit cards." },
  { q: "What is your return policy?", a: "We offer a 2-day return policy from the date of delivery. Contact us within 2 days for a hassle-free return." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="relative py-24 overflow-hidden" style={{ backgroundColor: C.ivory }}>
      <OrganicBlob className="w-72 h-72 top-0 -right-20 opacity-[0.04]" color={C.gold} />
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn><SectionHeading tag="FAQ" title="Frequently Asked Questions" sub="Everything you need to know about Arwa Botaniqs Beauty Soap and our service." /></FadeIn>
        <div className="space-y-3">
          {FAQS.map(({ q, a }, i) => (
            <FadeIn key={i} delay={i * 0.04}>
              <div style={{ border: `1px solid rgba(201,168,76,0.22)`, backgroundColor: C.cream }}>
                <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setOpen(open === i ? null : i)}>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.93rem", fontWeight: 500, color: C.green, paddingRight: 16 }}>{q}</span>
                  <span className="flex-shrink-0 transition-transform duration-300" style={{ transform: open === i ? "rotate(180deg)" : "none" }}>
                    <ChevronDown size={17} color={C.gold} />
                  </span>
                </button>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.28 }} style={{ overflow: "hidden" }}>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: "#4a5a4a", lineHeight: 1.82, padding: "0 20px 20px" }}>{a}</p>
                  </motion.div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Newsletter ───────────────────────────────────────────────────────────────
function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (email) { setDone(true); setEmail(""); } };

  return (
    <section className="py-24 relative overflow-hidden" style={{ backgroundColor: C.green }}>
      <GrainOverlay />
      <div className="leaf-1 absolute top-8 left-6 pointer-events-none"><LeafSVG size={58} color={C.gold} /></div>
      <div className="leaf-3 absolute bottom-10 right-10 pointer-events-none"><LeafSVG size={76} color={C.ivory} /></div>
      <div className="relative z-10 max-w-xl mx-auto px-4 text-center">
        <FadeIn>
          <SectionTag text="Stay Connected" />
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.9rem,4vw,2.6rem)", fontWeight: 700, color: C.ivory, lineHeight: 1.2 }}>Join the Arwa Botaniqs Circle</h2>
          <p style={{ fontFamily: "'DM Sans',sans-serif", color: "rgba(245,240,232,0.65)", lineHeight: 1.78, marginTop: "1rem", marginBottom: "2.5rem" }}>
            Subscribe for exclusive offers, botanist skincare tips, and first access to new launches.
          </p>
          {done ? (
            <div className="py-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: C.gold }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", color: C.ivory }}>Thank you for subscribing!</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex max-w-md mx-auto">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" required
                className="flex-1 px-5 py-4 text-sm outline-none"
                style={{ backgroundColor: "rgba(245,240,232,0.09)", border: `1px solid rgba(201,168,76,0.28)`, borderRight: "none", color: C.ivory, fontFamily: "'DM Sans',sans-serif" }} />
              <Magnetic strength={0.2}>
                <button type="submit" className="px-6 py-4 text-sm font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>
                  Subscribe
                </button>
              </Magnetic>
            </form>
          )}
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <>
      <Hero />
      <ScrollReveal variant="zoom"><FeaturedProduct /></ScrollReveal>
      <ScrollReveal variant="fadeUp"><AnimatedStats /></ScrollReveal>
      <ScrollReveal variant="slideLeft"><WhyChooseArwa /></ScrollReveal>
      <ScrollReveal variant="slideRight"><IngredientShowcase /></ScrollReveal>
      <ScrollReveal variant="fadeIn"><BenefitsTimeline /></ScrollReveal>
      <ScrollReveal variant="rotate"><CustomerReviews /></ScrollReveal>
      <ScrollReveal variant="zoom"><BrandStory /></ScrollReveal>
      <ScrollReveal variant="fadeUp"><FAQ /></ScrollReveal>
      <ScrollReveal variant="slideLeft"><Newsletter /></ScrollReveal>
    </>
  );
}
