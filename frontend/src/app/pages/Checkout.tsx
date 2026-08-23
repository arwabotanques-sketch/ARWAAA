import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useStore } from "../store";
import { placeOrder } from "../api/checkout";
import {
  createStripeCheckoutSession,
  submitPaymentProof,
  fetchPaymentConfig,
  type PaymentGatewayConfig,
} from "../api/payments";
import { fetchProductStockBySlug } from "../api/products";
import { validateCouponCode } from "../api/coupons";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { C, FadeIn, StarRating } from "../shared";
import { ChevronRight, Check, Truck, Shield, RotateCcw, Tag, Lock } from "lucide-react";

const PROVINCES = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad (ICT)", "Azad Kashmir (AJK)", "Gilgit-Baltistan"];
const CITIES: Record<string, string[]> = {
  "Punjab": ["Lahore","Faisalabad","Rawalpindi","Multan","Gujranwala","Sialkot","Bahawalpur","Sargodha","Sheikhupura","Jhang","Rahim Yar Khan","Gujrat","Kasur","Okara","Sahiwal","Wah Cantonment","Dera Ghazi Khan","Mianwali","Sadiqabad","Burewala","Chiniot","Kamoke","Hafizabad","Kot Addu","Jaranwala","Muridke","Khanewal","Vehari","Layyah","Toba Tek Singh"],
  "Sindh": ["Karachi","Hyderabad","Sukkur","Larkana","Nawabshah","Mirpur Khas","Jacobabad","Shikarpur","Khairpur","Dadu","Tando Adam","Tando Allahyar","Badin","Thatta","Umerkot","Ghotki","Kashmore","Sanghar","Naushahro Feroze","Matiari"],
  "Khyber Pakhtunkhwa": ["Peshawar","Mardan","Mingora","Kohat","Abbottabad","Dera Ismail Khan","Bannu","Swabi","Nowshera","Charsadda","Mansehra","Haripur","Karak","Tank","Chitral","Buner","Batkhela","Timergara","Lakki Marwat","Hangu"]
};
const SHIPPING  = 300;


type PayMethod = "cod" | "jazzcash" | "easypaisa" | "card";

// JazzCash and Easypaisa are hosted "Page Post" checkouts â€” unlike Stripe, there's no
// URL to just redirect to. The gateway expects a real HTML form POST containing the
// signed fields the backend generated. This builds that form off-screen and submits it,
// which navigates the browser away exactly like window.location.href does for Stripe.
function autoPostRedirect(url: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  form.style.display = "none";
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value ?? "";
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

interface CustomerInfo {
  fullName: string;
  phone: string;
  email: string;
  province: string;
  city: string;
  address: string;
  postal: string;
  notes: string;
}

// â”€â”€â”€ Step Indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepIndicator({ step }: { step: number }) {
  const steps = ["Customer Info", "Payment", "Confirmation"];
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
              style={{ backgroundColor: i < step ? C.gold : i === step ? C.green : "rgba(26,61,43,0.12)", color: i <= step ? (i < step ? C.green : C.ivory) : C.muted, border: i === step ? `2px solid ${C.gold}` : "none", fontFamily: "'DM Sans',sans-serif" }}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className="mt-1 text-[10px] tracking-wider uppercase hidden sm:block"
              style={{ fontFamily: "'DM Sans',sans-serif", color: i <= step ? C.gold : C.muted }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-16 sm:w-24 h-px mx-2" style={{ backgroundColor: i < step ? C.gold : "rgba(26,61,43,0.15)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// â”€â”€â”€ Input Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: C.gold }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: "0.9rem", outline: "none",
  border: `1px solid rgba(26,61,43,0.2)`, backgroundColor: "transparent",
  color: C.green, fontFamily: "'DM Sans',sans-serif",
};

// â”€â”€â”€ Step 1: Customer Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Step1({ info, setInfo, onNext }: { info: CustomerInfo; setInfo: (i: CustomerInfo) => void; onNext: () => void }) {
  const update = (k: keyof CustomerInfo, v: string) => setInfo({ ...info, [k]: v });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!info.fullName || !info.phone || !info.province || !info.city || !info.address) {
      toast.error("Please fill all required fields");
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Full Name" required>
          <input style={inputStyle} value={info.fullName} onChange={e => update("fullName", e.target.value)} placeholder="e.g. Ayesha Khan" required />
        </Field>
        <Field label="Phone Number" required>
          <input style={inputStyle} type="tel" value={info.phone} onChange={e => update("phone", e.target.value)} placeholder="+92 3XX XXXXXXX" required />
        </Field>
      </div>
      <Field label="Email Address">
        <input style={inputStyle} type="email" value={info.email} onChange={e => update("email", e.target.value)} placeholder="your@email.com" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Province" required>
          <select style={{ ...inputStyle, backgroundColor: C.ivory }} value={info.province} onChange={e => update("province", e.target.value)} required>
            <option value="">Select province...</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="City" required>
          {["Punjab", "Sindh", "Khyber Pakhtunkhwa"].includes(info.province) ? (
            <select style={{ ...inputStyle, backgroundColor: C.ivory }} value={info.city} onChange={e => update("city", e.target.value)} required>
              <option value="">Select city...</option>
              {CITIES[info.province].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input style={inputStyle} value={info.city} onChange={e => update("city", e.target.value)} placeholder="e.g. Lahore" required />
          )}
        </Field>
      </div>
      <Field label="Complete Address" required>
        <textarea style={{ ...inputStyle, resize: "none" }} rows={3} value={info.address} onChange={e => update("address", e.target.value)} placeholder="House no., street, area..." required />
      </Field>
      <Field label="Order Notes">
        <input style={inputStyle} value={info.notes} onChange={e => update("notes", e.target.value)} placeholder="Any special instructions..." />
      </Field>
      <button type="submit" className="group w-full py-4 text-sm font-medium uppercase tracking-widest flex items-center justify-center gap-2"
        style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>
        Continue to Payment <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}

// â”€â”€â”€ Step 2: Payment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Availability is driven by the live /payments/config response (gatewayConfig prop)
// rather than hardcoded here â€” a gateway shows as available in the UI (per the
// requirement to remove "Coming Soon"), but if its merchant credentials aren't actually
// configured on the backend yet, gatewayConfig marks it unavailable with a clear message
// instead of letting the customer hit a broken/silent failure at "Proceed to Payment".
const PAY_METHODS_BASE: { id: PayMethod; label: string; desc: string; icon: string }[] = [
  { id: "cod",       label: "Cash on Delivery",    desc: "Pay in cash when your order arrives.", icon: "💵" },
  { id: "card",      label: "Debit / Credit Card", desc: "Pay securely via Stripe — Visa, Mastercard, and all major cards.", icon: "💳" },
  { id: "jazzcash",  label: "JazzCash",             desc: "Send payment, then upload a screenshot for verification.", icon: "📱" },
  { id: "easypaisa", label: "EasyPaisa",            desc: "Send payment, then upload a screenshot for verification.", icon: "🟢" },
];

const MANUAL_PAYMENT_ACCOUNTS: Record<"jazzcash" | "easypaisa", { number: string; name: string }> = {
  jazzcash:  { number: "0327 1546119", name: "Muhammad Shehriyar Shoukat" },
  easypaisa: { number: "0300 7257819", name: "Muhammad Umer Khalid" },
};

function Step2({ method, setMethod, coupon, setCoupon, couponDisc, setCouponDisc, cartTotal, onBack, onPlace, placing, blocked, gatewayConfig }: {
  method: PayMethod; setMethod: (m: PayMethod) => void;
  coupon: string; setCoupon: (c: string) => void;
  couponDisc: number; setCouponDisc: (d: number) => void;
  cartTotal: number; onBack: () => void; onPlace: (proofFile?: File | null, proofReference?: string) => void; placing: boolean; blocked?: boolean;
  gatewayConfig: PaymentGatewayConfig | null;
}) {
  // While config is still loading, assume unavailable rather than briefly showing a
  // method as clickable and then yanking it away once the real config arrives.
  const PAY_METHODS = PAY_METHODS_BASE.map(m => ({
    ...m,
    available: gatewayConfig ? gatewayConfig[m.id === "card" ? "stripe" : m.id] : false,
  }));
  const [couponInput, setCouponInput] = useState("");
  const [proofFile, setProofFile]     = useState<File | null>(null);
  const [proofReference, setProofReference] = useState("");

  const discAmt    = Math.round(cartTotal * (couponDisc / 100));
  const grandTotal = cartTotal - discAmt + SHIPPING;

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

  const handlePlace = () => {
    if ((method === "jazzcash" || method === "easypaisa") && !proofFile) {
      toast.error("Please upload a screenshot of your payment.");
      return;
    }
    onPlace(proofFile, proofReference);
  };

  return (
    <div className="space-y-6">
      {/* Payment method selector */}
      <div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>Payment Method</p>
        <div className="space-y-3">
          {PAY_METHODS.map(m => (
            <label key={m.id}
              className="flex items-start gap-3 p-4 transition-all"
              style={{
                border: `1.5px solid ${method === m.id ? C.gold : "rgba(26,61,43,0.18)"}`,
                backgroundColor: method === m.id ? "rgba(201,168,76,0.06)" : "transparent",
                cursor: m.available ? "pointer" : "not-allowed",
                opacity: m.available ? 1 : 0.5,
              }}>
              <input type="radio" name="payment" value={m.id} checked={method === m.id} disabled={!m.available}
                onChange={() => m.available && setMethod(m.id)} className="sr-only" />
              <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5"
                style={{ borderColor: method === m.id ? C.gold : "rgba(26,61,43,0.3)" }}>
                {method === m.id && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: C.gold }} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.icon}</span>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, color: C.green }}>{m.label}</span>
                  {!m.available && (
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, border: "1px solid rgba(26,61,43,0.25)", padding: "2px 6px" }}>
                      Unavailable
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, marginTop: 2 }}>
                  {!m.available ? "Not configured yet â€” please choose another method." : m.desc}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Stripe redirect notice â€” real card entry happens on Stripe's hosted page, not here */}
      {method === "card" && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex items-start gap-3 p-4"
          style={{ backgroundColor: "rgba(201,168,76,0.05)", border: `1px solid rgba(201,168,76,0.2)` }}>
          <Lock size={16} color={C.gold} className="flex-shrink-0 mt-0.5" />
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted, lineHeight: 1.6 }}>
            You'll be redirected to Stripe's secure checkout page to enter your card details and complete payment.
          </p>
        </motion.div>
      )}

      {/* Manual JazzCash/Easypaisa payment â€” send money, upload proof */}
      {(method === "jazzcash" || method === "easypaisa") && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-4 space-y-4"
          style={{ backgroundColor: "rgba(201,168,76,0.05)", border: `1px solid rgba(201,168,76,0.2)` }}>
          <div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, marginBottom: 6 }}>
              Send <strong style={{ color: C.green }}>Rs. {(cartTotal - discAmt + SHIPPING).toLocaleString()}</strong> to:
            </p>
            <div className="p-3" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.25)` }}>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.15rem", fontWeight: 700, color: C.green }}>
                {MANUAL_PAYMENT_ACCOUNTS[method].number}
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted, marginTop: 2 }}>
                {MANUAL_PAYMENT_ACCOUNTS[method].name} â€” {method === "jazzcash" ? "JazzCash" : "Easypaisa"}
              </p>
            </div>
          </div>

          <div>
            <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, display: "block", marginBottom: 4 }}>
              Transaction ID / Reference (optional but helps us verify faster)
            </label>
            <input value={proofReference} onChange={e => setProofReference(e.target.value)} placeholder="e.g. TXN123456789"
              className="w-full px-3 py-2.5 text-sm outline-none" style={{ border: `1px solid rgba(26,61,43,0.2)`, color: C.green, fontFamily: "'DM Sans',sans-serif", backgroundColor: "transparent" }} />
          </div>

          <div>
            <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, display: "block", marginBottom: 4 }}>
              Upload payment screenshot <span style={{ color: "#d4183d" }}>*</span>
            </label>
            <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] || null)}
              className="w-full text-sm" style={{ fontFamily: "'DM Sans',sans-serif", color: C.green }} />
          </div>

          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted, lineHeight: 1.6 }}>
            Your order will be confirmed once we verify the payment â€” usually within a few hours.
          </p>
        </motion.div>
      )}

      {/* Coupon */}
      {!coupon ? (
        <div className="flex">
          <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code (ARWA10, WELCOME, BOTANIQ)"
            onKeyDown={e => e.key === "Enter" && applyCoupon()}
            className="flex-1 px-3 py-2.5 text-sm outline-none"
            style={{ border: `1px solid rgba(26,61,43,0.2)`, borderRight: "none", color: C.green, fontFamily: "'DM Sans',sans-serif", backgroundColor: "transparent" }} />
          <button onClick={applyCoupon} className="px-4 py-2.5 text-xs uppercase tracking-wider"
            style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Apply</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: "rgba(45,138,78,0.08)", border: `1px solid rgba(45,138,78,0.3)` }}>
          <Tag size={13} color="#2d8a4e" />
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "#2d8a4e", flex: 1 }}>{coupon} applied â€” {couponDisc}% off</span>
          <button onClick={() => { setCoupon(""); setCouponDisc(0); }} className="text-xs" style={{ color: "#d4183d" }}>Remove</button>
        </div>
      )}

      {/* Order total */}
      <div className="p-4 space-y-2" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
        <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.muted }}>Subtotal</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}>Rs. {cartTotal.toLocaleString()}</span></div>
        {couponDisc > 0 && <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#2d8a4e" }}>Discount ({couponDisc}%)</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#2d8a4e" }}>-Rs. {discAmt.toLocaleString()}</span></div>}
        <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.muted }}>Shipping</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}>Rs. {SHIPPING}</span></div>
        <div className="flex justify-between pt-2" style={{ borderTop: `1px solid rgba(201,168,76,0.2)` }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: C.green }}>Total</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: C.green }}>Rs. {grandTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="px-5 py-3.5 text-sm border hover:bg-black/5 transition-colors"
          style={{ borderColor: "rgba(26,61,43,0.25)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
          â† Back
        </button>
        <button onClick={handlePlace} disabled={placing || blocked} className="group flex-1 py-3.5 text-sm font-medium uppercase tracking-widest flex items-center justify-center gap-2"
          style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif", opacity: (placing || blocked) ? 0.5 : 1 }}>
          {placing
            ? (method === "card" ? "Redirecting to Stripe..." : "Placing Order...")
            : blocked ? "Cart Needs Review" : <>{method === "card" ? "Proceed to Payment" : "Place Order"} <ChevronRight size={15} className="transition-transform group-hover:translate-x-1" /></>}
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Step 3: Success (Cash on Delivery only â€” Stripe orders land on /order-success instead) â”€â”€
function Success({ info, orderId, paymentPending }: { info: CustomerInfo; orderId: string; paymentPending?: boolean }) {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
      {/* Animated check */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: C.gold }}>
        <Check size={36} color={C.green} strokeWidth={3} />
      </motion.div>

      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "2rem", fontWeight: 700, color: C.green, marginBottom: 8 }}>
        {paymentPending ? "Order Received!" : "Order Placed!"}
      </h2>
      <p style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>
        Thank you, <strong style={{ color: C.green }}>{info.fullName}</strong>!<br />
        {paymentPending
          ? "We're verifying your payment screenshot â€” you'll get a confirmation once it's approved, usually within a few hours."
          : "Your order has been placed successfully and will be processed shortly."}
      </p>

      <div className="p-5 mb-8 mx-auto max-w-sm" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.25)` }}>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted }}>Order ID</p>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", fontWeight: 700, color: C.gold, marginTop: 4 }}>{orderId}</p>
        <div style={{ height: 1, backgroundColor: "rgba(201,168,76,0.2)", margin: "12px 0" }} />
        <div className="text-left space-y-1.5">
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}><span style={{ color: C.muted }}>Delivering to:</span> {info.city}, {info.province}</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}><span style={{ color: C.muted }}>Phone:</span> {info.phone}</p>
        </div>
      </div>

      {/* Delivery info cards */}
      <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
        {[
          { Icon: Truck,    t: "2â€“4 Days",   s: "Estimated delivery" },
          { Icon: Shield,   t: "Secure",     s: "Safe & encrypted" },
          { Icon: RotateCcw, t: "2-Day",    s: "Return policy" },
        ].map(({ Icon, t, s }) => (
          <div key={t} className="text-center p-3" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.18)` }}>
            <Icon size={16} color={C.gold} style={{ margin: "0 auto 4px" }} />
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 600, color: C.green }}>{t}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: C.muted }}>{s}</p>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.muted, marginBottom: 24 }}>
        Questions? Contact us on WhatsApp: <a href="https://wa.me/923714537622" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>+92 371 4537622</a>
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button onClick={() => navigate("/")} className="px-6 py-3 text-sm uppercase tracking-widest border hover:bg-black/5 transition-colors"
          style={{ borderColor: "rgba(26,61,43,0.25)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
          Back to Home
        </button>
        <button onClick={() => navigate("/shop")} className="group px-6 py-3 text-sm uppercase tracking-widest flex items-center gap-2"
          style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>
          Continue Shopping <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Checkout Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Checkout() {
  const navigate  = useNavigate();
  const { cart, cartTotal, cartCount, clearCart } = useStore();

  const [step, setStep]       = useState(0);
  const [orderId, setOrderId] = useState("");
  const [placing, setPlacing] = useState(false);
  const [coupon,     setCoupon]     = useState("");
  const [couponDisc, setCouponDisc] = useState(0);
  const [payMethod, setPayMethod]   = useState<PayMethod>("cod");
  const [info, setInfo]             = useState<CustomerInfo>({
    fullName: "", phone: "", email: "", province: "", city: "", address: "", postal: "", notes: "",
  });

  const [stockIssues, setStockIssues] = useState<Record<string, number>>({}); // productId -> available qty
  const [paymentPending, setPaymentPending] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig | null>(null);

  useEffect(() => {
    fetchPaymentConfig()
      .then(setGatewayConfig)
      .catch(() => setGatewayConfig({ stripe: true, jazzcash: false, easypaisa: false, cod: true })); // fail safe: don't block COD/card if the config check itself fails
  }, []);

  useEffect(() => {
    if (cart.length === 0) return;
    let cancelled = false;
    setCheckingStock(true);
    (async () => {
      const issues: Record<string, number> = {};
      for (const item of cart) {
        const live = await fetchProductStockBySlug(item.product.slug);
        if (!live || live.stock < item.qty) issues[item.product.id] = live?.stock ?? 0;
      }
      if (!cancelled) { setStockIssues(issues); setCheckingStock(false); }
    })();
    return () => { cancelled = true; };
  }, [cart]);

  if (cart.length === 0 && step < 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 text-center px-4" style={{ backgroundColor: C.ivory }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", color: C.green, marginBottom: 12 }}>Your cart is empty</h2>
        <button onClick={() => navigate("/shop")} className="px-6 py-3 text-sm uppercase tracking-widest"
          style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Shop Now</button>
      </div>
    );
  }

  const discAmt    = Math.round(cartTotal * (couponDisc / 100));
  const grandTotal = cartTotal - discAmt + SHIPPING;

  const handlePlaceOrder = async (proofFile?: File | null, proofReference?: string) => {
    setPlacing(true);
    try {
      const result = await placeOrder({
        customer_name: info.fullName,
        customer_email: info.email || "guest@arwabotanicss.com",
        customer_phone: info.phone,
        shipping_address: info.address,
        shipping_city: info.city,
        shipping_province: info.province,
        shipping_postal: info.postal,
        payment_method: payMethod,
        shipping_fee: SHIPPING,
        discount: discAmt,
        notes: info.notes,
        items: cart.map(item => ({ product_id: item.product.id, quantity: item.qty })),
      } as any);

      if (payMethod === "card") {
        // Order now exists as "pending" in the backend. Send the customer to Stripe â€”
        // do NOT clear the cart or advance the step here. The cart only clears once
        // /order-success confirms the payment actually went through; if the customer
        // cancels, /order-cancel needs the cart still intact.
        const url = await createStripeCheckoutSession(result.id);
        window.location.href = url;
        return;
      }

      if (payMethod === "jazzcash" || payMethod === "easypaisa") {
        // Upload the screenshot + reference right away, then show the customer a
        // "pending verification" confirmation instead of assuming payment succeeded â€”
        // an admin still has to approve it before the order actually finalizes.
        if (proofFile) {
          await submitPaymentProof(result.id, proofFile, proofReference || "");
        }
        setOrderId(result.order_number);
        setPaymentPending(true);
        clearCart();
        setStep(2);
        toast.success("Order placed! We'll confirm your payment shortly.");
        return;
      }

      // Cash on Delivery â€” unchanged from before.
      setOrderId(result.order_number);
      clearCart();
      setStep(2);
      toast.success("Order placed successfully!");
    } catch (error: any) {
      const msg = error.message || "Failed to place order. Please try again.";
      const isStockIssue = /stock|not found|unavailable/i.test(msg);
      if (isStockIssue) {
        toast.error("Some items in your cart are no longer available", {
          description: msg,
          duration: 6000,
          action: { label: "Review Cart", onClick: () => navigate("/cart") },
        });
      } else {
        toast.error(msg);
      }
      setPlacing(false);
    }
    // Note: no `finally` resetting `placing` on the Stripe path â€” the page is
    // navigating away, so there's nothing left to re-enable.
  };

  return (
    <div style={{ backgroundColor: C.ivory, minHeight: "100vh" }}>
      {/* Banner */}
      <div className="pt-20" style={{ backgroundColor: C.green }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 700, color: C.ivory }}>Checkout</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <StepIndicator step={step} />

        <AnimatePresence mode="wait">
          {step === 2 ? (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Success info={info} orderId={orderId} paymentPending={paymentPending} />
            </motion.div>
          ) : (
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-5 gap-8">
              {/* Form area */}
              <div className="lg:col-span-3">
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", fontWeight: 700, color: C.green, marginBottom: 24 }}>
                  {step === 0 ? "Your Information" : "Payment Details"}
                </h2>

                {step === 0 && (
                  <Step1 info={info} setInfo={setInfo} onNext={() => setStep(1)} />
                )}
               {step === 1 && (
                  <Step2
                    method={payMethod} setMethod={setPayMethod}
                    coupon={coupon} setCoupon={setCoupon}
                    couponDisc={couponDisc} setCouponDisc={setCouponDisc}
                    cartTotal={cartTotal}
                    onBack={() => setStep(0)}
                    onPlace={handlePlaceOrder}
                    gatewayConfig={gatewayConfig}
                    placing={placing}
                    blocked={checkingStock || Object.keys(stockIssues).length > 0}
                  />
                )}
              </div>

              {/* Order summary */}
              <div className="lg:col-span-2">
                <div className="sticky top-24 p-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: C.green, marginBottom: 16 }}>Order Summary</h3>
                  <div className="space-y-3 mb-5">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center gap-3">
                        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-center overflow-hidden" style={{ backgroundColor: "#eee8da" }}>
                          {item.product.imageUrl ? (
                            <ImageWithFallback src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.45rem", color: C.muted }}>Arwa Botaniqs</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.green, fontWeight: 600 }}>{item.product.name} {item.product.subtitle}</p>
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>Qty: {item.qty} Â· {item.product.weight}</p>
                          {item.product.id in stockIssues && (
                            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "#d4183d", marginTop: 2 }}>
                              {stockIssues[item.product.id] === 0 ? "Out of stock" : `Only ${stockIssues[item.product.id]} left`} â€” please update your cart
                            </p>
                          )}
                        </div>
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green, flexShrink: 0 }}>Rs. {(item.product.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 pt-4" style={{ borderTop: `1px solid rgba(201,168,76,0.18)` }}>
                    <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted }}>Subtotal</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.green }}>Rs. {cartTotal.toLocaleString()}</span></div>
                    {couponDisc > 0 && <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "#2d8a4e" }}>Discount</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "#2d8a4e" }}>-Rs. {discAmt.toLocaleString()}</span></div>}
                    <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted }}>Shipping</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.green }}>Rs. {SHIPPING}</span></div>
                    <div className="flex justify-between pt-2" style={{ borderTop: `1px solid rgba(201,168,76,0.18)` }}>
                      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 700, color: C.green }}>Total</span>
                      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: C.green }}>Rs. {grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Trust */}
                  <div className="mt-5 pt-4 space-y-2" style={{ borderTop: `1px solid rgba(201,168,76,0.18)` }}>
                    {[{ Icon: Shield, t: "Secure & encrypted payment" }, { Icon: Truck, t: "Delivery in 2â€“4 business days" }, { Icon: RotateCcw, t: "2-day hassle-free returns" }].map(({ Icon, t }) => (
                      <div key={t} className="flex items-center gap-2"><Icon size={12} color={C.gold} /><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>{t}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}





