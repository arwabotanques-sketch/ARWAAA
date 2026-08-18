import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { C } from "../shared";

// ─── Floating particle ────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

function generateParticles(count = 40): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 1.5 + Math.random() * 3.5,
    duration: 10 + Math.random() * 16,
    delay: Math.random() * 10,
    opacity: 0.15 + Math.random() * 0.45,
    color: Math.random() > 0.5 ? C.gold : C.ivory,
  }));
}

const PARTICLES = generateParticles(40);

// ─── Letter reveal animation ──────────────────────────────────────────────────
function RevealText({
  text, delay = 0, style, className = "",
}: {
  text: string; delay?: number; style?: React.CSSProperties; className?: string;
}) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, delay: delay + i * 0.055, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "inline-block", whiteSpace: ch === " " ? "pre" : "normal", ...style }}>
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

// ─── Animated light ray ───────────────────────────────────────────────────────
function LightRay({ angle, delay }: { angle: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: [0, 0.12, 0.06, 0.12], scaleY: 1 }}
      transition={{ duration: 3, delay, ease: "easeOut", opacity: { repeat: Infinity, duration: 4, repeatType: "mirror" } }}
      style={{
        position: "absolute",
        top: 0,
        left: "50%",
        width: 1,
        height: "120%",
        transformOrigin: "top center",
        transform: `rotate(${angle}deg)`,
        background: `linear-gradient(to bottom, rgba(201,168,76,0.35) 0%, transparent 100%)`,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Soap bubble ──────────────────────────────────────────────────────────────
function Bubble({ x, size, delay }: { x: number; size: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: [0, 0.5, 0.5, 0], y: `-${80 + Math.random() * 40}vh` }}
      transition={{ duration: 6 + Math.random() * 4, delay, ease: "linear", repeat: Infinity, repeatDelay: Math.random() * 6 }}
      style={{
        position: "absolute",
        bottom: "5%",
        left: `${x}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px solid rgba(201,168,76,0.4)`,
        background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15), rgba(201,168,76,0.04))",
        pointerEvents: "none",
      }}
    />
  );
}

const BUBBLES = Array.from({ length: 12 }, (_, i) => ({
  x: 5 + Math.random() * 90,
  size: 6 + Math.random() * 18,
  delay: i * 0.8 + Math.random() * 2,
}));

// ─── Enter button ─────────────────────────────────────────────────────────────
function EnterButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (!ref.current) return;
    ref.current.style.transform = "translate(0, 0)";
  };

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 4.2 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label="Enter Arwa Botaniqs experience"
      style={{
        position: "relative",
        padding: "18px 52px",
        backgroundColor: hovered ? "#b8962e" : C.gold,
        color: C.green,
        fontFamily: "'Playfair Display', serif",
        fontSize: "1rem",
        fontWeight: 600,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        border: "none",
        cursor: "pointer",
        transition: "background-color 0.25s ease, transform 0.15s ease",
        overflow: "hidden",
      }}>
      {/* Ripple glow */}
      <motion.span
        animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        style={{ position: "absolute", inset: 0, backgroundColor: C.gold, borderRadius: "50%", pointerEvents: "none" }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>Enter Experience</span>
    </motion.button>
  );
}

// ─── Intro Screen ─────────────────────────────────────────────────────────────
const LS_KEY = "arwa_intro_seen";

interface IntroProps { onComplete: () => void; }

const AUTO_ADVANCE_MS = 5800; // after all animations settle

export default function IntroScreen({ onComplete }: IntroProps) {
  const [exiting, setExiting] = useState(false);

  // Auto-advance after animations complete
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(LS_KEY, "1");
      setExiting(true);
      setTimeout(onComplete, 700);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [onComplete]);

  const handleSkip = () => {
    localStorage.setItem(LS_KEY, "1");
    onComplete();
  };

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            pointerEvents: exiting ? "none" : "auto",
            backgroundColor: "#071410",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Arwa Botaniqs intro experience">

          {/* Background ambient glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse 60% 55% at 50% 45%, rgba(26,61,43,0.7) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Gold light rays */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            {[-40, -20, 0, 20, 40].map((angle, i) => (
              <LightRay key={i} angle={angle} delay={1 + i * 0.3} />
            ))}
          </div>

          {/* Floating particles */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden>
            {PARTICLES.map(p => (
              <motion.div
                key={p.id}
                initial={{ y: "100vh", opacity: 0 }}
                animate={{ y: "-10vh", opacity: [0, p.opacity, p.opacity, 0] }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 4,
                  ease: "linear",
                }}
                style={{
                  position: "absolute",
                  left: `${p.x}%`,
                  bottom: 0,
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  backgroundColor: p.color,
                  filter: "blur(0.5px)",
                }}
              />
            ))}
          </div>

          {/* Soap bubbles */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden>
            {BUBBLES.map((b, i) => <Bubble key={i} {...b} />)}
          </div>

          {/* Main content */}
          <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 24px", maxWidth: 600 }}>

            {/* AB Monogram */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.2, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginBottom: 32 }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(4rem, 12vw, 7rem)",
                  fontWeight: 700,
                  color: C.gold,
                  lineHeight: 1,
                  letterSpacing: "-3px",
                  display: "block",
                }}>AB</span>
                {/* Botanical leaf between letters */}
                <svg width="18" height="26" viewBox="0 0 18 26" style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)" }} aria-hidden>
                  <path d="M9 0 Q12 8 9 16 Q6 22 9 26" stroke={C.gold} strokeWidth="1.2" fill="none" opacity=".9" />
                  <path d="M9 6 Q14 4 15 8 Q11 9.5 9 8" fill={C.gold} />
                  <path d="M9 6 Q4 4 3 8 Q7 9.5 9 8" fill={C.gold} />
                  <path d="M9 12 Q14 10 15 14 Q11 15.5 9 14" fill={C.gold} opacity="0.7" />
                  <path d="M9 12 Q4 10 3 14 Q7 15.5 9 14" fill={C.gold} opacity="0.7" />
                </svg>
              </div>
            </motion.div>

            {/* ARWA */}
            <div style={{ marginBottom: 8 }}>
              <RevealText
                text="ARWA"
                delay={1.6}
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(2.4rem, 8vw, 5rem)",
                  fontWeight: 700,
                  color: C.ivory,
                  letterSpacing: "0.4em",
                }}
              />
            </div>

            {/* Gold line */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 2.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                height: 1,
                backgroundColor: C.gold,
                transformOrigin: "center",
                marginBottom: 8,
                maxWidth: 280,
                margin: "8px auto",
              }}
            />

            {/* BOTANIQS */}
            <div style={{ marginBottom: 8 }}>
              <RevealText
                text="BOTANIQS"
                delay={2.6}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "clamp(0.85rem, 2.5vw, 1.2rem)",
                  fontWeight: 400,
                  color: C.gold,
                  letterSpacing: "0.55em",
                }}
              />
            </div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 3.4 }}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "clamp(0.72rem, 2vw, 0.88rem)",
                color: "rgba(245,240,232,0.5)",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                marginTop: 20,
                marginBottom: 52,
              }}>
              Nature &nbsp;·&nbsp; Purity &nbsp;·&nbsp; You
            </motion.p>

            {/* Skip link */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.5 }}
              onClick={handleSkip}
              aria-label="Skip intro and enter store"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.7rem",
                color: "rgba(245,240,232,0.28)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "rgba(201,168,76,0.55)"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "rgba(245,240,232,0.28)"; }}>
              Skip →
            </motion.button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ─── Hook to determine whether to show intro ──────────────────────────────────
export function shouldShowIntro(): boolean {
  try {
    return !localStorage.getItem(LS_KEY);
  } catch {
    return false;
  }
}
