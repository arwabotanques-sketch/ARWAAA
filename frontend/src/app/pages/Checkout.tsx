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
import { fetchShippingSettings } from "../api/shippingSettings";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { C, FadeIn, StarRating } from "../shared";
import { ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Check, Truck, Shield, RotateCcw, Tag, Lock, Leaf, Sparkles, Banknote, CreditCard, Smartphone, UploadCloud, Copy } from "lucide-react";

const PROVINCES = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad (ICT)", "Azad Kashmir (AJK)", "Gilgit-Baltistan"];
const CITIES: Record<string, string[]> = {
  "Punjab": ["Lahore","Faisalabad","Rawalpindi","Multan","Gujranwala","Sialkot","Bahawalpur","Sargodha","Sheikhupura","Jhang","Rahim Yar Khan","Gujrat","Kasur","Okara","Sahiwal","Wah Cantonment","Dera Ghazi Khan","Mianwali","Sadiqabad","Burewala","Chiniot","Kamoke","Hafizabad","Kot Addu","Jaranwala","Muridke","Khanewal","Vehari","Layyah","Toba Tek Singh"],
  "Sindh": ["Karachi","Hyderabad","Sukkur","Larkana","Nawabshah","Mirpur Khas","Jacobabad","Shikarpur","Khairpur","Dadu","Tando Adam","Tando Allahyar","Badin","Thatta","Umerkot","Ghotki","Kashmore","Sanghar","Naushahro Feroze","Matiari"],
  "Khyber Pakhtunkhwa": ["Peshawar","Mardan","Mingora","Kohat","Abbottabad","Dera Ismail Khan","Bannu","Swabi","Nowshera","Charsadda","Mansehra","Haripur","Karak","Tank","Chitral","Buner","Batkhela","Timergara","Lakki Marwat","Hangu"]
};



type PayMethod = "cod" | "jazzcash" | "easypaisa" | "card";

// JazzCash and Easypaisa are hosted "Page Post" checkouts — unlike Stripe, there's no
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

// ─── Decorative botanical accent ───────────────────────────────────────────
// A single quiet signature motif — a line-art leaf — reused at small scale in
// the banner and the success moment, tying the flow back to the brand without
// competing with the checkout task itself.
function LeafMark({ size = 120, opacity = 0.08, color = C.ivory }: { size?: number; opacity?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 60 96" fill="none" style={{ opacity }}>
      <path d="M30 2C30 2 4 22 4 52C4 74 16 90 30 94C44 90 56 74 56 52C56 22 30 2 30 2Z" stroke={color} strokeWidth="1.2" />
      <path d="M30 8V90" stroke={color} strokeWidth="1" />
      <path d="M30 24C24 28 16 34 12 44" stroke={color} strokeWidth="0.8" />
      <path d="M30 44C24 48 16 54 12 64" stroke={color} strokeWidth="0.8" />
      <path d="M30 24C36 28 44 34 48 44" stroke={color} strokeWidth="0.8" />
      <path d="M30 44C36 48 44 54 48 64" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  const steps = ["Your Info", "Payment", "Done"];
  return (
    <div className="flex items-center justify-center gap-0 mb-8 sm:mb-12">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              animate={{ scale: i === step ? 1.08 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold relative"
              style={{
                backgroundColor: i < step ? C.gold : i === step ? C.green : "rgba(26,61,43,0.08)",
                color: i <= step ? (i < step ? C.green : C.ivory) : C.muted,
                boxShadow: i === step ? `0 0 0 4px rgba(201,168,76,0.18)` : "none",
                fontFamily: "'DM Sans',sans-serif",
              }}>
              {i < step ? <Check size={16} /> : i + 1}
            </motion.div>
            <span className="mt-2 text-[10px] tracking-[0.15em] uppercase hidden sm:block"
              style={{ fontFamily: "'DM Sans',sans-serif", color: i <= step ? C.green : C.muted, fontWeight: i === step ? 700 : 500 }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-12 sm:w-28 h-[2px] mx-1.5 sm:mx-3 relative overflow-hidden rounded-full" style={{ backgroundColor: "rgba(26,61,43,0.1)" }}>
              <motion.div
                className="absolute inset-y-0 left-0"
                style={{ backgroundColor: C.gold }}
                initial={false}
                animate={{ width: i < step ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Input Field ────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.76rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: 7, fontWeight: 600 }}>
        {label}{required && <span style={{ color: C.gold }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "13px 15px", fontSize: "0.94rem", outline: "none",
  border: `1.5px solid rgba(26,61,43,0.16)`, backgroundColor: "#fff",
  color: C.green, fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

// A small hook-free helper: apply a gold focus ring via onFocus/onBlur inline handlers,
// since global CSS focus rings aren't part of this component's styling system.
function useFocusRing() {
  return {
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      (e.target as HTMLElement).style.borderColor = C.gold;
      (e.target as HTMLElement).style.boxShadow = `0 0 0 3px rgba(201,168,76,0.14)`;
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      (e.target as HTMLElement).style.borderColor = "rgba(26,61,43,0.16)";
      (e.target as HTMLElement).style.boxShadow = "none";
    },
  };
}

// ─── Step 1: Customer Info ──────────────────────────────────────────────────
function Step1({ info, setInfo, onNext }: { info: CustomerInfo; setInfo: (i: CustomerInfo) => void; onNext: () => void }) {
  const update = (k: keyof CustomerInfo, v: string) => setInfo({ ...info, [k]: v });
  const focusRing = useFocusRing();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!info.fullName || !info.phone || !info.province || !info.city || !info.address) {
      toast.error("Please fill all required fields");
      return;
    }
    onNext();
  };

  return (
    <motion.form onSubmit={handleSubmit} className="space-y-5"
      initial="hidden" animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
      {[
        <div key="name-phone" className="grid sm:grid-cols-2 gap-5">
          <Field label="Full Name" required>
            <input style={inputStyle} {...focusRing} value={info.fullName} onChange={e => update("fullName", e.target.value)} placeholder="e.g. Ayesha Khan" required />
          </Field>
          <Field label="Phone Number" required>
            <input style={inputStyle} {...focusRing} type="tel" value={info.phone} onChange={e => update("phone", e.target.value)} placeholder="+92 3XX XXXXXXX" required />
          </Field>
        </div>,
        <Field key="email" label="Email Address">
          <input style={inputStyle} {...focusRing} type="email" value={info.email} onChange={e => update("email", e.target.value)} placeholder="your@email.com" />
        </Field>,
        <div key="province-city" className="grid sm:grid-cols-2 gap-5">
          <Field label="Province" required>
            <select style={{ ...inputStyle, cursor: "pointer" }} {...focusRing} value={info.province} onChange={e => update("province", e.target.value)} required>
              <option value="">Select province...</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="City" required>
            {["Punjab", "Sindh", "Khyber Pakhtunkhwa"].includes(info.province) ? (
              <select style={{ ...inputStyle, cursor: "pointer" }} {...focusRing} value={info.city} onChange={e => update("city", e.target.value)} required>
                <option value="">Select city...</option>
                {CITIES[info.province].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input style={inputStyle} {...focusRing} value={info.city} onChange={e => update("city", e.target.value)} placeholder="e.g. Lahore" required />
            )}
          </Field>
        </div>,
        <Field key="address" label="Complete Address" required>
          <textarea style={{ ...inputStyle, resize: "none" }} {...focusRing} rows={3} value={info.address} onChange={e => update("address", e.target.value)} placeholder="House no., street, area..." required />
        </Field>,
        <Field key="notes" label="Order Notes">
          <input style={inputStyle} {...focusRing} value={info.notes} onChange={e => update("notes", e.target.value)} placeholder="Any special instructions..." />
        </Field>,
      ].map((el, i) => (
        <motion.div key={i} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
          {el}
        </motion.div>
      ))}
      <motion.button type="submit" whileTap={{ scale: 0.98 }}
        className="group w-full py-4 text-sm font-medium uppercase tracking-widest flex items-center justify-center gap-2"
        style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif", boxShadow: "0 8px 20px -8px rgba(26,61,43,0.45)" }}>
        Continue to Payment <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
      </motion.button>
    </motion.form>
  );
}

// ─── Step 2: Payment ─────────────────────────────────────────────────────────
// Availability is driven by the live /payments/config response (gatewayConfig prop)
// rather than hardcoded here — a gateway shows as available in the UI (per the
// requirement to remove "Coming Soon"), but if its merchant credentials aren't actually
// configured on the backend yet, gatewayConfig marks it unavailable with a clear message
// instead of letting the customer hit a broken/silent failure at "Proceed to Payment".
const PAY_METHODS_BASE: { id: PayMethod; label: string; desc: string }[] = [
  { id: "cod",       label: "Cash on Delivery",    desc: "Pay in cash when your order arrives." },
  { id: "card",      label: "Debit / Credit Card", desc: "Pay securely via Stripe — Visa, Mastercard, and all major cards." },
  { id: "jazzcash",  label: "JazzCash",             desc: "Send payment, then upload a screenshot for verification." },
  { id: "easypaisa", label: "EasyPaisa",            desc: "Send payment, then upload a screenshot for verification." },
];

// Real icon components instead of emoji glyphs — emoji characters are prone to
// mangling across editors/terminals/encodings (as we found out), icons never are.
// Each method gets a brand-tinted circular badge rather than a literal logo.
function PayMethodIcon({ id }: { id: PayMethod }) {
  const map: Record<PayMethod, { Icon: any; bg: string; fg: string }> = {
    cod:       { Icon: Banknote,   bg: "rgba(201,168,76,0.16)", fg: C.gold },
    card:      { Icon: CreditCard, bg: "rgba(26,61,43,0.08)",   fg: C.green },
    jazzcash:  { Icon: Smartphone, bg: "rgba(217,40,40,0.12)",  fg: "#d92828" },
    easypaisa: { Icon: Smartphone, bg: "rgba(0,166,81,0.14)",   fg: "#00a651" },
  };
  const { Icon, bg, fg } = map[id];
  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: bg }}>
      <Icon size={18} color={fg} strokeWidth={2.2} />
    </div>
  );
}

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
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofReference, setProofReference] = useState("");
  const [copied, setCopied] = useState(false);
  const focusRing = useFocusRing();

  useEffect(() => {
    if (!proofFile) { setProofPreview(null); return; }
    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  const copyAccountNumber = (number: string) => {
    navigator.clipboard?.writeText(number.replace(/\s/g, "")).then(() => {
      setCopied(true);
      toast.success("Account number copied");
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => toast.error("Couldn't copy — please copy manually"));
  };

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
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.76rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 12, fontWeight: 600 }}>Payment Method</p>
        <div className="space-y-3">
          {PAY_METHODS.map(m => (
            <motion.label key={m.id}
              whileTap={m.available ? { scale: 0.99 } : undefined}
              className="flex items-start gap-3 p-4 transition-all"
              style={{
                border: `1.5px solid ${method === m.id ? C.gold : "rgba(26,61,43,0.14)"}`,
                backgroundColor: method === m.id ? "rgba(201,168,76,0.07)" : "#fff",
                cursor: m.available ? "pointer" : "not-allowed",
                opacity: m.available ? 1 : 0.5,
                boxShadow: method === m.id ? "0 6px 16px -8px rgba(201,168,76,0.4)" : "none",
              }}>
              <input type="radio" name="payment" value={m.id} checked={method === m.id} disabled={!m.available}
                onChange={() => m.available && setMethod(m.id)} className="sr-only" />
              <PayMethodIcon id={m.id} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.92rem", fontWeight: 700, color: C.green }}>{m.label}</span>
                  {!m.available && (
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, border: "1px solid rgba(26,61,43,0.2)", padding: "2px 6px" }}>
                      Unavailable
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
                  {!m.available ? "Not configured yet — please choose another method." : m.desc}
                </p>
              </div>
              <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5"
                style={{ borderColor: method === m.id ? C.gold : "rgba(26,61,43,0.25)" }}>
                {method === m.id && <motion.div layoutId="paySelectDot" className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: C.gold }} />}
              </div>
            </motion.label>
          ))}
        </div>
      </div>

      {/* Stripe redirect notice — real card entry happens on Stripe's hosted page, not here */}
      <AnimatePresence>
        {method === "card" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-3 p-4 overflow-hidden"
            style={{ backgroundColor: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.22)` }}>
            <Lock size={16} color={C.gold} className="flex-shrink-0 mt-0.5" />
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted, lineHeight: 1.6 }}>
              You'll be redirected to Stripe's secure checkout page to enter your card details and complete payment.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual JazzCash/Easypaisa payment — send money, upload proof */}
      <AnimatePresence>
        {(method === "jazzcash" || method === "easypaisa") && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-4 space-y-4 overflow-hidden"
            style={{ backgroundColor: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.22)` }}>
            <div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, marginBottom: 8 }}>
                Send <motion.strong key={grandTotal} initial={{ scale: 1.15, color: C.gold }} animate={{ scale: 1, color: C.green }} transition={{ duration: 0.35 }} style={{ display: "inline-block" }}>Rs. {(cartTotal - discAmt + SHIPPING).toLocaleString()}</motion.strong> to:
              </p>
              <div className="flex items-center justify-between gap-3 p-3.5" style={{ backgroundColor: "#fff", border: `1px solid rgba(201,168,76,0.28)` }}>
                <div>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, color: C.green, letterSpacing: "0.02em" }}>
                    {MANUAL_PAYMENT_ACCOUNTS[method].number}
                  </p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted, marginTop: 3 }}>
                    {MANUAL_PAYMENT_ACCOUNTS[method].name} — {method === "jazzcash" ? "JazzCash" : "Easypaisa"}
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => copyAccountNumber(MANUAL_PAYMENT_ACCOUNTS[method].number)}
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: copied ? "rgba(45,138,78,0.14)" : "rgba(26,61,43,0.06)" }}>
                  <AnimatePresence mode="wait">
                    {copied
                      ? <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}><Check size={15} color="#2d8a4e" /></motion.span>
                      : <motion.span key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}><Copy size={15} color={C.green} /></motion.span>}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>

            <div>
              <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, display: "block", marginBottom: 5 }}>
                Transaction ID / Reference <span style={{ opacity: 0.7 }}>(optional but helps us verify faster)</span>
              </label>
              <input value={proofReference} onChange={e => setProofReference(e.target.value)} placeholder="e.g. TXN123456789"
                {...focusRing}
                className="w-full px-3.5 py-3 text-sm outline-none" style={{ border: `1.5px solid rgba(26,61,43,0.16)`, color: C.green, fontFamily: "'DM Sans',sans-serif", backgroundColor: "#fff" }} />
            </div>

            <div>
              <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, display: "block", marginBottom: 5 }}>
                Upload payment screenshot <span style={{ color: "#d4183d" }}>*</span>
              </label>
              <AnimatePresence mode="wait">
                {proofPreview ? (
                  <motion.div key="preview" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                    className="flex items-center gap-3 p-3" style={{ border: `1.5px solid rgba(45,138,78,0.35)`, backgroundColor: "rgba(45,138,78,0.05)" }}>
                    <img src={proofPreview} alt="Payment screenshot" className="w-14 h-14 object-cover flex-shrink-0" style={{ border: `1px solid rgba(26,61,43,0.12)` }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Check size={13} color="#2d8a4e" />
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "#2d8a4e", fontWeight: 600 }}>Screenshot ready</span>
                      </div>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.74rem", color: C.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proofFile?.name}</p>
                    </div>
                    <label className="flex-shrink-0 text-xs cursor-pointer" style={{ color: C.gold, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>
                      Change
                      <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  </motion.div>
                ) : (
                  <motion.label key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    whileHover={{ borderColor: C.gold }}
                    className="flex flex-col items-center justify-center gap-2 w-full py-7 text-sm cursor-pointer transition-colors"
                    style={{ border: `1.5px dashed rgba(26,61,43,0.28)`, color: C.muted, fontFamily: "'DM Sans',sans-serif", backgroundColor: "#fff" }}>
                    <UploadCloud size={22} color={C.gold} />
                    <span>Tap to choose a screenshot</span>
                    <span style={{ fontSize: "0.72rem", opacity: 0.75 }}>PNG or JPG</span>
                    <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] || null)} className="hidden" />
                  </motion.label>
                )}
              </AnimatePresence>
            </div>

            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted, lineHeight: 1.6 }}>
              Your order will be confirmed once we verify the payment — usually within a few hours.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coupon */}
      {!coupon ? (
        <div className="flex">
          <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code"
            onKeyDown={e => e.key === "Enter" && applyCoupon()}
            {...focusRing}
            className="flex-1 px-3.5 py-3 text-sm outline-none"
            style={{ border: `1.5px solid rgba(26,61,43,0.16)`, borderRight: "none", color: C.green, fontFamily: "'DM Sans',sans-serif", backgroundColor: "#fff" }} />
          <button onClick={applyCoupon} className="px-5 py-3 text-xs uppercase tracking-wider font-medium"
            style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Apply</button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-3.5 py-2.5" style={{ backgroundColor: "rgba(45,138,78,0.08)", border: `1px solid rgba(45,138,78,0.3)` }}>
          <Tag size={13} color="#2d8a4e" />
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "#2d8a4e", flex: 1 }}>{coupon} applied — {couponDisc}% off</span>
          <button onClick={() => { setCoupon(""); setCouponDisc(0); }} className="text-xs" style={{ color: "#d4183d" }}>Remove</button>
        </motion.div>
      )}

      {/* Order total */}
      <div className="p-4 space-y-2" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.22)` }}>
        <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.muted }}>Subtotal</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}>Rs. {cartTotal.toLocaleString()}</span></div>
        {couponDisc > 0 && <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#2d8a4e" }}>Discount ({couponDisc}%)</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#2d8a4e" }}>-Rs. {discAmt.toLocaleString()}</span></div>}
        <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.muted }}>Shipping</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}>Rs. {SHIPPING}</span></div>
        <div className="flex justify-between pt-2" style={{ borderTop: `1px solid rgba(201,168,76,0.22)` }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: C.green }}>Total</span>
          <motion.span key={grandTotal} initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}
            style={{ display: "inline-block", fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, color: C.green }}>Rs. {grandTotal.toLocaleString()}</motion.span>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="px-5 py-3.5 text-sm border hover:bg-black/5 transition-colors flex items-center gap-1.5"
          style={{ borderColor: "rgba(26,61,43,0.22)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
          <ChevronLeft size={15} /> Back
        </button>
        <motion.button onClick={handlePlace} disabled={placing || blocked} whileTap={{ scale: 0.98 }} className="group flex-1 py-3.5 text-sm font-medium uppercase tracking-widest flex items-center justify-center gap-2"
          style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif", opacity: (placing || blocked) ? 0.5 : 1, boxShadow: (placing || blocked) ? "none" : "0 8px 20px -8px rgba(201,168,76,0.6)" }}>
          {placing
            ? (method === "card" ? "Redirecting to Stripe..." : "Placing Order...")
            : blocked ? "Cart Needs Review" : <>{method === "card" ? "Proceed to Payment" : "Place Order"} <ChevronRight size={15} className="transition-transform group-hover:translate-x-1" /></>}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Step 3: Success (Cash on Delivery only — Stripe orders land on /order-success instead) ──
function Success({ info, orderId, paymentPending }: { info: CustomerInfo; orderId: string; paymentPending?: boolean }) {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 sm:py-8 relative">
      {/* Quiet decorative leaf, echoing the banner */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none" style={{ opacity: 0.5 }}>
        <LeafMark size={54} opacity={0.1} color={C.gold} />
      </div>

      {/* Animated check with a soft sparkle burst */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ backgroundColor: C.gold, boxShadow: "0 12px 30px -10px rgba(201,168,76,0.55)" }}>
          <Check size={36} color={C.green} strokeWidth={3} />
        </motion.div>
        {[0, 1, 2].map(i => (
          <motion.span key={i}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
            transition={{ delay: 0.4 + i * 0.15, duration: 1.1, repeat: Infinity, repeatDelay: 2.2 }}
            className="absolute" style={{ top: i === 0 ? -6 : i === 1 ? 4 : 12, left: i === 0 ? -8 : i === 1 ? 76 : 70 }}>
            <Sparkles size={i === 1 ? 14 : 10} color={C.gold} />
          </motion.span>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.7rem,4vw,2.1rem)", fontWeight: 700, color: C.green, marginBottom: 8 }}>
        {paymentPending ? "Order Received!" : "Order Placed!"}
      </h2>
      <p style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted, marginBottom: 24, lineHeight: 1.7, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
        Thank you, <strong style={{ color: C.green }}>{info.fullName}</strong>.{" "}
        {paymentPending
          ? "We're verifying your payment screenshot — you'll get a confirmation once it's approved, usually within a few hours."
          : "Your order has been placed successfully and will be processed shortly."}
      </p>

      <div className="p-5 mb-8 mx-auto max-w-sm" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.28)`, boxShadow: "0 10px 30px -14px rgba(26,61,43,0.25)" }}>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted }}>Order ID</p>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", fontWeight: 700, color: C.gold, marginTop: 4 }}>{orderId}</p>
        <div style={{ height: 1, backgroundColor: "rgba(201,168,76,0.22)", margin: "14px 0" }} />
        <div className="text-left space-y-1.5">
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}><span style={{ color: C.muted }}>Delivering to:</span> {info.city}, {info.province}</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}><span style={{ color: C.muted }}>Phone:</span> {info.phone}</p>
        </div>
      </div>

      {/* Delivery info cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8 max-w-sm mx-auto">
        {[
          { Icon: Truck,     t: "2–4 Days", s: "Estimated delivery" },
          { Icon: Shield,    t: "Secure",   s: "Safe & encrypted" },
          
        ].map(({ Icon, t, s }, i) => (
          <motion.div key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
            className="text-center p-3" style={{ backgroundColor: "#fff", border: `1px solid rgba(201,168,76,0.2)` }}>
            <Icon size={16} color={C.gold} style={{ margin: "0 auto 5px" }} />
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 700, color: C.green }}>{t}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: C.muted }}>{s}</p>
          </motion.div>
        ))}
      </div>

      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.muted, marginBottom: 24 }}>
        Questions? Contact us on WhatsApp: <a href="https://wa.me/923714537622" target="_blank" rel="noopener noreferrer" style={{ color: C.gold, fontWeight: 600 }}>+92 371 4537622</a>
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button onClick={() => navigate("/")} className="w-full sm:w-auto px-6 py-3 text-sm uppercase tracking-widest border hover:bg-black/5 transition-colors"
          style={{ borderColor: "rgba(26,61,43,0.22)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
          Back to Home
        </button>
        <button onClick={() => navigate("/shop")} className="group w-full sm:w-auto px-6 py-3 text-sm uppercase tracking-widest flex items-center justify-center gap-2"
          style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif", boxShadow: "0 8px 20px -8px rgba(26,61,43,0.4)" }}>
          Continue Shopping <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Order Summary (shared by desktop sidebar + mobile drawer) ─────────────
function OrderSummaryContent({ cart, stockIssues, cartTotal, couponDisc, discAmt, grandTotal }: {
  cart: any[]; stockIssues: Record<string, number>; cartTotal: number; couponDisc: number; discAmt: number; grandTotal: number;
}) {
  return (
    <>
      <div className="space-y-3 mb-5">
        {cart.map(item => (
          <div key={item.product.id} className="flex items-center gap-3">
            <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center text-center overflow-hidden" style={{ backgroundColor: "#eee8da" }}>
              {item.product.imageUrl ? (
                <ImageWithFallback src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.45rem", color: C.muted }}>Arwa Botaniqs</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.green, fontWeight: 600 }}>{item.product.name} {item.product.subtitle}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>Qty: {item.qty} · {item.product.weight}</p>
              {item.product.id in stockIssues && (
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "#d4183d", marginTop: 2 }}>
                  {stockIssues[item.product.id] === 0 ? "Out of stock" : `Only ${stockIssues[item.product.id]} left`} — please update your cart
                </p>
              )}
            </div>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green, flexShrink: 0, fontWeight: 600 }}>Rs. {(item.product.price * item.qty).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2 pt-4" style={{ borderTop: `1px solid rgba(201,168,76,0.2)` }}>
        <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted }}>Subtotal</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.green }}>Rs. {cartTotal.toLocaleString()}</span></div>
        {couponDisc > 0 && <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "#2d8a4e" }}>Discount</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "#2d8a4e" }}>-Rs. {discAmt.toLocaleString()}</span></div>}
        <div className="flex justify-between"><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted }}>Shipping</span><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.green }}>Rs. {SHIPPING}</span></div>
        <div className="flex justify-between pt-2" style={{ borderTop: `1px solid rgba(201,168,76,0.2)` }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 700, color: C.green }}>Total</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.15rem", fontWeight: 700, color: C.green }}>Rs. {grandTotal.toLocaleString()}</span>
        </div>
      </div>
      <div className="mt-5 pt-4 space-y-2" style={{ borderTop: `1px solid rgba(201,168,76,0.2)` }}>
        {[{ Icon: Shield, t: "Secure & encrypted payment" }, { Icon: Truck, t: "Delivery in 2–4 business days" }].map(({ Icon, t }) => (
          <div key={t} className="flex items-center gap-2"><Icon size={12} color={C.gold} /><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>{t}</span></div>
        ))}
      </div>
    </>
  );
}

// ─── Checkout Page ───────────────────────────────────────────────────────────
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
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [shippingRate, setShippingRate] = useState(300);
  useEffect(() => { fetchShippingSettings().then(s => setShippingRate(s.rate)).catch(() => {}); }, []);
  const SHIPPING = shippingRate;

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
        <LeafMark size={64} opacity={0.15} color={C.green} />
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", color: C.green, marginTop: 8, marginBottom: 12 }}>Your cart is empty</h2>
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
        // Order now exists as "pending" in the backend. Send the customer to Stripe —
        // do NOT clear the cart or advance the step here. The cart only clears once
        // /order-success confirms the payment actually went through; if the customer
        // cancels, /order-cancel needs the cart still intact.
        const url = await createStripeCheckoutSession(result.id);
        window.location.href = url;
        return;
      }

      if (payMethod === "jazzcash" || payMethod === "easypaisa") {
        // Upload the screenshot + reference right away, then show the customer a
        // "pending verification" confirmation instead of assuming payment succeeded —
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

      // Cash on Delivery — unchanged from before.
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
    // Note: no `finally` resetting `placing` on the Stripe path — the page is
    // navigating away, so there's nothing left to re-enable.
  };

  const showMobileBar = step < 2;

  return (
    <div style={{ backgroundColor: C.ivory, minHeight: "100vh" }}>
      {/* Banner */}
      <div className="pt-20 relative overflow-hidden" style={{ backgroundColor: C.green }}>
        <div className="absolute -right-4 -top-6 pointer-events-none hidden sm:block">
          <LeafMark size={140} opacity={0.06} color={C.ivory} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 relative">
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.25em", textTransform: "uppercase", color: C.gold, marginBottom: 6 }}>
            Almost there
          </p>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 700, color: C.ivory }}>Checkout</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10" style={{ paddingBottom: showMobileBar ? 96 : undefined }}>
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
                <div className="p-5 sm:p-7" style={{ backgroundColor: "#fff", border: `1px solid rgba(26,61,43,0.08)`, boxShadow: "0 20px 50px -30px rgba(26,61,43,0.25)" }}>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", fontWeight: 700, color: C.green, marginBottom: 22 }}>
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
              </div>

              {/* Order summary — desktop sidebar */}
              <div className="hidden lg:block lg:col-span-2">
                <div className="sticky top-24 p-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.22)`, boxShadow: "0 20px 50px -30px rgba(26,61,43,0.2)" }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: C.green, marginBottom: 16 }}>Order Summary</h3>
                  <OrderSummaryContent cart={cart} stockIssues={stockIssues} cartTotal={cartTotal} couponDisc={couponDisc} discAmt={discAmt} grandTotal={grandTotal} />
                </div>
              </div>

              {/* Order summary — mobile collapsible panel, inline (above the fixed bar) */}
              <div className="lg:hidden">
                <button onClick={() => setMobileSummaryOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3.5"
                  style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.22)` }}>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.86rem", fontWeight: 600, color: C.green }}>
                    Order Summary · {cartCount} item{cartCount !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 700, color: C.green }}>Rs. {grandTotal.toLocaleString()}</span>
                    {mobileSummaryOpen ? <ChevronUp size={16} color={C.green} /> : <ChevronDown size={16} color={C.green} />}
                  </span>
                </button>
                <AnimatePresence>
                  {mobileSummaryOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden">
                      <div className="p-4" style={{ backgroundColor: "#fff", border: `1px solid rgba(201,168,76,0.22)`, borderTop: "none" }}>
                        <OrderSummaryContent cart={cart} stockIssues={stockIssues} cartTotal={cartTotal} couponDisc={couponDisc} discAmt={discAmt} grandTotal={grandTotal} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile sticky total bar — quiet, informational, never blocks navigation */}
      <AnimatePresence>
        {showMobileBar && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: C.green, boxShadow: "0 -10px 30px -12px rgba(0,0,0,0.3)" }}>
            <div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,240,232,0.6)" }}>Total</p>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.15rem", fontWeight: 700, color: C.ivory }}>Rs. {grandTotal.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1.5" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "rgba(245,240,232,0.55)" }}>
              <Leaf size={12} color={C.gold} /> {cartCount} item{cartCount !== 1 ? "s" : ""}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
