import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { C, BrandLogo, LeafSVG } from "../shared";
import { Send, ChevronLeft, Plus, History, Trash2, Bot, User } from "lucide-react";
 
// ─── Bot knowledge ────────────────────────────────────────────────────────────
const BOT_RESPONSES: { keywords: string[]; text: string }[] = [
  { keywords: ["acne", "pimple", "breakout", "zit", "blemish"],
    text: "Arwa Botaniqs Beauty Soap is specially designed for acne-prone skin! 🌿 It contains **Neem** and **Tea Tree** — two of nature's most powerful antibacterial agents — that fight acne-causing bacteria deep in your pores. Most customers see visible improvement within 2–3 weeks of twice-daily use. For best results, pair with a light, non-comedogenic moisturiser after washing." },
  { keywords: ["baby", "child", "infant", "toddler", "newborn", "little"],
    text: "Great news — our Beauty Soap is 100% safe for babies and young children! 👶 The formula is free from parabens, sulphates, synthetic fragrances, and harsh chemicals. It's gentle enough for the most sensitive skin. As always, we recommend a patch test first, and consult your paediatrician if your baby has any existing skin conditions." },
  { keywords: ["how often", "frequency", "times", "daily", "when"],
    text: "We recommend using Arwa Botaniqs Beauty Soap **twice daily** — once in the morning to start fresh, and once in the evening to cleanse the day away. 💧 If you have very sensitive skin, start with once daily and build up. Consistency is key — results build over time with regular use!" },
  { keywords: ["ingredient", "contain", "what's in", "made of", "formula", "extract"],
    text: "Our Beauty Soap is crafted with 100% botanical extracts: 🌿 **Neem** (antibacterial), 🌱 **Aloe Vera** (soothing), 🫒 **Olive Extract** (nourishing), 🌲 **Tea Tree** (pore-cleansing), ✨ **Vitamin E** (brightening), 🍯 **Honey** (moisturising), 🖤 **Activated Charcoal** (deep pore detox), 🌾 **Botanical Herbs** (synergistic blend). Zero parabens. Zero sulphates. Zero compromises." },
  { keywords: ["brighten", "whitening", "glow", "dark spot", "pigment", "tone", "fairness"],
    text: "For skin brightening, our Beauty Soap is excellent! ✨ The combination of **Vitamin E** and **Aloe Vera** helps even out skin tone, reduce dark spots, and restore natural radiance. With consistent use (typically 3–4 weeks), you will notice a beautiful, healthy glow. It is not a bleaching product — it promotes natural brightness." },
  { keywords: ["dry", "dryness", "tight", "flaky", "moistur", "hydrat"],
    text: "Don't worry — Arwa Botaniqs works beautifully for dry skin! 💧 **Honey** (a natural humectant) and **Olive Extract** work together to lock moisture into your skin after every wash, leaving it soft, supple, and never tight or dry. Follow up with a good moisturiser for even better results!" },
  { keywords: ["oily", "oil control", "shine", "greasy", "sebum", "matte"],
    text: "Perfect choice for oily skin! 🌿 **Neem** and **Activated Charcoal** work together to regulate excess sebum production and deep-cleanse clogged pores. Most oily-skin customers notice a noticeably matte and fresh finish within the first few uses. The deep cleansing action keeps pores clear and skin balanced." },
  { keywords: ["sensitive", "irritat", "allerg", "react", "rash", "eczema"],
    text: "Arwa Botaniqs is formulated with sensitive skin in mind. 🌸 It is completely free from parabens, sulphates, artificial fragrances, and harsh preservatives. **Aloe Vera** and **Honey** provide calming, anti-inflammatory benefits. We always recommend a 24-hour patch test on the inner wrist before full use if you have very reactive skin." },
  { keywords: ["price", "cost", "rs", "rupee", "how much", "pkr", "affordable"],
    text: "Arwa Botaniqs Beauty Soap (200g) is available for just **Rs. 549** — that is a 45% discount from the original Rs. 1,000! 💛 Shipping is a flat Rs. 300 across Pakistan. You can also use coupon codes like **ARWA10** for extra savings at checkout!" },
  { keywords: ["deliver", "shipping", "how long", "when", "arrival", "days"],
    text: "We deliver across all of Pakistan within **2–4 business days**. 🚚 Shipping is a flat Rs. 300 per order regardless of quantity. We dispatch orders Monday through Sunday, so weekends are not a problem! You will receive a tracking number once your order ships." },
  { keywords: ["return", "refund", "exchange", "unsatisfied", "money back"],
    text: "We offer a **2-day return policy** from the date of delivery. 🔄 If you are not satisfied, contact us within 2 days on WhatsApp (+92 304 9067897) and we will arrange a hassle-free return. Your satisfaction is our priority!" },
  { keywords: ["routine", "steps", "how to use", "apply", "wash", "use it"],
    text: "Here's the perfect routine with Arwa Botaniqs: ✅ 1. Wet your face with warm water. 2. Lather the soap between your palms. 3. Massage gently in circular motions for 30–60 seconds. 4. Rinse thoroughly with clean water. 5. Pat dry with a soft towel. 6. Apply your favourite moisturiser. Repeat morning and evening! 🌿" },
  { keywords: ["weight", "size", "how big", "gram", "200g"],
    text: "Our current Beauty Soap comes in a generous **200g** bar — that's more than twice the size of most commercial soaps! 🌿 With twice-daily use, one bar typically lasts 4–6 weeks." },
  { keywords: ["hello", "hi", "hey", "good morning", "good evening", "salaam", "salam"],
    text: "Assalamu Alaikum! 🌿 Welcome to Arwa Botaniqs AI Assistant! I'm here to help you with everything about our botanical skincare products. You can ask me about ingredients, skin concerns, how to use our soap, delivery information, or anything else. How can I help you today?" },
  { keywords: ["payment", "pay", "jazzcash", "easypaisa", "cod", "cash on delivery", "visa", "card", "mastercard"],
    text: "We accept multiple payment methods for your convenience: 💳 JazzCash, EasyPaisa, Visa, Mastercard, and **Cash on Delivery (COD)**. Choose whichever works best for you at checkout!" },
  { keywords: ["track", "tracking", "order status", "where is my order", "my order"],
    text: "You can track your order anytime from your Dashboard under **My Orders** 📦, or use the tracking number sent to you once your order ships. If you need help locating it, message us on WhatsApp and we'll check for you!" },
  { keywords: ["cancel", "cancellation"],
    text: "Need to cancel an order? No problem — as long as it hasn't shipped yet, we can cancel it for you. Just message us on WhatsApp (+92 304 9067897) with your order number and we'll take care of it right away." },
  { keywords: ["expiry", "expire", "shelf life", "how long does it last", "expiration"],
    text: "Arwa Botaniqs Beauty Soap has a shelf life of **24 months** from the manufacturing date when stored in a cool, dry place. 🌿 Since it's made with natural botanical extracts and no harsh synthetic preservatives, we recommend using it within 4–6 weeks of opening for the freshest experience." },
  { keywords: ["halal", "cruelty free", "cruelty-free", "vegan", "animal test"],
    text: "Arwa Botaniqs is proudly **100% halal**, cruelty-free, and vegan-friendly. 🌿 We never test on animals, and none of our ingredients are derived from animal sources. Nature, purity, and ethics — all in one bar." },
  { keywords: ["coupon", "discount code", "promo code", "arwa10", "voucher"],
    text: "You can use coupon code **ARWA10** at checkout for extra savings on top of our current 45% off sale! 💛 Keep an eye on our flash sale banner for limited-time offers too." },
  { keywords: ["bulk", "wholesale", "multiple bars", "gift set", "gift pack"],
    text: "Looking to order in bulk or as a gift set? 🎁 We'd love to help — please reach out to us directly on WhatsApp (+92 304 9067897) so our team can discuss quantities and special pricing with you." },
  { keywords: ["men", "man", "beard", "male skin"],
    text: "Absolutely — Arwa Botaniqs Beauty Soap works great for men too! 🌿 The Neem and Tea Tree extracts are especially effective against everyday oil buildup, and it's gentle enough to use on the face, neck, and beard area." },
  { keywords: ["teen", "teenager", "student", "young skin"],
    text: "Yes, our soap is safe and gentle for teenage skin! 🌿 With Neem and Tea Tree helping manage typical teenage breakouts and Aloe Vera keeping skin calm, it's a great addition to a simple daily routine." },
  { keywords: ["contact", "support", "help", "customer service", "phone number", "email"],
    text: "You can reach our team directly: 📱 WhatsApp: +92 304 9067897 · 📧 arwabotanicss@gmail.com · 📍 Faisalabad, Pakistan. We're happy to help with anything!" },
  { keywords: ["scent", "fragrance", "smell", "perfume"],
    text: "Arwa Botaniqs has a light, natural botanical scent that comes purely from its plant-based ingredients — no synthetic perfumes or artificial fragrances added. 🌿 It's fresh and earthy, never overpowering." },
  { keywords: ["natural", "organic", "chemical free", "chemical-free", "toxin"],
    text: "Yes! Arwa Botaniqs Beauty Soap is made with 100% botanical extracts and is completely free from parabens, sulphates, synthetic fragrances, and harsh chemicals. 🌿 Just pure, nature-derived ingredients you can trust." },
  { keywords: ["pakistan", "country", "where made", "manufactured", "origin"],
    text: "Arwa Botaniqs is proudly made in **Faisalabad, Pakistan** 🇵🇰 — crafted locally with care using premium botanical ingredients." },
  { keywords: ["order", "how to order", "how to buy", "purchase", "checkout"],
    text: "Ordering is simple! 🛒 Just add the soap to your cart, go to checkout, fill in your delivery details, choose a payment method (JazzCash, EasyPaisa, card, or Cash on Delivery), and confirm. You'll get a confirmation and tracking number right after!" },
  { keywords: ["subscribe", "subscription", "newsletter", "recurring"],
    text: "We don't currently offer a subscription plan, but you're welcome to order as often as you like! 🌿 Subscribe to our newsletter for exclusive deals and early access to new launches." },
  { keywords: ["quality", "authentic", "original", "fake", "genuine"],
    text: "All Arwa Botaniqs products are 100% authentic and sold directly by us. 🌿 We stand behind the quality of every bar — if anything ever feels off, reach out to us on WhatsApp and we'll make it right." },
  { keywords: ["skin type", "which skin", "suitable for", "all skin"],
    text: "Arwa Botaniqs Beauty Soap is formulated to suit **all skin types** — oily, dry, combination, and sensitive. 🌿 The natural ingredient blend adapts gently to your skin's needs without stripping or irritating it." },
];
 
const DEFAULT = "Hmm, I'm not sure about that one yet! 🌿 I can help with ingredients, skin concerns, how to use the soap, pricing, delivery, payments, and more — try asking in a different way, or for anything specific, our team is happy to help directly on WhatsApp: +92 304 9067897.";
 
function getBotResponse(message: string): string {
  const lower = message.toLowerCase();
  const match = BOT_RESPONSES.find(r => r.keywords.some(k => lower.includes(k)));
  return match ? match.text : DEFAULT;
}
 
interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  time: string;
}
 
const SUGGESTED = [
  "Which soap is best for acne?",
  "Is it safe for babies?",
  "How often should I use it?",
  "What ingredients does it contain?",
  "How long for delivery?",
  "What is the price?",
];
 
const INITIAL_MSG: Message = {
  id: "0",
  role: "bot",
  text: "Assalamu Alaikum! 🌿 I'm the Arwa Botaniqs AI Skin Assistant. Ask me anything about our botanical beauty products — ingredients, skin concerns, how to use, delivery, and more. How can I help you today?",
  time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
};
 
const SAVED_CONVOS = [
  { id: "c1", title: "Acne treatment advice", date: "July 1, 2026", preview: "Which soap is best for acne prone skin..." },
  { id: "c2", title: "Baby skin care",         date: "June 20, 2026", preview: "Is this soap safe for my 2 year old..." },
];
 
// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3" style={{ backgroundColor: "rgba(245,240,232,0.06)", display: "inline-flex" }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
          className="w-2 h-2 rounded-full" style={{ backgroundColor: C.gold }} />
      ))}
    </div>
  );
}
 
// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isBot = msg.role === "bot";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className={`flex items-end gap-3 mb-4 ${isBot ? "" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: isBot ? C.gold : "rgba(201,168,76,0.2)" }}>
        {isBot ? <Bot size={15} color={C.green} /> : <User size={15} color={C.gold} />}
      </div>
 
      {/* Bubble */}
      <div className={`max-w-[75%] px-4 py-3 ${isBot ? "" : ""}`}
        style={{ backgroundColor: isBot ? "rgba(245,240,232,0.07)" : "rgba(201,168,76,0.15)", border: `1px solid ${isBot ? "rgba(201,168,76,0.15)" : "rgba(201,168,76,0.35)"}` }}>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: C.ivory, lineHeight: 1.72, whiteSpace: "pre-wrap" }}>
          {msg.text}
        </p>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "rgba(245,240,232,0.35)", marginTop: 4, textAlign: isBot ? "left" : "right" }}>
          {msg.time}
        </p>
      </div>
    </motion.div>
  );
}
 
// ─── AI Assistant Page ────────────────────────────────────────────────────────
export default function AIAssistant() {
  const navigate       = useNavigate();
  const [messages,  setMessages]  = useState<Message[]>([INITIAL_MSG]);
  const [input,     setInput]     = useState("");
  const [typing,    setTyping]    = useState(false);
  const [sideOpen,  setSideOpen]  = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
 
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
 
  const send = (text: string) => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim(), time: now };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setTyping(true);
 
    const delay = 800 + Math.random() * 800;
    setTimeout(() => {
      const botText = getBotResponse(text);
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: "bot", text: botText, time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) };
      setMessages(m => [...m, botMsg]);
      setTyping(false);
    }, delay);
  };
 
  const clearChat = () => { setMessages([INITIAL_MSG]); };
 
  return (
    <div className="flex" style={{ backgroundColor: C.dark, height: "100dvh", paddingTop: 96, boxSizing: "border-box" }}>
      {/* History sidebar */}
      <AnimatePresence>
        {sideOpen && (
          <>
            <motion.div key="sb-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 sm:hidden" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setSideOpen(false)} />
            <motion.aside key="sb" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.28 }}
              className="fixed left-0 top-0 bottom-0 z-40 sm:z-auto sm:static w-64 flex flex-col"
              style={{ backgroundColor: "#0a1c12", borderRight: `1px solid rgba(201,168,76,0.12)`, minHeight: "100vh" }}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid rgba(201,168,76,0.12)` }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: C.gold }}>Conversations</span>
                <button onClick={() => setSideOpen(false)} className="sm:hidden"><ChevronLeft size={18} color={C.muted} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <button onClick={clearChat} className="w-full flex items-center gap-2 px-3 py-2.5 mb-2 hover:bg-white/5 transition-colors"
                  style={{ border: `1px dashed rgba(201,168,76,0.25)`, color: C.gold, fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem" }}>
                  <Plus size={13} /> New Chat
                </button>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(245,240,232,0.3)", marginBottom: 8, padding: "0 8px" }}>History</p>
                {SAVED_CONVOS.map(c => (
                  <button key={c.id} className="w-full text-left px-3 py-3 hover:bg-white/5 transition-colors mb-1"
                    style={{ borderLeft: "2px solid transparent" }}>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.ivory, marginBottom: 2 }}>{c.title}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", color: "rgba(245,240,232,0.35)" }}>{c.date}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "rgba(245,240,232,0.4)", marginTop: 2 }}>{c.preview}</p>
                  </button>
                ))}
              </div>
              <div className="p-3" style={{ borderTop: `1px solid rgba(201,168,76,0.12)` }}>
                <button onClick={clearChat} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-xs"
                  style={{ color: "rgba(245,240,232,0.4)", fontFamily: "'DM Sans',sans-serif" }}>
                  <Trash2 size={12} /> Clear History
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
 
      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: C.dark, borderBottom: `1px solid rgba(201,168,76,0.12)` }}>
          <button onClick={() => navigate(-1)} className="p-1.5 hover:opacity-60 transition-opacity"><ChevronLeft size={20} color={C.muted} /></button>
          <button onClick={() => setSideOpen(!sideOpen)} className="p-1.5 hover:opacity-60 transition-opacity"><History size={18} color={C.muted} /></button>
 
          {/* Bot info */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: C.gold }}>
              <Bot size={18} color={C.green} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 600, color: C.ivory }}>Arwa AI Skin Assistant</p>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: "#22c55e" }}>Online</span>
              </div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "rgba(245,240,232,0.4)" }}>Powered by Arwa Botanical Intelligence</p>
            </div>
          </div>
 
          <button onClick={clearChat} className="p-1.5 hover:opacity-60 transition-opacity" title="Clear chat">
            <Trash2 size={16} color={C.muted} />
          </button>
        </div>
 
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto">
          {/* Suggested questions (shown only at start) */}
          {messages.length === 1 && (
            <div className="mb-6">
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(245,240,232,0.35)", marginBottom: 10 }}>Suggested Questions</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="px-3 py-1.5 text-sm hover:border-[#c9a84c] transition-colors"
                    style={{ border: `1px solid rgba(201,168,76,0.25)`, color: "rgba(245,240,232,0.7)", fontFamily: "'DM Sans',sans-serif", backgroundColor: "rgba(201,168,76,0.05)" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
 
          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
          {typing && (
            <div className="flex items-end gap-3 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: C.gold }}>
                <Bot size={15} color={C.green} />
              </div>
              <TypingDots />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
 
        {/* Input */}
        <div className="px-4 py-4 max-w-3xl w-full mx-auto flex-shrink-0" style={{ borderTop: `1px solid rgba(201,168,76,0.12)`, paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div className="flex items-end gap-2">
            {/* Text input */}
            <div className="flex-1 relative">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask me about your skin concerns..."
                rows={1} className="w-full px-4 py-2.5 text-sm outline-none resize-none"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: `1px solid rgba(201,168,76,0.25)`, color: C.ivory, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5, maxHeight: 100 }} />
            </div>
 
            {/* Send */}
            <button onClick={() => send(input)} disabled={!input.trim() || typing}
              className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 disabled:opacity-30"
              style={{ backgroundColor: C.gold }}>
              <Send size={15} color={C.green} />
            </button>
          </div>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "rgba(245,240,232,0.2)", textAlign: "center", marginTop: 8 }}>
            AI responses are for guidance only. For medical advice, consult a dermatologist.
          </p>
        </div>
      </div>
    </div>
  );
}
