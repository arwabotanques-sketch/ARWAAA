import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useStore } from "../store";
import { LeafSVG, BrandLogo } from "../shared";
import { Eye, EyeOff, Lock, Mail, Shield, AlertCircle } from "lucide-react";
import { API_URL } from "../config";

const A = {
  bg:     "#0b1a12",
  card:   "rgba(26,61,43,0.5)",
  gold:   "#c9a84c",
  green:  "#1a3d2b",
  ivory:  "#f5f0e8",
  muted:  "rgba(245,240,232,0.45)",
  border: "rgba(201,168,76,0.2)",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px 11px 42px", fontSize: "0.9rem", outline: "none",
  backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.22)",
  color: A.ivory, fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s",
};

// â”€â”€â”€ Lock Screen (session timeout) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Instead of checking a hardcoded password, this now re-checks the entered
// password against the real backend, using the currently logged-in admin's email.
export function AdminLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { admin } = useStore();
  const [pass, setPass]       = useState("");
  const [show, setShow]       = useState(false);
  const [err,  setErr]        = useState(false);
  const [loading, setLoading] = useState(false);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) { setErr(true); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: admin.email, password: pass }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUnlock();
        setPass("");
        setErr(false);
      } else {
        setErr(true);
        setTimeout(() => setErr(false), 2000);
      }
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "rgba(11,26,18,0.97)", backdropFilter: "blur(20px)" }}>
      <div className="w-full max-w-xs text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: "rgba(201,168,76,0.12)", border: `1px solid ${A.gold}` }}>
          <Lock size={28} color={A.gold} />
        </div>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", color: A.ivory, marginBottom: 4 }}>Session Locked</p>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: A.muted, marginBottom: 24 }}>Enter your password to resume</p>
        <form onSubmit={unlock}>
          <div className="relative mb-3">
            <Lock size={14} color="rgba(201,168,76,0.5)" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type={show ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="Admin password"
              style={{ ...inp, paddingRight: 40, borderColor: err ? "#ef4444" : "rgba(201,168,76,0.22)" }} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {show ? <EyeOff size={14} color={A.muted} /> : <Eye size={14} color={A.muted} />}
            </button>
          </div>
          {err && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: "#ef4444", marginBottom: 8 }}>Incorrect password</p>}
          <button type="submit" disabled={loading} className="w-full py-3 text-sm uppercase tracking-widest" style={{ backgroundColor: A.gold, color: A.green, fontFamily: "'DM Sans',sans-serif", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Admin Login Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AdminLogin() {
  const navigate        = useNavigate();
  const { adminLogin, isAdmin } = useStore();
  const [email,    setEmail]    = useState("");
  const [pass,     setPass]     = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => { if (isAdmin) navigate("/admin"); }, [isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const success = await adminLogin(email, pass);
      if (success) {
        navigate("/admin");
      } else {
        setError("Invalid admin credentials.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: A.bg }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-2/5 flex-col items-center justify-center relative overflow-hidden p-12"
        style={{ backgroundColor: "#0f2218", borderRight: `1px solid rgba(201,168,76,0.1)` }}>
        <div className="sun absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 30%, rgba(201,168,76,0.08) 0%, transparent 65%)" }} />
        <div className="leaf-1 absolute top-16 left-6 pointer-events-none"><LeafSVG size={55} color={A.gold} /></div>
        <div className="leaf-2 absolute bottom-24 right-8 pointer-events-none"><LeafSVG size={40} color="rgba(245,240,232,0.1)" /></div>
        <div className="leaf-4 absolute top-1/2 left-3 pointer-events-none"><LeafSVG size={30} color={A.gold} style={{ opacity: 0.15 }} /></div>

        <div className="relative z-10 text-center">
          <BrandLogo light />
          <div className="mt-8 mb-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(201,168,76,0.12)", border: `1px solid rgba(201,168,76,0.25)` }}>
              <Shield size={22} color={A.gold} />
            </div>
          </div>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: A.ivory, lineHeight: 1.3 }}>Admin<br /><span style={{ color: A.gold, fontStyle: "italic" }}>Control Panel</span></p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: A.muted, marginTop: 12, lineHeight: 1.7 }}>Manage your store, products, orders, and customers from a single elegant dashboard.</p>

          <div className="grid grid-cols-2 gap-3 mt-8">
            {[["87", "Orders"], ["52", "Customers"], ["Rs. 47K", "Revenue"], ["1", "Product"]].map(([v, l]) => (
              <div key={l} className="p-3 text-center" style={{ backgroundColor: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)" }}>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: A.gold }}>{v}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: A.muted }}>{l}</p>
              </div>
            ))}
          </div>

          <a href="/" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: "rgba(245,240,232,0.35)", marginTop: 32, display: "block", letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none" }}>
            â† Back to Store
          </a>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center"><BrandLogo light /></div>

          <div className="p-8" style={{ backgroundColor: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(201,168,76,0.16)" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(201,168,76,0.12)" }}>
                <Shield size={16} color={A.gold} />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", fontWeight: 700, color: A.ivory, lineHeight: 1 }}>Admin Login</h2>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: A.muted }}>Arwa Botaniqs Control Panel</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(201,168,76,0.75)", display: "block", marginBottom: 6 }}>Admin Email</label>
                <div className="relative">
                  <Mail size={14} color="rgba(201,168,76,0.45)" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} required />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(201,168,76,0.75)", display: "block", marginBottom: 6 }}>Password</label>
                <div className="relative">
                  <Lock size={14} color="rgba(201,168,76,0.45)" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" style={{ ...inp, paddingRight: 42 }} required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPass ? <EyeOff size={14} color={A.muted} /> : <Eye size={14} color={A.muted} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <AlertCircle size={14} color="#ef4444" />
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "#ef4444" }}>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Options */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="w-4 h-4 border flex items-center justify-center" style={{ borderColor: remember ? A.gold : "rgba(201,168,76,0.3)", backgroundColor: remember ? A.gold : "transparent" }}
                    onClick={() => setRemember(!remember)}>
                    {remember && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={A.green} strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>}
                  </div>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: A.muted }}>Remember me</span>
                </label>
                              </div>

              <button type="submit" disabled={loading} className="w-full py-3.5 text-sm font-medium uppercase tracking-widest transition-opacity"
                style={{ backgroundColor: A.gold, color: A.green, fontFamily: "'DM Sans',sans-serif", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Authenticating..." : "Login to Admin Panel"}
              </button>
            </form>

            <a href="/" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: "rgba(245,240,232,0.3)", display: "block", textAlign: "center", marginTop: 16, textDecoration: "none", letterSpacing: "0.1em" }}
              className="hover:text-[#c9a84c] transition-colors">â† Back to Customer Site</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
