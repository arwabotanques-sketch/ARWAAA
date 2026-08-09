import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import { useStore } from "./store";
import { BrandLogo, C, LeafSVG, GoldLine } from "./shared";
import { POPULAR_SEARCHES } from "./data";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import IntroScreen, { shouldShowIntro } from "./components/IntroScreen";
import SmoothScroll from "./components/SmoothScroll";
import { subscribeToNewsletter } from "./api/newsletter";
import {
  Menu, X, ShoppingCart, Heart, Search, Phone, Mail, MapPin,
  Instagram, Facebook, MessageCircle, Truck, RotateCcw, Shield,
  ChevronDown, Plus, Minus, Trash2, User, LogOut, LayoutDashboard,
  Bot, Zap,
} from "lucide-react";

// Pages where the navbar should always stay visible and instantly clickable —
// Apple-style hide-on-scroll only makes sense on marketing/storefront pages,
// not on functional pages like the dashboard, checkout, or admin panel.
const UTILITY_PREFIXES = ["/dashboard", "/checkout", "/cart", "/auth", "/admin"];
const isUtilityPath = (path: string) => UTILITY_PREFIXES.some(p => path.startsWith(p));

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(target: Date) {
  const [rem, setRem] = useState(() => Math.max(0, target.getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setRem(Math.max(0, target.getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(rem / 3600000);
  const m = Math.floor((rem % 3600000) / 60000);
  const s = Math.floor((rem % 60000) / 1000);
  return { h, m, s, expired: rem === 0 };
}

// ─── Flash Sale Banner (Phase H) ──────────────────────────────────────────────
const SALE_END = new Date("2026-08-15T23:59:59");

function FlashSaleBanner({ onDismiss, onExpire }: { onDismiss: () => void; onExpire: () => void }) {
  const { h, m, s, expired } = useCountdown(SALE_END);
  useEffect(() => { if (expired) onExpire(); }, [expired]);
  if (expired) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="relative overflow-hidden flex items-center justify-center gap-2.5 px-3 py-2"
      style={{
        height: 40,
        background: `linear-gradient(90deg, ${C.green} 0%, #2a5c40 25%, ${C.gold} 50%, #2a5c40 75%, ${C.green} 100%)`,
        backgroundSize: "200% 100%",
        animation: "arwaBannerShift 6s linear infinite",
      }}>
      <motion.span
        animate={{ rotate: [0, 15, -10, 15, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
        className="flex-shrink-0">
        <Zap size={14} color={C.gold} fill={C.gold} />
      </motion.span>

      <span className="whitespace-nowrap" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 700, color: C.ivory, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        Flash Sale
      </span>

      <motion.span
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="hidden sm:inline-flex items-center px-2 py-0.5 whitespace-nowrap"
        style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.02em" }}>
        40% OFF
      </motion.span>

      <span className="hidden md:inline whitespace-nowrap" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", color: "rgba(245,240,232,0.75)" }}>
        Ends in
      </span>
      <div className="flex items-center gap-1">
        {[pad(h), pad(m), pad(s)].map((v, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 font-bold text-xs" style={{ backgroundColor: "rgba(245,240,232,0.12)", color: C.gold, fontFamily: "'DM Sans',sans-serif", minWidth: 26, textAlign: "center", border: `1px solid rgba(201,168,76,0.3)` }}>{v}</span>
            {i < 2 && <span style={{ color: C.gold, fontWeight: 700 }}>:</span>}
          </span>
        ))}
      </div>

      <button onClick={onDismiss} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-60 transition-opacity" aria-label="Dismiss sale banner">
        <X size={14} color={C.ivory} />
      </button>
    </div>
  );
}

// ─── Scroll Progress ──────────────────────────────────────────────────────────
function ScrollProgress({ y, top }: { y: number; top: number }) {
  const [max, setMax] = useState(1);
  useEffect(() => { setMax(document.documentElement.scrollHeight - window.innerHeight || 1); }, []);
  return (
    <div className="fixed left-0 right-0 z-[100]" style={{ top, height: 2 }}>
      <div style={{ height: "100%", width: `${Math.min((y / max) * 100, 100)}%`, background: C.gold, transition: "width 0.1s linear" }} />
    </div>
  );
}

// ─── Premium Loader ───────────────────────────────────────────────────────────
function PremiumLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center" style={{ backgroundColor: C.green }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <BrandLogo light />
      </motion.div>
      <div className="mt-8 w-48 overflow-hidden" style={{ height: 1, backgroundColor: "rgba(201,168,76,0.25)" }}>
        <div style={{ height: "100%", background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, backgroundSize: "200% 100%", animation: "shimmerBar 1.6s ease-in-out infinite" }} />
      </div>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", letterSpacing: "0.38em", color: C.gold, marginTop: "1rem", textTransform: "uppercase" }}>
        Nature. Purity. You.
      </p>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Home",     href: "/" },
  { label: "Shop",     href: "/shop" },
  { label: "Skin Quiz", href: "/quiz" },
  { label: "AI Assistant", href: "/ai" },
  { label: "About",    href: "/about" },
];

function Navbar({ scrollY, navTop, hidden }: { scrollY: number; navTop: number; hidden: boolean }) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { cartCount, wishlistCount, setCartDrawerOpen, setSearchOpen, user, isAuthenticated, customerAuthLoading, logout } = useStore();
  const [navOpen, setNavOpen]       = useState(false);
  const [userMenu, setUserMenu]     = useState(false);
  const scrolled = scrollY > 64 || location.pathname !== "/";
  const light    = !scrolled;
  const isAuthPage = location.pathname.startsWith("/auth");

  return (
    <nav className="fixed left-0 right-0 z-[65] isolate transition-all duration-500"
      style={{ top: navTop, backgroundColor: scrolled ? C.cream : "rgba(26,61,43,0.97)", backdropFilter: "blur(14px)", boxShadow: scrolled ? "0 1px 24px rgba(0,0,0,0.08)" : "none", transform: (hidden && !navOpen && !userMenu) ? "translateY(-100%)" : "translateY(0)", transition: "transform 0.35s ease, background-color 0.5s, box-shadow 0.5s" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between" style={{ height: scrolled ? 64 : 76, transition: "height 0.4s" }}>
        <div onClick={() => navigate("/")} style={{ cursor: "pointer" }}><BrandLogo light={light} compact /></div>

        {isAuthPage ? (
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: light ? C.ivory : C.green }}>
            ← Back to Home
          </button>
        ) : (
          <>
            {/* Desktop links */}
            <div className="hidden lg:flex items-center gap-6">
              {NAV_LINKS.map(l => (
                <a key={l.label} href={l.href}
                  onClick={e => { if (!l.href.startsWith("#")) { e.preventDefault(); navigate(l.href); } }}
                  style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: light ? C.ivory : C.green, fontWeight: location.pathname === l.href ? 600 : 400 }}
                  className="hover:opacity-60 transition-opacity">{l.label}</a>
              ))}
            </div>

            {/* Icons */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => setSearchOpen(true)} className="p-2 hover:opacity-60 transition-opacity" aria-label="Search">
                <Search size={18} color={light ? C.ivory : C.green} />
              </button>
              <button onClick={() => navigate("/shop")} className="relative p-2 hover:opacity-60 transition-opacity" aria-label="Wishlist">
                <Heart size={18} color={light ? C.ivory : C.green} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: C.gold, color: C.green }}>{wishlistCount}</span>
                )}
              </button>
              <button onClick={() => setCartDrawerOpen(true)} className="relative p-2 hover:opacity-60 transition-opacity" aria-label="Cart">
                <ShoppingCart size={18} color={light ? C.ivory : C.green} />
                {cartCount > 0 && (
                  <motion.span key={cartCount} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: C.gold, color: C.green }}>{cartCount}</motion.span>
                )}
              </button>

              {/* Auth state — while we're still asking the backend "is this cookie
                  valid?", show neither state rather than briefly flashing "Sign In"
                  for someone who's actually still logged in. */}
              {customerAuthLoading ? (
                <div className="w-8 h-8" />
              ) : isAuthenticated && user ? (
                <div className="relative">
                  <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 p-1 hover:opacity-80 transition-opacity" aria-label="Account">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'Playfair Display',serif" }}>
                      {user.name[0]}
                    </div>
                  </button>
                  <AnimatePresence>
                    {userMenu && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 top-full mt-2 w-48 py-1 z-20"
                        style={{ backgroundColor: C.cream, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: `1px solid rgba(201,168,76,0.2)` }}>
                        <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(201,168,76,0.15)" }}>
                          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.9rem", color: C.green, fontWeight: 600 }}>{user.name}</p>
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>{user.email}</p>
                        </div>
                        <button onClick={() => { navigate("/dashboard"); setUserMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[rgba(201,168,76,0.08)] transition-colors"
                          style={{ fontFamily: "'DM Sans',sans-serif", color: C.green }}>
                          <LayoutDashboard size={14} /> Dashboard
                        </button>
                        <button onClick={() => { navigate("/dashboard/orders"); setUserMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[rgba(201,168,76,0.08)] transition-colors"
                          style={{ fontFamily: "'DM Sans',sans-serif", color: C.green }}>
                          <ShoppingCart size={14} /> My Orders
                        </button>
                        <div style={{ borderTop: `1px solid rgba(201,168,76,0.15)`, marginTop: 4 }}>
                          <button onClick={() => { logout(); setUserMenu(false); navigate("/"); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors"
                            style={{ fontFamily: "'DM Sans',sans-serif", color: "#d4183d" }}>
                            <LogOut size={14} /> Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button onClick={() => navigate("/auth/login")} className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-medium uppercase tracking-widest ml-1"
                  style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
                  <User size={13} /> Sign In
                </button>
              )}

              <button className="lg:hidden p-2 hover:opacity-60 transition-opacity ml-1" aria-label="Menu" onClick={() => setNavOpen(!navOpen)}>
                {navOpen ? <X size={22} color={light ? C.ivory : C.green} /> : <Menu size={22} color={light ? C.ivory : C.green} />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile drawer */}
      {!isAuthPage && (
        <AnimatePresence>
          {navOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden" style={{ backgroundColor: C.green, borderTop: `1px solid rgba(201,168,76,0.15)` }}>
              <div className="px-5 pb-5 pt-2">
                {NAV_LINKS.map(l => (
                  <a key={l.label} href={l.href} className="block py-3 text-sm"
                    onClick={e => { e.preventDefault(); navigate(l.href); setNavOpen(false); }}
                    style={{ fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", color: C.ivory, borderBottom: `1px solid rgba(201,168,76,0.12)` }}>{l.label}</a>
                ))}
                {!customerAuthLoading && !isAuthenticated && (
                  <button onClick={() => { navigate("/auth/login"); setNavOpen(false); }} className="w-full mt-4 py-3 text-sm uppercase tracking-widest"
                    style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
                    Sign In / Register
                  </button>
                )}
                {!customerAuthLoading && isAuthenticated && user && (
                  <button onClick={() => { navigate("/dashboard"); setNavOpen(false); }} className="w-full mt-4 py-3 text-sm uppercase tracking-widest"
                    style={{ backgroundColor: "rgba(201,168,76,0.15)", color: C.gold, fontFamily: "'DM Sans',sans-serif" }}>
                    My Dashboard
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </nav>
  );
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────
function CartDrawer() {
  const { cart, cartDrawerOpen, setCartDrawerOpen, removeFromCart, updateQty, cartTotal } = useStore();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {cartDrawerOpen && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70]" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setCartDrawerOpen(false)} />
          <motion.div key="dr" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.32 }}
            className="fixed right-0 top-0 bottom-0 z-[80] flex flex-col"
            style={{ width: "min(420px,100vw)", backgroundColor: C.cream, boxShadow: "-4px 0 32px rgba(0,0,0,0.12)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid rgba(201,168,76,0.2)` }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, color: C.green }}>Your Cart</h2>
                {cart.length > 0 && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: C.muted }}>{cart.reduce((s, i) => s + i.qty, 0)} items</p>}
              </div>
              <button onClick={() => setCartDrawerOpen(false)}><X size={20} color={C.green} /></button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-5">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <ShoppingCart size={48} color="rgba(201,168,76,0.35)" />
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: C.green, marginTop: 14 }}>Your cart is empty</p>
                  <button onClick={() => { setCartDrawerOpen(false); navigate("/shop"); }}
                    className="mt-5 px-6 py-3 text-sm uppercase tracking-widest"
                    style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Browse Shop</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex gap-4 pb-4" style={{ borderBottom: `1px solid rgba(201,168,76,0.15)` }}>
                      <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "#eee8da" }}>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.55rem", color: C.muted, textAlign: "center" }}>Arwa Botaniqs</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.9rem", fontWeight: 600, color: C.green }}>{item.product.name}</p>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: C.muted }}>{item.product.subtitle} · {item.product.weight}</p>
                        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: C.green, marginTop: 3 }}>Rs. {(item.product.price * item.qty).toLocaleString()}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border" style={{ borderColor: "rgba(26,61,43,0.2)" }}>
                            <button onClick={() => updateQty(item.product.id, item.qty - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 transition-colors" disabled={item.qty <= 1}>
                              <Minus size={12} color={C.green} />
                            </button>
                            <span className="w-8 text-center" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}>{item.qty}</span>
                            <button onClick={() => updateQty(item.product.id, item.qty + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 transition-colors">
                              <Plus size={12} color={C.green} />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(item.product.id)}><Trash2 size={14} color="#d4183d" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-5 py-4" style={{ borderTop: `1px solid rgba(201,168,76,0.2)` }}>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.muted }}>Subtotal</span>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}>Rs. {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.muted }}>Shipping</span>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}>Rs. 300</span>
                  </div>
                  <div className="flex justify-between pt-2" style={{ borderTop: `1px solid rgba(201,168,76,0.18)` }}>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: C.green }}>Total</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: C.green }}>Rs. {(cartTotal + 300).toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={() => { setCartDrawerOpen(false); navigate("/checkout"); }} className="w-full py-3.5 text-sm uppercase tracking-widest font-medium mb-2"
                  style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif" }}>Proceed to Checkout</button>
                <button onClick={() => { setCartDrawerOpen(false); navigate("/cart"); }} className="w-full py-3 text-sm uppercase tracking-widest border"
                  style={{ borderColor: C.green, color: C.green, fontFamily: "'DM Sans',sans-serif" }}>View Full Cart</button>
                <button onClick={() => { setCartDrawerOpen(false); navigate("/shop"); }} className="w-full mt-2 text-xs text-center hover:opacity-60"
                  style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted }}>← Continue Shopping</button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Search Overlay ───────────────────────────────────────────────────────────
function SearchOverlay() {
  const { searchOpen, setSearchOpen, products } = useStore();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => { if (searchOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [searchOpen]);
  useEffect(() => { const s = localStorage.getItem("arwa_searches"); if (s) setRecent(JSON.parse(s)); }, [searchOpen]);

  const results = query.length > 1 ? products.filter(p => `${p.name} ${p.subtitle} ${p.tagline}`.toLowerCase().includes(query.toLowerCase())) : [];

  const doSearch = (q: string) => {
    if (!q.trim()) return;
    const next = [q, ...recent.filter(r => r !== q)].slice(0, 5);
    setRecent(next);
    localStorage.setItem("arwa_searches", JSON.stringify(next));
    setSearchOpen(false);
    setQuery("");
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex flex-col items-center px-4 pt-24"
          style={{ backgroundColor: "rgba(26,61,43,0.97)", backdropFilter: "blur(16px)" }}>
          <button onClick={() => setSearchOpen(false)} className="absolute top-6 right-6 p-2"><X size={24} color={C.ivory} /></button>
          <div className="w-full max-w-2xl">
            <div className="flex items-center border-b-2" style={{ borderColor: C.gold }}>
              <Search size={22} color={C.gold} className="flex-shrink-0 mr-4" />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch(query)} placeholder="Search products..."
                className="flex-1 bg-transparent outline-none py-3"
                style={{ fontFamily: "'Playfair Display',serif", color: C.ivory, fontSize: "1.5rem" }} />
              {query && <button onClick={() => setQuery("")}><X size={18} color={C.muted} /></button>}
            </div>

            {results.length > 0 && (
              <div className="mt-4">
                {results.map(p => (
                  <button key={p.id} onClick={() => { setSearchOpen(false); navigate(`/products/${p.slug}`); }}
                    className="w-full flex items-center gap-4 py-3 px-3 hover:bg-white/5 transition-colors text-left">
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: "rgba(201,168,76,0.15)" }}>
                      {p.imageUrl ? (
                        <ImageWithFallback src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.55rem", color: C.gold }}>AB</span>
                      )}
                    </div>
                    <div>
                      <p style={{ fontFamily: "'Playfair Display',serif", color: C.ivory, fontSize: "0.95rem" }}>{p.name} {p.subtitle}</p>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted, fontSize: "0.78rem" }}>Rs. {p.price} · {p.weight}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {query.length > 1 && results.length === 0 && (
              <div className="mt-8 text-center">
                <p style={{ fontFamily: "'DM Sans',sans-serif", color: "rgba(245,240,232,0.5)" }}>No results for "<span style={{ color: C.gold }}>{query}</span>"</p>
                <button onClick={() => { setSearchOpen(false); navigate("/shop"); }} className="mt-4 px-6 py-2 border text-sm"
                  style={{ borderColor: "rgba(201,168,76,0.3)", color: C.gold, fontFamily: "'DM Sans',sans-serif" }}>Browse All Products</button>
              </div>
            )}

            {!query && (
              <div className="mt-8">
                {recent.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.3em", textTransform: "uppercase", color: C.gold }}>Recent</span>
                      <button onClick={() => { setRecent([]); localStorage.removeItem("arwa_searches"); }} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>Clear</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recent.map(r => <button key={r} onClick={() => doSearch(r)} className="px-3 py-1.5 text-sm border hover:border-[#c9a84c] transition-colors" style={{ borderColor: "rgba(201,168,76,0.2)", color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>{r}</button>)}
                    </div>
                  </div>
                )}
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.3em", textTransform: "uppercase", color: C.gold, display: "block", marginBottom: 12 }}>Popular</span>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map(s => <button key={s} onClick={() => doSearch(s)} className="px-3 py-1.5 text-sm border hover:border-[#c9a84c] transition-colors" style={{ borderColor: "rgba(201,168,76,0.2)", color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>{s}</button>)}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Quick View Modal ─────────────────────────────────────────────────────────
function QuickViewModal() {
  const { quickViewId, setQuickViewId, addToCart, wishlist, toggleWishlist, products } = useStore();
  const navigate = useNavigate();
  const product = products.find(p => p.id === quickViewId);
  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div key="qv-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70]" style={{ backgroundColor: "rgba(0,0,0,0.55)" }} onClick={() => setQuickViewId(null)} />
          <motion.div key="qv" initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
            className="fixed z-[80] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl mx-4 p-6 overflow-y-auto"
            style={{ backgroundColor: C.cream, maxHeight: "90vh" }}>
            <button onClick={() => setQuickViewId(null)} className="absolute top-4 right-4"><X size={20} color={C.green} /></button>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="aspect-square flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#eee8da" }}>
                {product.imageUrl ? (
                  <ImageWithFallback src={product.imageUrl} alt={`${product.name} ${product.subtitle}`} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ fontFamily: "'Playfair Display',serif", color: C.muted }}>Arwa Botaniqs</span>
                )}
              </div>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", fontWeight: 700, color: C.green }}>{product.name}<br /><span style={{ fontStyle: "italic", color: C.olive }}>{product.subtitle}</span></h3>
                <div className="flex items-baseline gap-3 my-4">
                  <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 700, color: C.green }}>Rs. {product.price}</span>
                  <span className="line-through" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "1rem", color: "#aabba9" }}>Rs. {product.oldPrice}</span>
                </div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "#4a5a4a", lineHeight: 1.75, marginBottom: 16 }}>{product.description.slice(0, 120)}...</p>
                <div className="flex gap-3">
                  <button onClick={() => { addToCart(product); setQuickViewId(null); }} className="flex-1 py-3 text-sm uppercase tracking-wider" style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Add to Cart</button>
                  <button onClick={() => toggleWishlist(product)} className="w-10 h-10 flex items-center justify-center border hover:border-[#c9a84c] transition-colors" style={{ borderColor: "rgba(26,61,43,0.25)" }}>
                    <Heart size={16} fill={wishlist.has(product.id) ? C.gold : "none"} color={wishlist.has(product.id) ? C.gold : C.green} />
                  </button>
                </div>
                <button onClick={() => { setQuickViewId(null); navigate(`/products/${product.slug}`); }} className="mt-3 text-xs w-full text-center hover:opacity-60" style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted }}>View Full Details →</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Cookie Banner ────────────────────────────────────────────────────────────
function CookieBanner({ onAccept }: { onAccept: () => void }) {
  return (
    <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3"
      style={{ backgroundColor: C.green, borderTop: `1px solid rgba(201,168,76,0.18)` }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "rgba(245,240,232,0.68)" }}>We use cookies to improve your experience. By continuing, you accept our cookie policy.</p>
        <button onClick={onAccept} className="flex-shrink-0 px-6 py-2 text-sm font-medium" style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>Accept</button>
      </div>
    </motion.div>
  );
}

// ─── Newsletter Popup ─────────────────────────────────────────────────────────
function NewsletterPopup({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const dismiss = () => { localStorage.setItem("arwa_newsletter_seen", "1"); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribing) return;
    setSubscribing(true);
    try {
      const result = await subscribeToNewsletter(email);
      setDone(true);
      localStorage.setItem("arwa_newsletter_seen", "1");
      toast.success(result.alreadySubscribed ? "You're already part of the family! 🌿" : "Welcome to the Arwa Botaniqs family! 🌿");
    } catch (err: any) {
      toast.error(err.message || "Couldn't subscribe. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm p-8" style={{ backgroundColor: C.green, border: `1px solid rgba(201,168,76,0.28)` }}>
        <button onClick={dismiss} className="absolute top-4 right-4 hover:opacity-60"><X size={18} color="rgba(245,240,232,0.4)" /></button>
        <div className="text-center">
          <BrandLogo light compact />
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.55rem", fontWeight: 700, color: C.ivory, marginTop: "1.5rem", marginBottom: "0.5rem" }}>Exclusive Welcome Offer</h3>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "rgba(245,240,232,0.55)", lineHeight: 1.7, marginBottom: "1.5rem" }}>Subscribe for skincare tips, exclusive deals, and early access to new launches.</p>
          {done ? (
            <div className="py-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: C.gold }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", color: C.ivory }}>You are in! Welcome to Arwa Botaniqs.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" required
                className="w-full px-4 py-3 mb-3 text-sm outline-none"
                style={{ backgroundColor: "rgba(245,240,232,0.08)", border: `1px solid rgba(201,168,76,0.22)`, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }} />
              <button type="submit" disabled={subscribing} className="w-full py-3 text-sm font-medium" style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", opacity: subscribing ? 0.6 : 1 }}>
                {subscribing ? "Subscribing..." : "Subscribe"}
              </button>
            </form>
          )}
          <button onClick={dismiss} className="mt-4 text-xs hover:opacity-50" style={{ fontFamily: "'DM Sans',sans-serif", color: "rgba(245,240,232,0.3)" }}>No thanks</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const navigate = useNavigate();
  return (
    <footer style={{ backgroundColor: C.dark }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <BrandLogo light />
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "rgba(245,240,232,0.45)", lineHeight: 1.7, marginTop: 14, marginBottom: 20 }}>
              Luxury botanical beauty from Faisalabad, Pakistan.<br />Nature. Purity. You.
            </p>
            <div className="flex gap-3">
              {[Instagram, Facebook].map((Icon, i) => (
                <a key={i} href="#" aria-label="Social" className="w-9 h-9 flex items-center justify-center border transition-all hover:border-[#c9a84c]" style={{ borderColor: "rgba(201,168,76,0.18)" }}><Icon size={15} color={C.gold} /></a>
              ))}
              <a href="https://wa.me/923049067897" target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center border transition-all hover:border-[#c9a84c]" style={{ borderColor: "rgba(201,168,76,0.18)" }}><MessageCircle size={15} color={C.gold} /></a>
            </div>
          </div>
          <div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.3em", textTransform: "uppercase", color: C.gold, marginBottom: 16 }}>Quick Links</p>
            {[["Home", "/"], ["Shop", "/shop"], ["Skin Quiz", "/quiz"], ["AI Assistant", "/ai"], ["About Us", "/"], ["Contact", "#"]].map(([l, h]) => (
              <a key={l} href={h} onClick={e => { e.preventDefault(); navigate(h); }} className="block py-1.5 transition-colors hover:text-[#c9a84c]"
                style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "rgba(245,240,232,0.5)" }}>{l}</a>
            ))}
          </div>
          <div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.3em", textTransform: "uppercase", color: C.gold, marginBottom: 16 }}>Contact Us</p>
            <div className="space-y-3.5">
              <a href="tel:+923049067897" className="flex items-center gap-3 group"><Phone size={13} color={C.gold} /><span className="transition-colors group-hover:text-[#c9a84c]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "rgba(245,240,232,0.5)" }}>+92 304 9067897</span></a>
              <a href="mailto:arwabotanicss@gmail.com" className="flex items-center gap-3 group"><Mail size={13} color={C.gold} /><span className="transition-colors group-hover:text-[#c9a84c]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "rgba(245,240,232,0.5)" }}>arwabotanicss@gmail.com</span></a>
              <div className="flex items-center gap-3"><MapPin size={13} color={C.gold} /><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "rgba(245,240,232,0.5)" }}>Faisalabad, Pakistan</span></div>
            </div>
          </div>
          <div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.3em", textTransform: "uppercase", color: C.gold, marginBottom: 16 }}>Shipping & Returns</p>
            <div className="space-y-3 mb-5">
              {[{ Icon: Truck, t: "Delivery 2–4 Days", s: "Flat Rs. 300" }, { Icon: RotateCcw, t: "2-Day Returns", s: "Hassle-free" }, { Icon: Shield, t: "Secure Payments", s: "100% encrypted" }].map(({ Icon, t, s }) => (
                <div key={t} className="flex items-start gap-3">
                  <Icon size={13} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div><p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "rgba(245,240,232,0.65)" }}>{t}</p><p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "rgba(245,240,232,0.35)" }}>{s}</p></div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["JazzCash", "EasyPaisa", "COD", "Visa", "MC"].map(m => (
                <span key={m} className="px-1.5 py-0.5 text-[11px]" style={{ border: `1px solid rgba(201,168,76,0.18)`, color: "rgba(245,240,232,0.4)", fontFamily: "'DM Sans',sans-serif" }}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid rgba(201,168,76,0.1)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: "rgba(245,240,232,0.28)" }}>© 2026 Arwa Botaniqs. All rights reserved.</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: "rgba(245,240,232,0.28)" }}>Crafted with nature. Made in Pakistan.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading,        setLoading]        = useState(true);
  const [scrollY,        setScrollY]        = useState(0);
  const [navHidden,      setNavHidden]      = useState(false);
  const [showBanner,     setShowBanner]     = useState(true);
  const [showCookie,     setShowCookie]     = useState(false);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [showIntro,      setShowIntro]      = useState(() => shouldShowIntro());
  const lastScrollY = useRef(0);
  const scrollAccum = useRef(0);
  const scrollDir   = useRef<"up" | "down" | null>(null);

  const BANNER_H = showBanner ? 40 : 0;

  useEffect(() => { const t = setTimeout(() => setLoading(false), 1800); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (localStorage.getItem("arwa_newsletter_seen")) return;
    const t = setTimeout(() => setShowNewsletter(true), 10000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (localStorage.getItem("arwa_cookie_consent") === "accepted") return;
    const t = setTimeout(() => setShowCookie(true), 120000); // show once, ~2 minutes in
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const REVEAL_THRESHOLD = 40; // px of sustained upward scroll needed before the navbar reappears
    const isUtility = isUtilityPath(location.pathname);
    const fn = () => {
      const y = window.scrollY;
      setScrollY(y);

      if (isUtility) { setNavHidden(false); return; }

      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      // Ignore tiny jitters (trackpad momentum, wheel micro-reversals)
      if (Math.abs(delta) < 2) return;

      const dir = delta > 0 ? "down" : "up";
      if (dir !== scrollDir.current) {
        scrollDir.current = dir;
        scrollAccum.current = 0;
      }
      scrollAccum.current += Math.abs(delta);

      if (dir === "down" && y > 80) {
        setNavHidden(true);
      } else if (dir === "up" && scrollAccum.current > REVEAL_THRESHOLD) {
        setNavHidden(false);
      }
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [location.pathname]);
  useEffect(() => {
    window.scrollTo(0, 0);
    setNavHidden(false);
    lastScrollY.current = 0;
    scrollAccum.current = 0;
    scrollDir.current = null;
  }, [location.pathname]);

  if (loading) return <PremiumLoader />;

  // Hide footer on auth/dashboard pages
  const hideFooter = location.pathname.startsWith("/auth") || location.pathname.startsWith("/dashboard");

  return (
    <SmoothScroll>
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Cinematic intro (Phase A) */}
      <AnimatePresence>
        {showIntro && <IntroScreen onComplete={() => setShowIntro(false)} />}
      </AnimatePresence>

      {/* Flash sale banner */}
      <style>{`@keyframes arwaBannerShift { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }`}</style>
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <AnimatePresence>{showBanner && <motion.div key="banner" initial={{ height: 0, opacity: 0 }} animate={{ height: 40, opacity: 1 }} exit={{ height: 0, opacity: 0 }}><FlashSaleBanner onDismiss={() => setShowBanner(false)} onExpire={() => setShowBanner(false)} /></motion.div>}</AnimatePresence>
      </div>

      <ScrollProgress y={scrollY} top={BANNER_H + 2} />
      <Navbar scrollY={scrollY} navTop={BANNER_H} hidden={navHidden} />

      {/* Page transitions */}
      <AnimatePresence mode="wait">
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
          <Outlet />
        </motion.div>
      </AnimatePresence>

      {!hideFooter && <Footer />}

 {/* Floating buttons */}
      <a href="https://wa.me/923049067897" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
        className="fixed bottom-20 right-5 z-[55] w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
        style={{ backgroundColor: "#25D366", animation: "waPulse 2.5s ease-in-out infinite" }}>
        <MessageCircle size={22} color="white" fill="white" />
      </a>

      {/* AI floating button (Phase D) */}
      <button onClick={() => navigate("/ai")} aria-label="AI Assistant"
        className="fixed bottom-36 right-5 z-[55] w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
        style={{ backgroundColor: C.green, border: `2px solid ${C.gold}` }}>
        <Bot size={20} color={C.gold} />
      </button>

      {/* Skin quiz floating button */}
      <button onClick={() => navigate("/quiz")} aria-label="Skin Quiz"
        className="fixed bottom-52 right-5 z-[55] w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
        style={{ backgroundColor: C.gold }}>
        <Zap size={20} color={C.green} />
      </button>

      {scrollY > 500 && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"
          className="fixed bottom-5 right-5 z-[55] w-10 h-10 flex items-center justify-center hover:scale-110 transition-transform"
          style={{ backgroundColor: C.green }}>
          <ChevronDown size={17} color={C.gold} style={{ transform: "rotate(180deg)" }} />
        </button>
      )}

      <CartDrawer />
      <SearchOverlay />
      <QuickViewModal />

      {showCookie && <CookieBanner onAccept={() => { localStorage.setItem("arwa_cookie_consent", "accepted"); setShowCookie(false); }} />}
      <AnimatePresence>{showNewsletter && !showCookie && <NewsletterPopup onClose={() => setShowNewsletter(false)} />}</AnimatePresence>

      <Toaster position="top-right" toastOptions={{ style: { fontFamily: "'DM Sans',sans-serif", borderRadius: 0, border: `1px solid rgba(201,168,76,0.3)` } }} />
    </div>
    </SmoothScroll>
  );
}
