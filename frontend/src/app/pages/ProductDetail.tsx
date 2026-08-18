import { fetchProductReviews, submitReview, deleteReview } from "../api/reviews";
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import productImg from "@/imports/WhatsApp_Image_2026-07-02_at_11.47.16_PM.jpeg";
import logoImg from "@/imports/WhatsApp_Image_2026-07-02_at_11.46.54_PM.jpeg";
import { toast } from "sonner";
import { useStore } from "../store";
import { type Product } from "../data";
import { Loader2 } from "lucide-react";
import { C, FadeIn, StarRating, GoldLine, SectionTag, ProductCard } from "../shared";
import {
  ShoppingCart, Heart, Share2, Copy, ChevronDown, ChevronLeft, ChevronRight,
  Truck, RotateCcw, Shield, Check, ZoomIn, X, Star, Plus, Minus,
  MessageCircle, PlayCircle, RotateCcw as Rotate360,
} from "lucide-react";

const FALLBACK_GALLERY_IMAGES = [
  { src: productImg, alt: "Arwa Botaniqs Beauty Soap — product shot with botanical flowers" },
  { src: logoImg,    alt: "Arwa Botaniqs brand identity — AB monogram on forest green" },
];
// ─── 360° drag-rotate viewer ──────────────────────────────────────────────────
// Uses the product's real photo with a 3D-tilt drag effect (no multiple angle
// photos exist in the DB yet — once product photography adds real 360 frames,
// swap the single <img> below for a frame-index lookup driven by `angle`).
function Viewer360({ image, onClose }: { image: { src: string; alt: string }; onClose: () => void }) {
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const startX = useRef(0);
  const startAngle = useRef(0);

  const onDown = (clientX: number) => { setDragging(true); startX.current = clientX; startAngle.current = angle; };
  const onMove = (clientX: number) => { if (!dragging) return; setAngle(startAngle.current + (clientX - startX.current) * 0.4); };
  const onUp = () => setDragging(false);

  return (
    <>
      <motion.div key="v360-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90]" style={{ backgroundColor: "rgba(0,0,0,0.9)" }} onClick={onClose} />
      <motion.div key="v360-box" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-4 z-[91] flex flex-col items-center justify-center gap-4">
        <button onClick={onClose} className="absolute top-2 right-2 p-2 z-10" aria-label="Close 360 viewer">
          <X size={24} color="white" />
        </button>
        <div
          className="relative select-none flex items-center justify-center"
          style={{ width: "min(320px, 80vw)", height: "min(400px, 62vh)", perspective: 900, cursor: dragging ? "grabbing" : "grab" }}
          onMouseDown={e => onDown(e.clientX)}
          onMouseMove={e => onMove(e.clientX)}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={e => onDown(e.touches[0].clientX)}
          onTouchMove={e => onMove(e.touches[0].clientX)}
          onTouchEnd={onUp}
        >
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={28} color={C.gold} className="animate-spin" />
            </div>
          )}
          <img src={image.src} alt={image.alt} draggable={false} onLoad={() => setLoaded(true)}
            className="max-h-full max-w-full object-contain transition-opacity duration-300"
            style={{ transform: `rotateY(${angle}deg)`, opacity: loaded ? 1 : 0 }} />
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: "rgba(245,240,232,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Drag to rotate
        </p>
      </motion.div>
    </>
  );
}

// ─── Product video modal ──────────────────────────────────────────────────────
function VideoModal({ videoUrl, posterSrc, onClose }: { videoUrl?: string | null; posterSrc: string; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <motion.div key="vid-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90]" style={{ backgroundColor: "rgba(0,0,0,0.9)" }} onClick={onClose} />
      <motion.div key="vid-box" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-4 z-[91] flex items-center justify-center">
        <button onClick={onClose} className="absolute top-2 right-2 p-2 z-10" aria-label="Close video">
          <X size={24} color="white" />
        </button>
        {videoUrl ? (
          <div className="relative max-h-full max-w-full" style={{ aspectRatio: "16/9", width: "min(90vw, 700px)" }}>
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "#111" }}>
                <Loader2 size={28} color={C.gold} className="animate-spin" />
              </div>
            )}
            <video
              src={videoUrl}
              poster={posterSrc}
              autoPlay
              muted
              controls
              playsInline
              onLoadedData={() => setLoaded(true)}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-8 py-12 text-center" style={{ backgroundColor: C.cream }}>
            <PlayCircle size={32} color={C.muted} />
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: C.muted }}>
              No product video has been uploaded yet.
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
}
// ─── Image Gallery ────────────────────────────────────────────────────────────
function ImageGallery({ product }: { product: Product }) {
  const [active, setActive]     = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [view360, setView360]   = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  // Real product photo first, then the brand shots as supporting images.
  const GALLERY_IMAGES = product.imageUrl
    ? [{ src: product.imageUrl, alt: `${product.name} ${product.subtitle}` }, ...FALLBACK_GALLERY_IMAGES]
    : FALLBACK_GALLERY_IMAGES;

  return (
    <div>
      {/* Main image */}
      <div className="relative overflow-hidden group cursor-zoom-in" style={{ aspectRatio: "4/5", backgroundColor: "#eee8da" }}
        onClick={() => setLightbox(true)}>
        <ImageWithFallback src={GALLERY_IMAGES[active].src} alt={GALLERY_IMAGES[active].alt} className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "rgba(26,61,43,0.2)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(245,240,232,0.9)" }}>
            <ZoomIn size={18} color={C.green} />
          </div>
        </div>
        {/* Badge */}
        {product.discount > 0 && (
          <div className="absolute top-3 left-3 px-2 py-1 text-[11px] font-bold" style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
            {product.discount}% OFF
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-3 mt-3 overflow-x-auto">
        {GALLERY_IMAGES.map((img, i) => (
          <button key={i} onClick={() => setActive(i)}
            className="w-16 h-16 overflow-hidden flex-shrink-0 transition-all duration-200"
            style={{ border: `2px solid ${active === i ? C.gold : "transparent"}`, opacity: active === i ? 1 : 0.65 }}>
            <ImageWithFallback src={img.src} alt={img.alt} className="w-full h-full object-cover" />
          </button>
        ))}
        {/* Video */}
        <button className="w-16 h-16 flex-shrink-0 flex flex-col items-center justify-center gap-1 border hover:opacity-75 transition-opacity"
          style={{ borderColor: "rgba(26,61,43,0.2)", backgroundColor: C.cream }}
          onClick={() => setVideoOpen(true)}>
          <PlayCircle size={18} color={C.green} />
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.6rem", color: C.green }}>Video</span>
        </button>
        {/* 360° drag view */}
        <button className="w-16 h-16 flex-shrink-0 flex flex-col items-center justify-center gap-1 border hover:opacity-75 transition-opacity"
          style={{ borderColor: "rgba(26,61,43,0.2)", backgroundColor: C.cream }}
          onClick={() => setView360(true)}>
          <Rotate360 size={18} color={C.green} />
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.6rem", color: C.green }}>360°</span>
        </button>
      </div>

      {/* 360° interactive viewer */}
      <AnimatePresence>
        {view360 && (
          <Viewer360 image={GALLERY_IMAGES[0]} onClose={() => setView360(false)} />
        )}
      </AnimatePresence>

      {/* Product video */}
      <AnimatePresence>
        {videoOpen && (
          <VideoModal videoUrl={product.videoUrl} posterSrc={GALLERY_IMAGES[0].src} onClose={() => setVideoOpen(false)} />
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <>
            <motion.div key="lb-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90]" style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
              onClick={() => setLightbox(false)} />
            <motion.div key="lb-img" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 z-[91] flex items-center justify-center">
              <button onClick={() => setLightbox(false)} className="absolute top-2 right-2 p-2 z-10" aria-label="Close lightbox">
                <X size={24} color="white" />
              </button>
              <button onClick={() => setActive(a => (a - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length)} className="absolute left-2 p-2">
                <ChevronLeft size={28} color="white" />
              </button>
              <ImageWithFallback src={GALLERY_IMAGES[active].src} alt={GALLERY_IMAGES[active].alt} className="max-h-full max-w-full object-contain" />
              <button onClick={() => setActive(a => (a + 1) % GALLERY_IMAGES.length)} className="absolute right-2 p-2">
                <ChevronRight size={28} color="white" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Share Dropdown ───────────────────────────────────────────────────────────
function ShareDropdown() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-2 border text-xs hover:border-[#c9a84c] transition-colors"
        style={{ borderColor: "rgba(26,61,43,0.25)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
        <Share2 size={13} /> Share
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-44 py-1 shadow-lg"
          style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 flex items-center gap-2 text-sm hover:bg-[rgba(201,168,76,0.08)] transition-colors"
            style={{ fontFamily: "'DM Sans',sans-serif", color: C.green }}>
            <Copy size={13} /> Copy Link
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer"
            className="w-full text-left px-4 py-2.5 flex items-center gap-2 text-sm hover:bg-[rgba(201,168,76,0.08)] transition-colors"
            style={{ fontFamily: "'DM Sans',sans-serif", color: C.green, display: "flex" }}>
            <MessageCircle size={13} /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Product Tabs ─────────────────────────────────────────────────────────────
function ProductTabs({ product }: { product: Product }) {
  const [tab, setTab] = useState("description");
  const TABS = ["description", "ingredients", "how-to-use", "warnings", "shipping"];

  return (
    <div>
      {/* Tab headers */}
      <div className="flex gap-0 border-b overflow-x-auto" style={{ borderColor: "rgba(201,168,76,0.2)" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-shrink-0 px-4 py-3 text-xs uppercase tracking-widest border-b-2 transition-all"
            style={{ borderColor: tab === t ? C.gold : "transparent", color: tab === t ? C.gold : C.muted, fontFamily: "'DM Sans',sans-serif", marginBottom: -1 }}>
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

      <div className="py-6">
        {tab === "description" && (
          <p style={{ fontFamily: "'DM Sans',sans-serif", color: "#4a5a4a", lineHeight: 1.88, fontSize: "0.92rem" }}>{product.description}</p>
        )}
        {tab === "ingredients" && product.ingredients.length === 0 && (
          <p style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted, fontSize: "0.88rem" }}>Ingredient details for this product haven't been added yet.</p>
        )}
        {tab === "ingredients" && product.ingredients.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {product.ingredients.map(({ name, emoji, desc }) => (
              <div key={name} className="flex items-start gap-3 p-3" style={{ backgroundColor: "rgba(201,168,76,0.05)", border: `1px solid rgba(201,168,76,0.15)` }}>
                <span className="text-2xl">{emoji}</span>
                <div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600, color: C.green }}>{name}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, lineHeight: 1.6, marginTop: 2 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "how-to-use" && (
          <ol className="space-y-3">
            {product.howToUse.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif" }}>{i + 1}</span>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", color: "#4a5a4a", lineHeight: 1.7 }}>{step}</p>
              </li>
            ))}
          </ol>
        )}
        {tab === "warnings" && (
          <ul className="space-y-2">
            {product.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span style={{ color: "#d4183d", marginTop: 2, flexShrink: 0 }}>⚠</span>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: "#4a5a4a", lineHeight: 1.7 }}>{w}</p>
              </li>
            ))}
          </ul>
        )}
        {tab === "shipping" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4" style={{ backgroundColor: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.15)` }}>
              <Truck size={18} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, color: C.green }}>Delivery</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#4a5a4a", lineHeight: 1.7 }}>{product.shippingInfo}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4" style={{ backgroundColor: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.15)` }}>
              <RotateCcw size={18} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, color: C.green }}>Returns</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#4a5a4a", lineHeight: 1.7 }}>{product.returnPolicy}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Review Section ───────────────────────────────────────────────────────────
function ReviewSection({ product }: { product: Product }) {
  const { user } = useStore();
  const [reviews, setReviews]   = useState<import("../api/reviews").Review[]>([]);
  const [summary, setSummary]   = useState<{ avg: number; count: number; breakdown: Record<number, number> } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [newRating, setNewRating]   = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle]           = useState("");
  const [text, setText]             = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    fetchProductReviews(product.id)
      .then(({ reviews, summary }) => { setReviews(reviews); setSummary(summary); })
      .catch(() => toast.error("Couldn't load reviews."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [product.id]);

  const alreadyReviewed = reviews.some(r => r.isMine);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please log in to write a review."); return; }
    setSubmitting(true);
    try {
      await submitReview(product.id, newRating, title, text);
      toast.success("Thank you for your review!");
      setShowForm(false); setTitle(""); setText(""); setNewRating(5);
      load();
    } catch (err: any) {
      toast.error(err.message || "Couldn't submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteReview(id); toast.info("Review removed."); load(); }
    catch (err: any) { toast.error(err.message || "Couldn't remove review."); }
  };

  const hasRatings = !!summary && summary.count > 0;

  return (
    <div>
      {loading ? (
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: C.muted, marginBottom: 24 }}>Loading reviews...</p>
      ) : hasRatings ? (
        <div className="flex flex-wrap gap-8 mb-8 pb-8" style={{ borderBottom: `1px solid rgba(201,168,76,0.2)` }}>
          <div className="text-center">
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "4rem", fontWeight: 700, color: C.green, lineHeight: 1 }}>{summary!.avg}</div>
            <StarRating rating={summary!.avg} size={18} />
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, marginTop: 4 }}>{summary!.count} reviews</p>
          </div>
          <div className="flex-1 min-w-40">
            {[5, 4, 3, 2, 1].map(n => {
              const pct = summary!.count > 0 ? Math.round((summary!.breakdown[n] / summary!.count) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-2 mb-1.5">
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, width: 8 }}>{n}</span>
                  <Star size={12} fill={C.gold} color={C.gold} />
                  <div className="flex-1 h-1.5 overflow-hidden" style={{ backgroundColor: "rgba(201,168,76,0.15)" }}>
                    <div style={{ width: `${pct}%`, height: "100%", backgroundColor: C.gold }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: C.muted, marginBottom: 24 }}>No reviews yet — be the first to share your experience.</p>
      )}

      <div className="space-y-5 mb-8">
        {reviews.map(r => (
          <div key={r.id} className="p-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.18)` }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: C.green, color: C.gold, fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{r.name[0]}</div>
                <div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.86rem", fontWeight: 600, color: C.green }}>{r.name} {r.verified && <span style={{ color: C.gold, fontSize: "0.72rem" }}>✓ Verified</span>}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>{r.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={r.rating} size={12} />
                {r.isMine && <button onClick={() => handleDelete(r.id)} className="text-xs hover:opacity-60" style={{ color: "#d4183d", fontFamily: "'DM Sans',sans-serif" }}>Delete</button>}
              </div>
            </div>
            {r.title && <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.92rem", color: C.green, marginBottom: 4 }}>{r.title}</p>}
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#4a5a4a", lineHeight: 1.75, fontStyle: "italic" }}>"{r.text}"</p>
          </div>
        ))}
      </div>

      {!alreadyReviewed && (
        <div>
          {!showForm ? (
            <button onClick={() => { if (!user) { toast.error("Please log in to write a review."); return; } setShowForm(true); }}
              className="px-6 py-3 text-sm uppercase tracking-widest border hover:border-[#c9a84c] transition-colors"
              style={{ borderColor: "rgba(26,61,43,0.25)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
              Write a Review
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="p-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
              <h4 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: C.green, marginBottom: 16 }}>Write a Review</h4>
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} onClick={() => setNewRating(n)}>
                    <Star size={24} fill={(hoverRating || newRating) >= n ? C.gold : "none"} color={C.gold} />
                  </button>
                ))}
              </div>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Review title (optional)"
                className="w-full px-4 py-2.5 mb-3 text-sm outline-none"
                style={{ border: `1px solid rgba(26,61,43,0.2)`, backgroundColor: "transparent", color: C.green, fontFamily: "'DM Sans',sans-serif" }} />
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share your experience with this product..." required rows={4}
                className="w-full px-4 py-2.5 mb-4 text-sm outline-none resize-none"
                style={{ border: `1px solid rgba(26,61,43,0.2)`, backgroundColor: "transparent", color: C.green, fontFamily: "'DM Sans',sans-serif" }} />
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="px-6 py-2.5 text-sm uppercase tracking-widest"
                  style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif", opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? "Submitting..." : "Submit Review"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm border"
                  style={{ borderColor: "rgba(26,61,43,0.2)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
// ─── Sticky Buy Bar ───────────────────────────────────────────────────────────
function StickyBar({ product, visible, onAddToCart }: { product: Product; visible: boolean; onAddToCart: () => void }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
          className="fixed top-16 left-0 right-0 z-[55] px-4 py-3"
          style={{ backgroundColor: C.green, boxShadow: "0 2px 20px rgba(0,0,0,0.15)" }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 600, color: C.ivory }}>{product.name} {product.subtitle}</span>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: C.gold, marginLeft: 12 }}>Rs. {product.price}</span>
            </div>
            <button onClick={onAddToCart} className="flex items-center gap-2 px-5 py-2 text-sm uppercase tracking-widest font-medium"
              style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
              <ShoppingCart size={15} /> Add to Cart
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Product Detail Page ──────────────────────────────────────────────────────
export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { addToCart, toggleWishlist, wishlist, products, productsLoading } = useStore();

  const product = products.find(p => p.slug === slug);
  const related = products.filter(p => p.id !== product?.id);
  const inWishlist = product ? wishlist.has(product.id) : false;

  const [qty, setQty]             = useState(1);
  const [stickyVisible, setStickyVisible] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { threshold: 0 });
    if (ctaRef.current) obs.observe(ctaRef.current);
    return () => obs.disconnect();
  }, [product]);

  if (productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: C.ivory }}>
        <p style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted }}>Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 text-center px-4" style={{ backgroundColor: C.ivory }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", color: C.green, marginBottom: 12 }}>Product Not Found</h2>
        <p style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted, marginBottom: 24 }}>This product may have been removed or is no longer available.</p>
        <button onClick={() => navigate("/shop")} className="px-6 py-3 text-sm uppercase tracking-widest"
          style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Back to Shop</button>
      </div>
    );
  }

  const handleAddToCart = () => addToCart(product, qty);

  return (
    <div style={{ backgroundColor: C.ivory, minHeight: "100vh" }}>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          {[["Home", "/"], ["Shop", "/shop"], [`${product.name} ${product.subtitle}`, null]].map(([label, href], i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span style={{ color: "rgba(26,61,43,0.3)" }}>/</span>}
              {href ? (
                <button onClick={() => navigate(href)} className="hover:text-[#c9a84c] transition-colors"
                  style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: C.muted }}>{label}</button>
              ) : (
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: C.green }}>{label}</span>
              )}
            </span>
          ))}
        </div>

        {/* Main layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
          {/* Gallery */}
          <FadeIn>
            <ImageGallery product={product} />
          </FadeIn>

          {/* Info */}
          <FadeIn delay={0.12}>
            <div className="min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                {product.isBestSeller && <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] uppercase tracking-wider" style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Best Seller</span>}
                {product.isFeatured  && <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] uppercase tracking-wider" style={{ backgroundColor: "rgba(201,168,76,0.15)", color: C.gold, fontFamily: "'DM Sans',sans-serif" }}>Featured</span>}
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] uppercase tracking-wider" style={{ color: product.stock > 0 ? "#2d8a4e" : "#d4183d", backgroundColor: product.stock > 0 ? "rgba(45,138,78,0.1)" : "rgba(212,24,61,0.1)", fontFamily: "'DM Sans',sans-serif" }}>
                  {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
                </span>
              </div>

              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.4rem,5vw,2.8rem)", fontWeight: 700, color: C.green, lineHeight: 1.15 }}>
                {product.name}<br /><span style={{ fontStyle: "italic", color: C.olive }}>{product.subtitle}</span>
              </h1>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.74rem", color: C.muted, marginTop: 4, letterSpacing: "0.06em" }} className="sm:text-[0.84rem] sm:mt-1.5">
                {product.tagline} · {product.weight}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2 mb-3 sm:mt-3 sm:mb-5">
                <StarRating rating={product.rating} />
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.74rem", color: C.muted }} className="sm:text-[0.82rem]">({product.reviewCount} reviews)</span>
              </div>

              {/* Price */}
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:gap-x-4 sm:gap-y-2 mb-4 pb-4 sm:mb-6 sm:pb-6" style={{ borderBottom: `1px solid rgba(26,61,43,0.1)` }}>
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.7rem", fontWeight: 700, color: C.green }} className="sm:text-[2.6rem]">Rs. {product.price.toLocaleString()}</span>
                <span className="line-through sm:text-[1.2rem]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", color: "#aabba9" }}>Rs. {product.oldPrice.toLocaleString()}</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", fontWeight: 600, backgroundColor: C.gold, color: C.green, padding: "2px 8px" }} className="sm:text-[0.8rem] sm:py-[3px] sm:px-[10px]">
                  {product.discount}% OFF
                </span>
              </div>

              {/* Short description */}
              <p style={{ fontFamily: "'DM Sans',sans-serif", color: "#4a5a4a", lineHeight: 1.7, fontSize: "0.82rem", marginBottom: 14 }} className="sm:leading-[1.82] sm:text-[0.92rem] sm:mb-5">
                {product.description.slice(0, 180)}...
              </p>

              {/* Benefits chips */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                {product.benefits.map(b => (
                  <span key={b} className="px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs" style={{ backgroundColor: "rgba(201,168,76,0.1)", color: C.olive, fontFamily: "'DM Sans',sans-serif", border: `1px solid rgba(201,168,76,0.2)` }}>{b}</span>
                ))}
              </div>

              {/* Skin types */}
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted, marginBottom: 12 }} className="sm:text-[0.8rem] sm:mb-4">
                <span style={{ color: C.green, fontWeight: 600 }}>Suitable for: </span>{product.skinTypes.join(", ")} skin types
              </p>

              {/* Quantity */}
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div className="flex items-center border" style={{ borderColor: "rgba(26,61,43,0.3)" }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-black/5 transition-colors text-base sm:text-xl" style={{ color: C.green }}>−</button>
                  <span className="w-8 sm:w-10 text-center" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.green, fontWeight: 600 }}>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-black/5 transition-colors text-base sm:text-xl" style={{ color: C.green }}>+</button>
                </div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }} className="sm:text-[0.8rem]">Total: <strong style={{ color: C.green }}>Rs. {(product.price * qty).toLocaleString()}</strong></p>
              </div>

              {/* CTA row */}
              <div ref={ctaRef} className="flex flex-row gap-2 sm:gap-3 mb-4 sm:mb-5">
                <button onClick={() => { addToCart(product, qty); navigate("/checkout"); }}
                  className="group flex-1 py-3 sm:py-4 text-xs sm:text-sm font-medium relative overflow-hidden"
                  style={{ backgroundColor: C.green, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <span className="absolute inset-0 translate-x-full group-hover:translate-x-0 transition-transform duration-300 z-0" style={{ backgroundColor: C.gold }} />
                  <span className="relative z-10 block group-hover:opacity-0 transition-opacity duration-300" style={{ color: C.ivory }}>Buy Now</span>
                  <span className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: C.green }}>Buy Now</span>
                </button>
                <button onClick={handleAddToCart} className="flex-1 py-3 sm:py-4 text-xs sm:text-sm font-medium border flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-[rgba(26,61,43,0.05)] transition-colors"
                  style={{ borderColor: C.green, color: C.green, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <ShoppingCart size={13} className="sm:hidden" /> <ShoppingCart size={15} className="hidden sm:block" />
                  <span className="hidden xs:inline sm:inline">Add to Cart</span>
                  <span className="xs:hidden sm:hidden">Add</span>
                </button>
              </div>

              {/* Wishlist + Share */}
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => toggleWishlist(product)} className="flex items-center gap-1.5 px-3 py-2 border text-xs hover:border-[#c9a84c] transition-colors"
                  style={{ borderColor: "rgba(26,61,43,0.25)", color: inWishlist ? C.gold : C.green, fontFamily: "'DM Sans',sans-serif" }}>
                  <Heart size={13} fill={inWishlist ? C.gold : "none"} color={inWishlist ? C.gold : C.green} />
                  {inWishlist ? "In Wishlist" : "Add to Wishlist"}
                </button>
                <ShareDropdown />
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 pt-5" style={{ borderTop: `1px solid rgba(26,61,43,0.1)` }}>
                {[
                  { Icon: Truck,    label: "2–4 Day Delivery", sub: "Rs. 300 flat rate" },
                  { Icon: RotateCcw, label: "2-Day Returns",   sub: "Hassle free" },
                  { Icon: Shield,   label: "Secure Payment",   sub: "100% encrypted" },
                ].map(({ Icon, label, sub }) => (
                  <div key={label} className="text-center">
                    <Icon size={18} color={C.gold} style={{ margin: "0 auto 6px" }} />
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 600, color: C.green }}>{label}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.66rem", color: C.muted }}>{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Tabs section */}
        <FadeIn>
          <div className="mb-16">
            <ProductTabs product={product} />
          </div>
        </FadeIn>

        {/* Reviews */}
        <FadeIn>
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <GoldLine />
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: C.green }}>Customer Reviews</h2>
            </div>
            <ReviewSection product={product} />
          </div>
        </FadeIn>

        {/* Related Products */}
        <FadeIn>
          <div>
            <div className="flex items-center gap-3 mb-8">
              <GoldLine />
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: C.green }}>You May Also Like</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map(p => (
                <ProductCard key={p.id} product={p}
                  onView={() => navigate(`/products/${p.slug}`)}
                  onAddToCart={() => addToCart(p)}
                  onQuickView={() => {}}
                  onToggleWishlist={() => toggleWishlist(p)}
                  inWishlist={wishlist.has(p.id)} />
              ))}
              {/* Coming soon placeholders */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center justify-center py-16 text-center" style={{ backgroundColor: C.cream, border: `1px dashed rgba(201,168,76,0.3)` }}>
                  <span className="text-2xl mb-2">🌿</span>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.9rem", color: C.green }}>Coming Soon</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted, marginTop: 4 }}>New arrivals soon</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
