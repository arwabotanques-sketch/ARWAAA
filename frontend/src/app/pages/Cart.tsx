import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useStore } from "../store";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { C, FadeIn, StarRating, GoldLine } from "../shared";
import { Trash2, Plus, Minus, ShoppingCart, Tag, Truck, RotateCcw, ArrowRight, ChevronRight } from "lucide-react";
import { validateCouponCode } from "../api/coupons";
import { fetchShippingSettings } from "../api/shippingSettings";


export default function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQty, cartTotal, cartCount, clearCart } = useStore();

  const [coupon,       setCoupon]       = useState("");
  const [couponInput,  setCouponInput]  = useState("");
  const [couponDisc,   setCouponDisc]   = useState(0); // percent
  const [giftNote,     setGiftNote]     = useState("");
  const [showGiftNote, setShowGiftNote] = useState(false);

  const [shippingRate, setShippingRate] = useState(300);
  useEffect(() => { fetchShippingSettings().then(s => setShippingRate(s.rate)).catch(() => {}); }, []);
  const SHIPPING = shippingRate;
  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    try {
      const result = await validateCouponCode(code);
      setCoupon(result.code);
      setCouponDisc(result.discount);
      toast.success(`Coupon applied! ${result.discount}% off`);
    } catch (err: any) {
      toast.error(err.message || "Invalid coupon code");
    }
  };

  const discountAmt = Math.round(cartTotal * (couponDisc / 100));
  const grandTotal  = cartTotal - discountAmt + SHIPPING;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20" style={{ backgroundColor: C.ivory }}>
        <ShoppingCart size={64} color="rgba(201,168,76,0.3)" />
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "2rem", color: C.green, marginTop: 24, marginBottom: 12 }}>Your Cart is Empty</h2>
        <p style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted, marginBottom: 32 }}>You haven't added anything yet. Explore our botanical collection.</p>
        <button onClick={() => navigate("/shop")} className="group flex items-center gap-2 px-8 py-4 text-sm uppercase tracking-widest"
          style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>
          Shop Now <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: C.ivory, minHeight: "100vh" }}>
      {/* Banner */}
      <div className="pt-20" style={{ backgroundColor: C.green }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 mb-3">
            {[["Home", "/"], ["Cart", null]].map(([l, h], i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: "rgba(245,240,232,0.3)" }}>/</span>}
                {h ? <button onClick={() => navigate(h)} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "rgba(245,240,232,0.5)" }} className="hover:text-[#c9a84c] transition-colors">{l}</button>
                   : <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: C.gold }}>{l}</span>}
              </span>
            ))}
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 700, color: C.ivory }}>
            Shopping Cart <span style={{ color: C.gold, fontSize: "1.4rem" }}>({cartCount})</span>
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-12 pb-3 mb-2" style={{ borderBottom: `1px solid rgba(201,168,76,0.2)` }}>
              {["Product", "", "Price", "Qty", "Total", ""].map((h, i) => (
                <div key={i} className={i === 0 ? "col-span-5" : i === 1 ? "col-span-1" : "col-span-2"}>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted }}>{h}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {cart.map(item => (
                <FadeIn key={item.product.id}>
                  <div className="grid sm:grid-cols-12 items-center gap-4 py-5" style={{ borderBottom: `1px solid rgba(201,168,76,0.15)` }}>
                    {/* Image + name */}
                    <div className="sm:col-span-5 flex items-center gap-4">
                      <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center cursor-pointer overflow-hidden" style={{ backgroundColor: "#eee8da" }}
                        onClick={() => navigate(`/products/${item.product.slug}`)}>
                        {item.product.imageUrl ? (
                          <ImageWithFallback src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.55rem", color: C.muted, textAlign: "center" }}>Arwa Botaniqs</span>
                        )}
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 600, color: C.green, cursor: "pointer" }}
                          onClick={() => navigate(`/products/${item.product.slug}`)}>
                          {item.product.name}
                        </p>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted }}>{item.product.subtitle} · {item.product.weight}</p>
                        <StarRating rating={item.product.rating} size={11} />
                      </div>
                    </div>

                    {/* Spacer on mobile */}
                    <div className="hidden sm:block sm:col-span-1" />

                    {/* Price */}
                    <div className="sm:col-span-2">
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", color: C.green }}>Rs. {item.product.price.toLocaleString()}</span>
                    </div>

                    {/* Qty */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center border w-fit" style={{ borderColor: "rgba(26,61,43,0.2)" }}>
                        <button onClick={() => item.qty > 1 ? updateQty(item.product.id, item.qty - 1) : removeFromCart(item.product.id)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-black/5 transition-colors">
                          <Minus size={12} color={C.green} />
                        </button>
                        <span className="w-8 text-center" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.product.id, item.qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 transition-colors">
                          <Plus size={12} color={C.green} />
                        </button>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="sm:col-span-2">
                      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 700, color: C.green }}>
                        Rs. {(item.product.price * item.qty).toLocaleString()}
                      </span>
                    </div>

                    {/* Remove */}
                    <div className="sm:col-span-1 flex justify-end sm:justify-center">
                      <button onClick={() => removeFromCart(item.product.id)} className="hover:opacity-60 transition-opacity" aria-label="Remove">
                        <Trash2 size={16} color="#d4183d" />
                      </button>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Gift note */}
            <div className="mt-5">
              <button onClick={() => setShowGiftNote(!showGiftNote)} className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
                style={{ fontFamily: "'DM Sans',sans-serif", color: C.gold }}>
                🎁 Add a gift note {showGiftNote ? "▲" : "▼"}
              </button>
              {showGiftNote && (
                <textarea value={giftNote} onChange={e => setGiftNote(e.target.value)} placeholder="Write your gift message here..."
                  rows={3} className="w-full mt-3 px-4 py-3 text-sm outline-none resize-none"
                  style={{ border: `1px solid rgba(26,61,43,0.2)`, backgroundColor: "transparent", color: C.green, fontFamily: "'DM Sans',sans-serif" }} />
              )}
            </div>

            {/* Continue shopping */}
            <button onClick={() => navigate("/shop")} className="mt-6 flex items-center gap-2 text-sm hover:opacity-60 transition-opacity"
              style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted }}>
              ← Continue Shopping
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.25rem", fontWeight: 700, color: C.green, marginBottom: 20 }}>Order Summary</h3>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between">
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: C.muted }}>Subtotal ({cartCount} items)</span>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: C.green }}>Rs. {cartTotal.toLocaleString()}</span>
                </div>
                {couponDisc > 0 && (
                  <div className="flex justify-between">
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "#2d8a4e" }}>Coupon ({coupon}) -{couponDisc}%</span>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "#2d8a4e" }}>-Rs. {discountAmt.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: C.muted }}>Shipping</span>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: C.green }}>Rs. {SHIPPING}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Truck size={12} color={C.muted} />
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>Estimated delivery: 2–4 business days</span>
                </div>
              </div>

              {/* Coupon */}
              <div className="mb-5 pb-5" style={{ borderBottom: `1px solid rgba(201,168,76,0.2)` }}>
                {coupon ? (
                  <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: "rgba(45,138,78,0.08)", border: `1px solid rgba(45,138,78,0.3)` }}>
                    <Tag size={13} color="#2d8a4e" />
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "#2d8a4e", flex: 1 }}>{coupon} applied — {couponDisc}% off</span>
                    <button onClick={() => { setCoupon(""); setCouponDisc(0); setCouponInput(""); }} className="text-xs hover:opacity-60" style={{ color: "#d4183d" }}>Remove</button>
                  </div>
                ) : (
                  <div className="flex">
                    <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code"
                      onKeyDown={e => e.key === "Enter" && applyCoupon()}
                      className="flex-1 px-3 py-2 text-sm outline-none"
                      style={{ border: `1px solid rgba(26,61,43,0.2)`, borderRight: "none", color: C.green, fontFamily: "'DM Sans',sans-serif", backgroundColor: "transparent" }} />
                    <button onClick={applyCoupon} className="px-4 py-2 text-xs uppercase tracking-wider"
                      style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Apply</button>
                  </div>
                )}
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: C.muted, marginTop: 6 }}>Try: ARWA10, WELCOME, BOTANIQ</p>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center mb-6">
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: C.green }}>Grand Total</span>
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", fontWeight: 700, color: C.green }}>Rs. {grandTotal.toLocaleString()}</span>
              </div>

              <button onClick={() => navigate("/checkout")} className="group w-full py-4 text-sm font-medium uppercase tracking-widest relative overflow-hidden"
                style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Proceed to Checkout <ChevronRight size={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </button>

              {/* Payment icons */}
              <div className="mt-4 text-center">
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: C.muted, marginBottom: 6 }}>Secure Payment via</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {["JazzCash", "EasyPaisa", "COD", "Visa", "MC"].map(m => (
                    <span key={m} className="px-1.5 py-0.5 text-[10px]"
                      style={{ border: `1px solid rgba(26,61,43,0.2)`, color: C.muted, fontFamily: "'DM Sans',sans-serif" }}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
