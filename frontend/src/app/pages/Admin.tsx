import { fetchAdminCustomers, type AdminCustomer as AdminCustomerType } from "../api/customers";
import {
  fetchOrders, fetchOrderDetail, updateOrderStatus as updateOrderStatusApi,
  updateOrderNotes as updateOrderNotesApi, verifyManualPayment, type AdminOrder as AdminOrderType,
  type OrderItem as OrderItemType, type OrderTimelineEntry as OrderTimelineType,
} from "../api/orders";
import {
  fetchCategories, createCategory, updateCategory, deleteCategory,
  type Category,
} from "../api/categories";
import {
  fetchCoupons, createCoupon as createCouponApi, updateCoupon as updateCouponApi, deleteCoupon as deleteCouponApi,
  type Coupon as CouponType,
} from "../api/coupons";
import { fetchShippingSettings, updateShippingSettings as updateShippingSettingsApi } from "../api/shippingSettings";
import {
  fetchCoupons, createCoupon as createCouponApi, updateCoupon as updateCouponApi, deleteCoupon as deleteCouponApi,
  type Coupon as CouponType,
} from "../api/coupons";
import { fetchShippingSettings, updateShippingSettings as updateShippingSettingsApi } from "../api/shippingSettings";
import {
  fetchCoupons, createCoupon as createCouponApi, updateCoupon as updateCouponApi, deleteCoupon as deleteCouponApi,
  type Coupon as CouponType,
} from "../api/coupons";
import { fetchShippingSettings, updateShippingSettings as updateShippingSettingsApi } from "../api/shippingSettings";
import { fetchDashboardStats, type DashboardStats as DashboardStatsType } from "../api/dashboard";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useStore } from "../store";
import {
  fetchProducts, createProduct as createProductApi, updateProduct as updateProductApi,
  deleteProduct as deleteProductApi, type AdminProduct as AdminProductType,
} from "../api/products";
import { AdminLockScreen } from "./AdminLogin";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Megaphone,
  FileText, BarChart2, Settings, HelpCircle, Bell, LogOut,
  Menu, X, ChevronRight, ChevronDown, ChevronLeft, ChevronUp,
  Search, Plus, Edit2, Trash2, Eye, Copy, Download, Upload,
  Filter, RefreshCw, ExternalLink, Check, Star, Tag, Gift,
  Truck, RotateCcw, Shield, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, ShoppingCart, UserCheck, Package2, Globe, Mail,
  Phone, MapPin, Image, Video, FileImage, Zap, Award, Clock,
  CheckCircle, XCircle, AlertCircle, Info, MoreVertical, MoreHorizontal,
  Printer, FileSpreadsheet, FileDown, Save, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

// ─── Admin Palette ────────────────────────────────────────────────────────────
const A = {
  bg:      "#0b1a12",
  sidebar: "#0d1e14",
  card:    "#122018",
  card2:   "#162c1e",
  border:  "rgba(201,168,76,0.14)",
  gold:    "#c9a84c",
  green:   "#1a3d2b",
  ivory:   "#f5f0e8",
  muted:   "rgba(245,240,232,0.42)",
  text:    "rgba(245,240,232,0.86)",
  red:     "#ef4444",
  amber:   "#f59e0b",
  blue:    "#3b82f6",
  teal:    "#14b8a6",
  green2:  "#22c55e",
  purple:  "#8b5cf6",
};

const F = { serif: "'Playfair Display',serif", sans: "'DM Sans',sans-serif" };

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS: Record<string, { color: string; bg: string; label: string }> = {
  pending:           { color: A.amber,  bg: "rgba(245,158,11,0.12)",  label: "Pending" },
  processing:        { color: A.blue,   bg: "rgba(59,130,246,0.12)",  label: "Processing" },
  packed:            { color: A.purple, bg: "rgba(139,92,246,0.12)",  label: "Packed" },
  shipped:           { color: A.teal,   bg: "rgba(20,184,166,0.12)",  label: "Shipped" },
  delivered:         { color: A.green2, bg: "rgba(34,197,94,0.12)",   label: "Delivered" },
  cancelled:         { color: A.red,    bg: "rgba(239,68,68,0.12)",   label: "Cancelled" },
  "refund-requested":{ color: "#f97316",bg: "rgba(249,115,22,0.12)", label: "Refund Req." },
  "refund-approved": { color: "#84cc16",bg: "rgba(132,204,22,0.12)", label: "Refund ✓" },
  active:            { color: A.green2, bg: "rgba(34,197,94,0.12)",   label: "Active" },
  draft:             { color: A.amber,  bg: "rgba(245,158,11,0.12)",  label: "Draft" },
  blocked:           { color: A.red,    bg: "rgba(239,68,68,0.12)",   label: "Blocked" },
  open:              { color: A.blue,   bg: "rgba(59,130,246,0.12)",  label: "Open" },
  "in-progress":     { color: A.amber,  bg: "rgba(245,158,11,0.12)",  label: "In Progress" },
  resolved:          { color: A.green2, bg: "rgba(34,197,94,0.12)",   label: "Resolved" },
  featured:          { color: A.gold,   bg: "rgba(201,168,76,0.12)",  label: "Featured" },
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
interface AdminCustomer {
  id: string; name: string; email: string; phone: string; city: string; province: string;
  orders: number; spent: number; points: number; joined: string; status: "active"|"blocked"; vip: boolean;
}

interface AdminProduct {
  id: string; name: string; subtitle: string; sku: string; price: number; oldPrice: number;
  discount: number; stock: number; sold: number; status: "active"|"draft"; featured: boolean;
  category: string; tags: string[]; weight: string;
}

const DEVICE_DATA = [
  { name:"Mobile",  value:68, color:A.gold   },
  { name:"Desktop", value:25, color:A.teal   },
  { name:"Tablet",  value:7,  color:A.purple },
];

const TRAFFIC_DATA = [
  { source:"Direct",  visitors:412 },{ source:"Social",  visitors:318 },
  { source:"Search",  visitors:289 },{ source:"Referral", visitors:224 },
];

const ADMIN_COUPONS_DATA = [
  { id:"cp1",code:"ARWA10",   type:"percent",discount:10,uses:23,maxUses:100,expiry:"Jul 31, 2026",status:"active" },
  { id:"cp2",code:"WELCOME",  type:"percent",discount:15,uses:8, maxUses:50, expiry:"Jul 15, 2026",status:"active" },
  { id:"cp3",code:"BOTANIQ"  ,type:"percent",discount:20,uses:5, maxUses:30, expiry:"Aug 1, 2026", status:"active" },
  { id:"cp4",code:"SUMMER25", type:"percent",discount:25,uses:12,maxUses:50, expiry:"Jul 31, 2026",status:"active" },
  { id:"cp5",code:"FLASH50",  type:"fixed",  discount:50,uses:0, maxUses:20, expiry:"Jul 5, 2026", status:"draft"  },
];

const ADMIN_FAQS = [
  { id:"f1",question:"Is it suitable for all skin types?",      answer:"Yes, suitable for all skin types including sensitive and baby skin.",         status:"active" },
  { id:"f2",question:"How often should I use the soap?",        answer:"Use twice daily, morning and evening.",                                        status:"active" },
  { id:"f3",question:"Are there harmful chemicals?",            answer:"No parabens, sulphates, or harmful preservatives.",                            status:"active" },
  { id:"f4",question:"How long for visible results?",           answer:"Most customers see improvement within 2-3 weeks.",                             status:"active" },
  { id:"f5",question:"What payment methods do you accept?",     answer:"JazzCash, EasyPaisa, COD, Visa, Mastercard, and all major debit/credit cards.",status:"active" },
];

const ADMIN_TESTIMONIALS = [
  { id:"t1",name:"Ayesha Malik",  city:"Lahore",   rating:5,text:"Best soap I've ever used!",         status:"approved" },
  { id:"t2",name:"Fatima Zahra",  city:"Karachi",  rating:5,text:"Perfect for sensitive skin.",        status:"approved" },
  { id:"t3",name:"Zara Ahmed",    city:"Islamabad",rating:5,text:"Cleared my daughter's acne!",        status:"approved" },
  { id:"t4",name:"Hina Qureshi",  city:"Faisalabad",rating:5,text:"Luxurious feel at amazing price.", status:"approved" },
];

const ADMIN_TICKETS = [
  { id:"TKT-001",customer:"Ayesha Khan",  subject:"Order ARW-241567 delay query",        status:"in-progress",date:"Jun 30, 2026",priority:"medium" },
  { id:"TKT-002",customer:"Amna Malik",   subject:"Refund request for ARW-163210",       status:"open",       date:"Jul 1, 2026", priority:"high" },
  { id:"TKT-003",customer:"Sana Tariq",   subject:"How to use the soap for acne?",       status:"resolved",   date:"Jun 28, 2026",priority:"low" },
  { id:"TKT-004",customer:"Bilal Ahmed",  subject:"Bulk order enquiry",                  status:"resolved",   date:"Jun 25, 2026",priority:"low" },
  { id:"TKT-005",customer:"Maryam Ali",   subject:"Change delivery address",             status:"resolved",   date:"Jun 27, 2026",priority:"medium" },
];

function adminNotifIcon(type: string) {
  if (type === "admin_order") return ShoppingBag;
  if (type === "admin_customer") return Users;
  if (type === "admin_stock") return AlertTriangle;
  return Bell;
}

// ─── Shared Utilities ─────────────────────────────────────────────────────────
function ABadge({ status }: { status: string }) {
  const s = STATUS[status] || { color: A.muted, bg: "rgba(255,255,255,0.05)", label: status };
  return (
    <span className="px-2.5 py-0.5 text-[11px] font-medium capitalize"
      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.color}35`, fontFamily: F.sans, letterSpacing: "0.04em" }}>
      {s.label}
    </span>
  );
}

function ACard({ children, className = "", style, onClick }: { children: ReactNode; className?: string; style?: React.CSSProperties; onClick?: React.MouseEventHandler<HTMLDivElement> }) {
  return (
    <div className={className} style={{ backgroundColor: A.card, border: `1px solid ${A.border}`, ...style }} onClick={onClick}>
      {children}
    </div>
  );
}

function AHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 style={{ fontFamily: F.serif, fontSize: "1.35rem", fontWeight: 700, color: A.ivory }}>{title}</h2>
        {sub && <p style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.muted, marginTop: 2 }}>{sub}</p>}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

function ABtn({ children, variant = "primary", size = "md", onClick, disabled, className = "" }: {
  children: ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger"; size?: "sm"|"md";
  onClick?: () => void; disabled?: boolean; className?: string;
}) {
  const styles = {
    primary:   { bg: A.gold,   color: A.green, border: "none" },
    secondary: { bg: "transparent", color: A.ivory, border: `1px solid rgba(201,168,76,0.3)` },
    ghost:     { bg: "transparent", color: A.muted,  border: `1px solid ${A.border}` },
    danger:    { bg: "transparent", color: A.red,     border: `1px solid rgba(239,68,68,0.3)` },
  }[variant];
  const pad = size === "sm" ? "6px 14px" : "9px 20px";
  const fs  = size === "sm" ? "0.75rem" : "0.8rem";

  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:opacity-40 ${className}`}
      style={{ padding: pad, fontSize: fs, fontFamily: F.sans, letterSpacing: "0.08em", textTransform: "uppercase", backgroundColor: styles.bg, color: styles.color, border: styles.border, flexShrink: 0 }}>
      {children}
    </button>
  );
}

function AInput({ value, onChange, placeholder, type = "text", style: extraStyle }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="outline-none"
      style={{ padding: "8px 14px", fontSize: "0.84rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text, ...extraStyle }} />
  );
}

function AModal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="mb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70]" style={{ backgroundColor: "rgba(0,0,0,0.65)" }} onClick={onClose} />
          <motion.div key="mc" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
            className="fixed z-[80] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full overflow-y-auto"
            style={{ maxWidth: wide ? 800 : 540, maxHeight: "90vh", backgroundColor: A.card2, border: `1px solid ${A.border}` }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${A.border}` }}>
              <h3 style={{ fontFamily: F.serif, fontSize: "1.1rem", color: A.ivory }}>{title}</h3>
              <button onClick={onClose}><X size={18} color={A.muted} /></button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ConfirmModal({ open, onClose, onConfirm, title, message }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string }) {
  return (
    <AModal open={open} onClose={onClose} title={title}>
      <p style={{ fontFamily: F.sans, fontSize: "0.88rem", color: A.muted, lineHeight: 1.7, marginBottom: 20 }}>{message}</p>
      <div className="flex gap-3">
        <ABtn variant="danger" onClick={() => { onConfirm(); onClose(); }}>Confirm Delete</ABtn>
        <ABtn variant="ghost" onClick={onClose}>Cancel</ABtn>
      </div>
    </AModal>
  );
}

function KPICard({ label, value, sub, icon: Icon, trend, trendVal, color = A.gold }: {
  label: string; value: string; sub?: string; icon: any; trend?: "up"|"down"; trendVal?: string; color?: string;
}) {
  return (
    <ACard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: `${color}14` }}>
          <Icon size={18} color={color} />
        </div>
        {trend && (
          <div className="flex items-center gap-1" style={{ color: trend === "up" ? A.green2 : A.red }}>
            {trend === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span style={{ fontFamily: F.sans, fontSize: "0.75rem" }}>{trendVal}</span>
          </div>
        )}
      </div>
      <p style={{ fontFamily: F.serif, fontSize: "1.7rem", fontWeight: 700, color: A.ivory, lineHeight: 1 }}>{value}</p>
      <p style={{ fontFamily: F.sans, fontSize: "0.76rem", color: A.muted, marginTop: 4 }}>{label}</p>
      {sub && <p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: color, marginTop: 2 }}>{sub}</p>}
    </ACard>
  );
}

function SearchBar({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={14} color={A.muted} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <AInput value={value} onChange={onChange} placeholder={placeholder} style={{ paddingLeft: 36, minWidth: 220 }} />
      {value && <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={12} color={A.muted} /></button>}
    </div>
  );
}

// ─── Admin Sidebar Nav ────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { label: "Dashboard",     href: "/admin",               icon: LayoutDashboard },
  { label: "Products",      href: "/admin/products",      icon: Package },
  { label: "Categories",    href: "/admin/categories",    icon: Tag },
  { label: "Orders",        href: "/admin/orders",        icon: ShoppingBag },
  { label: "Customers",     href: "/admin/customers",     icon: Users },
  { label: "Marketing",     href: "/admin/marketing",     icon: Megaphone },
  { label: "Content",       href: "/admin/content",       icon: FileText },
  { label: "Reports",       href: "/admin/reports",       icon: BarChart2 },
  { label: "Settings",      href: "/admin/settings",      icon: Settings },
  { label: "Support",       href: "/admin/support",       icon: HelpCircle },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
];

// ─── Admin Layout ─────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const { isAdmin, adminAuthLoading, adminLogout, adminNotifications, adminUnreadCount, markAdminNotifRead, markAllAdminNotifsRead, deleteAdminNotif } = useStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [locked,      setLocked]      = useState(false);
  const [searchVal,   setSearchVal]   = useState("");
const lockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notifRef = useRef<HTMLDivElement>(null);

  // Guard — only redirect once we're SURE the login-check finished and failed.
  // Redirecting while adminAuthLoading is still true would kick out a
  // genuinely logged-in admin just because the cookie check hadn't resolved yet.
  useEffect(() => {
    if (!adminAuthLoading && !isAdmin) navigate("/admin/login");
  }, [isAdmin, adminAuthLoading]);

  // Session timeout after 20 min
  const resetTimer = () => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => setLocked(true), 20 * 60 * 1000);
  };
  useEffect(() => {
    resetTimer();
    const events = ["click", "keydown", "mousemove", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimer));
    return () => { events.forEach(e => window.removeEventListener(e, resetTimer)); if (lockTimer.current) clearTimeout(lockTimer.current); };
  }, []);

  // Close the notification bell on an outside click, and close both the
  // bell and the mobile sidebar on Escape.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setNotifOpen(false); setMobileOpen(false); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 flex items-center gap-3" style={{ borderBottom: `1px solid ${A.border}` }}>
        <div className="w-8 h-8 rounded-none flex items-center justify-center flex-shrink-0" style={{ backgroundColor: A.gold }}>
          <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: "0.9rem", color: A.green }}>AB</span>
        </div>
        {!collapsed && (
          <div>
            <p style={{ fontFamily: F.serif, fontSize: "0.9rem", fontWeight: 700, color: A.gold, letterSpacing: "0.15em" }}>ARWA</p>
            <p style={{ fontFamily: F.sans, fontSize: "0.6rem", color: A.muted, letterSpacing: "0.3em", textTransform: "uppercase" }}>Admin Panel</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {ADMIN_NAV.map(({ label, href, icon: Icon }) => {
          const active = location.pathname === href || (href !== "/admin" && location.pathname.startsWith(href));
          return (
            <button key={href} onClick={() => { navigate(href); setMobileOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-150 group"
              title={collapsed ? label : ""}
              style={{ backgroundColor: active ? "rgba(201,168,76,0.12)" : "transparent", borderLeft: `3px solid ${active ? A.gold : "transparent"}`, color: active ? A.gold : A.muted }}>
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span style={{ fontFamily: F.sans, fontSize: "0.82rem" }}>{label}</span>}
              {!collapsed && active && <ChevronRight size={13} className="ml-auto" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="py-3" style={{ borderTop: `1px solid ${A.border}` }}>
        <button onClick={() => { adminLogout(); navigate("/admin/login"); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors"
          style={{ color: "#f87171" }} title={collapsed ? "Logout" : ""}>
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span style={{ fontFamily: F.sans, fontSize: "0.82rem" }}>Logout</span>}
        </button>
        <a href="/" target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:opacity-70 transition-opacity"
          style={{ color: A.muted, textDecoration: "none" }} title={collapsed ? "View Store" : ""}>
          <ExternalLink size={17} className="flex-shrink-0" />
          {!collapsed && <span style={{ fontFamily: F.sans, fontSize: "0.82rem" }}>View Store</span>}
        </a>
      </div>
    </div>
  );

  if (adminAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: A.bg }}>
        <div style={{ fontFamily: F.serif, fontSize: "1.6rem", fontWeight: 700, color: A.gold, letterSpacing: "0.15em" }}>AB</div>
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: A.bg, fontFamily: F.sans }}>
      {locked && <AdminLockScreen onUnlock={() => setLocked(false)} />}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300"
        style={{ width: collapsed ? 64 : 240, backgroundColor: A.sidebar, borderRight: `1px solid ${A.border}` }}>
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: A.card2, border: `1px solid ${A.border}` }}>
          {collapsed ? <ChevronRight size={12} color={A.muted} /> : <ChevronLeft size={12} color={A.muted} />}
        </button>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="mb-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[50] md:hidden" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={() => setMobileOpen(false)} />
            <motion.aside key="mb-side" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.25 }}
              className="fixed left-0 top-0 bottom-0 z-[55] w-64 md:hidden flex flex-col"
              style={{ backgroundColor: A.sidebar, borderRight: `1px solid ${A.border}` }}>
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4"><X size={20} color={A.muted} /></button>
              <div className="mt-10"><SidebarContent /></div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col transition-all duration-300" style={{ marginLeft: collapsed ? 64 : 0, paddingLeft: "0px" }}>
        <div className="hidden md:block" style={{ marginLeft: collapsed ? 0 : 176 }}></div>

        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3"
          style={{ backgroundColor: A.sidebar, borderBottom: `1px solid ${A.border}`, minHeight: 58 }}>
          <div className="flex items-center gap-4">
            <button className="md:hidden" onClick={() => setMobileOpen(true)}><Menu size={20} color={A.muted} /></button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span style={{ fontFamily: F.sans, fontSize: "0.75rem", color: A.muted }}>Admin</span>
              <ChevronRight size={12} color={A.muted} />
              <span style={{ fontFamily: F.sans, fontSize: "0.75rem", color: A.gold, textTransform: "capitalize" }}>
                {location.pathname.split("/").pop() || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global search */}
            <div className="relative hidden lg:block">
              <Search size={13} color={A.muted} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="Search admin..."
                className="outline-none" style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 6, paddingBottom: 6, fontSize: "0.8rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text, width: 200 }} />
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 hover:opacity-70 transition-opacity">
                <Bell size={18} color={A.muted} />
                {adminUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: A.red, color: "white", fontFamily: F.sans }}>{adminUnreadCount}</span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto z-40"
                    style={{ backgroundColor: A.card2, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", border: `1px solid ${A.border}` }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: A.border }}>
                      <p style={{ fontFamily: F.sans, fontSize: "0.82rem", color: A.ivory, fontWeight: 600 }}>Notifications</p>
                      <div className="flex items-center gap-3">
                        {adminUnreadCount > 0 && (
                          <button onClick={markAllAdminNotifsRead} style={{ fontFamily: F.sans, fontSize: "0.7rem", color: A.gold }}>Mark all read</button>
                        )}
                        <button onClick={() => { navigate("/admin/notifications"); setNotifOpen(false); }} style={{ fontFamily: F.sans, fontSize: "0.7rem", color: A.muted }}>View all</button>
                      </div>
                    </div>
                    {adminNotifications.length === 0 ? (
                      <p className="px-4 py-6 text-center" style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.muted }}>No notifications yet.</p>
                    ) : (
                      adminNotifications.slice(0, 8).map(n => {
                        const Icon = adminNotifIcon(n.type);
                        return (
                          <div key={n.id} onClick={() => { markAdminNotifRead(n.id); if (n.link) { navigate(n.link); setNotifOpen(false); } }}
                            className="px-4 py-3 border-b cursor-pointer hover:opacity-90 transition-opacity flex items-start gap-3"
                            style={{ borderColor: A.border, backgroundColor: n.is_read ? "transparent" : "rgba(201,168,76,0.06)" }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: n.is_read ? A.bg : "rgba(201,168,76,0.15)" }}>
                              <Icon size={14} color={n.is_read ? A.muted : A.gold} />
                            </div>
                            <div className="flex-1">
                              <p style={{ fontFamily: F.sans, fontSize: "0.8rem", fontWeight: n.is_read ? 400 : 600, color: A.ivory }}>{n.title}</p>
                              <p style={{ fontFamily: F.sans, fontSize: "0.74rem", color: A.muted, marginTop: 2 }}>{n.message}</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteAdminNotif(n.id); }} style={{ color: A.muted, fontSize: "0.9rem" }}>×</button>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Admin avatar */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: A.gold }}>
                <Shield size={14} color={A.green} />
              </div>
              <div className="hidden sm:block">
                <p style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.ivory, lineHeight: 1 }}>Admin</p>
                <p style={{ fontFamily: F.sans, fontSize: "0.65rem", color: A.muted }}>Arwa Botaniqs</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 sm:p-7 overflow-x-hidden" style={{ marginLeft: collapsed ? 0 : 176 }}>
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toaster position="top-right" toastOptions={{ style: { fontFamily: F.sans, borderRadius: 0, backgroundColor: A.card2, color: A.ivory, border: `1px solid ${A.border}` } }} />
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
// ─── Admin Dashboard ──────────────────────────────────────────────────────────
export function AdminDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<AdminProductType[]>([]);
  const [stats, setStats] = useState<DashboardStatsType | null>(null);

  const [customers, setCustomers] = useState<AdminCustomerType[]>([]);
  const [orders, setOrders] = useState<AdminOrderType[]>([]);
  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => {});
    fetchDashboardStats().then(setStats).catch(() => {});
    fetchAdminCustomers().then(setCustomers).catch(() => {});
    fetchOrders().then(setOrders).catch(() => {});
  }, []);

  const totalRevenue = stats?.totalRevenue ?? 0;
  const totalOrders  = stats?.totalOrders ?? orders.length;
  const pendingOrders = stats?.pendingOrders ?? orders.filter(o => ["pending","processing","packed"].includes(o.status)).length;
  const lowStock     = stats?.lowStock ?? products.filter(p => p.stock < 20).length;
  return (
    <div>
      {/* Welcome */}
      <div className="mb-6 p-5 relative overflow-hidden" style={{ backgroundColor: A.green, border: `1px solid ${A.border}` }}>
        <div className="sun absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(201,168,76,0.1) 0%, transparent 60%)" }} />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.3em", textTransform: "uppercase", color: A.gold, marginBottom: 4 }}>Good day, Admin</p>
            <h1 style={{ fontFamily: F.serif, fontSize: "1.6rem", fontWeight: 700, color: A.ivory }}>Arwa Botaniqs Dashboard</h1>
            <p style={{ fontFamily: F.sans, fontSize: "0.82rem", color: "rgba(245,240,232,0.5)", marginTop: 2 }}>Here's what's happening with your store today.</p>
          </div>
          <div className="flex gap-2">
            <ABtn size="sm" onClick={() => navigate("/admin/orders")}>View Orders</ABtn>
            <ABtn variant="secondary" size="sm" onClick={() => toast.info("Refreshing data...")}>
              <RefreshCw size={12} /> Refresh
            </ABtn>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KPICard label="Total Revenue"    value={`Rs. ${totalRevenue.toLocaleString()}`} icon={DollarSign} trend="up"   trendVal="+12%" color={A.gold}   sub="All time" />
        <KPICard label="Total Orders"     value={String(totalOrders)}                    icon={ShoppingBag} trend="up"  trendVal="+8%"  color={A.blue}   sub={`${pendingOrders} pending`} />
        <KPICard label="Customers"        value={String(customers.length)}         icon={Users}       trend="up"  trendVal=""   color={A.teal}   sub="Total registered" />
        <KPICard label="Products"         value={String(stats?.totalProducts ?? products.length)} icon={Package}     color={A.purple} sub={`${stats?.activeProducts ?? 0} active`} />
        <KPICard label="Out of Stock"     value={String(stats?.outOfStock ?? 0)}                  icon={AlertTriangle} color={A.red}   sub={`${stats?.lowStock ?? 0} low stock`} />
        <KPICard label="Site Visitors"    value="1,243"                                  icon={Globe}       trend="up"  trendVal="+18%" color={A.green2} sub="This month" />
        <KPICard label="Conversion Rate"  value="3.2%"                                   icon={TrendingUp}  trend="up"  trendVal="+0.4%" color={A.amber} sub="Visits to orders" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {/* Sales chart */}
        <ACard className="p-5 lg:col-span-2">
          <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 16 }}>Revenue — Last 14 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats?.revenueByDay ?? []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"   stopColor={A.gold} stopOpacity={0.25} />
                  <stop offset="95%"  stopColor={A.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={A.border} />
              <XAxis dataKey="date" tick={{ fontFamily: F.sans, fontSize: 10, fill: A.muted }} interval={3} />
              <YAxis tick={{ fontFamily: F.sans, fontSize: 10, fill: A.muted }} />
              <Tooltip contentStyle={{ backgroundColor: A.card2, border: `1px solid ${A.border}`, fontFamily: F.sans, fontSize: "0.78rem" }} labelStyle={{ color: A.gold }} />
              <Area type="monotone" dataKey="revenue" stroke={A.gold} strokeWidth={2} fill="url(#revGrad)" name="Revenue (Rs.)" />
            </AreaChart>
          </ResponsiveContainer>
        </ACard>

        {/* Device chart */}
        <ACard className="p-5">
          <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 8 }}>Traffic by Device</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={DEVICE_DATA} cx="50%" cy="50%" outerRadius={60} dataKey="value" nameKey="name">
                {DEVICE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: A.card2, border: `1px solid ${A.border}`, fontFamily: F.sans, fontSize: "0.78rem" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {DEVICE_DATA.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} /><span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted }}>{d.name}</span></div>
                <span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.ivory }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </ACard>
      </div>

      {/* Recent orders + customers */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <ACard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory }}>Recent Orders</h3>
            <ABtn variant="ghost" size="sm" onClick={() => navigate("/admin/orders")}>View All</ABtn>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 5).map(o => (
              <div key={o.id} className="flex items-center gap-3 py-2" style={{ borderBottom: `1px solid ${A.border}` }}>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: F.sans, fontSize: "0.82rem", color: A.ivory, fontWeight: 600 }}>{o.orderNumber}</p>
                  <p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}>{o.customer} · {o.city}</p>
                </div>
                <ABadge status={o.status} />
                <p style={{ fontFamily: F.serif, fontSize: "0.88rem", color: A.gold, flexShrink: 0 }}>Rs. {o.total.toLocaleString()}</p>
              </div>
            ))}
            {orders.length === 0 && (
              <p style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.muted }}>No orders yet.</p>
            )}
          </div>
        </ACard>

        <ACard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory }}>Recent Customers</h3>
            <ABtn variant="ghost" size="sm" onClick={() => navigate("/admin/customers")}>View All</ABtn>
          </div>
          <div className="space-y-2">
           {customers.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2" style={{ borderBottom: `1px solid ${A.border}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                  style={{ backgroundColor: "rgba(201,168,76,0.15)", color: A.gold, fontFamily: F.serif }}>
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p style={{ fontFamily: F.sans, fontSize: "0.82rem", color: A.ivory }}>{c.name}</p>
                    {c.vip && <span style={{ fontSize: "0.6rem", color: A.gold, border: `1px solid ${A.gold}`, padding: "1px 4px", fontFamily: F.sans }}>VIP</span>}
                  </div>
                  <p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}>{c.orders} orders</p>
                </div>
                <p style={{ fontFamily: F.serif, fontSize: "0.88rem", color: A.gold, flexShrink: 0 }}>Rs. {c.spent.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </ACard>
      </div>

      {/* Low stock alert + quick actions */}
      <div className="grid lg:grid-cols-3 gap-5">
        {lowStock > 0 && (
          <ACard className="p-4 lg:col-span-1" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={16} color={A.amber} />
              <h4 style={{ fontFamily: F.sans, fontSize: "0.82rem", fontWeight: 600, color: A.amber }}>Low Stock Alert</h4>
            </div>
           {(stats?.lowStockList ?? []).map(p => (
              <div key={p.id} className="flex justify-between items-center py-1.5" style={{ borderBottom: `1px solid ${A.border}` }}>
                <p style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.text }}>{p.name}{p.subtitle ? ` — ${p.subtitle}` : ""}</p>
                <span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.amber }}>{p.stock} left</span>
              </div>
            ))}
          </ACard>
        )}

        <ACard className="p-5 lg:col-span-2">
          <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 16 }}>Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Add Product",  icon: Plus,        href: "/admin/products",   color: A.gold  },
              { label: "View Orders",  icon: ShoppingBag, href: "/admin/orders",     color: A.blue  },
              { label: "Run Report",   icon: BarChart2,   href: "/admin/reports",    color: A.green2},
              { label: "Manage Coupons",icon:Tag,         href: "/admin/marketing",  color: A.purple},
            ].map(({ label, icon: Icon, href, color }) => (
              <button key={label} onClick={() => navigate(href)}
                className="flex flex-col items-center gap-2 p-3 hover:opacity-80 transition-opacity"
                style={{ backgroundColor: A.bg, border: `1px solid ${A.border}` }}>
                <div className="w-9 h-9 flex items-center justify-center" style={{ backgroundColor: `${color}14` }}>
                  <Icon size={17} color={color} />
                </div>
                <span style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted, textAlign: "center" }}>{label}</span>
              </button>
            ))}
          </div>
        </ACard>
      </div>
    </div>
  );
}

// ─── Admin Products ───────────────────────────────────────────────────────────
export function AdminProducts() {
  const {} = useStore();
  const [products, setProducts]   = useState<AdminProductType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search,   setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy,   setSortBy]     = useState("name");
  const [selected, setSelected]   = useState<string[]>([]);
  const [editProduct, setEditProduct] = useState<AdminProductType | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [saving,   setSaving]     = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFile2, setImageFile2] = useState<File | null>(null);
  const [imageFile3, setImageFile3] = useState<File | null>(null);

  const empty: AdminProductType = { id:"", name:"", subtitle:"", sku:"", price:0, oldPrice:0, discount:0, stock:0, sold:0, status:"active", featured:false, category:"", categoryName:"", tags:[], weight:"", imageUrl:null };
  const [form, setForm]  = useState<AdminProductType>(empty);

  // Load products + categories from the backend when the page opens
  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([fetchProducts(), fetchCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      toast.error(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadData(); }, []);

  const filtered = products
    .filter(p => (filterStatus === "all" || p.status === filterStatus))
    .filter(p => `${p.name} ${p.subtitle} ${p.sku}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === "price" ? a.price - b.price : sortBy === "stock" ? a.stock - b.stock : a.name.localeCompare(b.name));

  const openAdd  = () => { setForm({ ...empty, category: categories[0]?.id || "" }); setEditProduct(null); setImageFile(null); setVideoFile(null); setImageFile2(null); setImageFile3(null); setShowForm(true); };
  const openEdit = (p: AdminProductType) => { setForm(p); setEditProduct(p); setImageFile(null); setVideoFile(null); setImageFile2(null); setImageFile3(null); setShowForm(true); };

  const saveProduct = async () => {
    if (!form.name || !form.sku) { toast.error("Name and SKU are required"); return; }
   if (!form.category) { toast.error("Please choose a category"); return; }

    setSaving(true);
    try {
      if (editProduct) {
        const updated = await updateProductApi(editProduct.id, { ...form, imageFile, videoFile, imageFile2, imageFile3 });
        setProducts(ps => ps.map(p => p.id === editProduct.id ? updated : p));
        toast.success("Product updated!");
      } else {
        const created = await createProductApi({ ...form, imageFile, videoFile, imageFile2, imageFile3 });
        setProducts(ps => [...ps, created]);
        toast.success("Product added!");
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

 const removeProduct = async (id: string) => {
    try {
      await deleteProductApi(id);
      setProducts(ps => ps.filter(p => p.id !== id));
      setSelected(s => s.filter(x => x !== id));
      toast.info("Product deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    }
  };

  const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
 const bulkDelete   = async () => {
    const ids = [...selected];
    for (const id of ids) {
      try { await deleteProductApi(id); } catch { /* continue */ }
    }
    setProducts(ps => ps.filter(p => !ids.includes(p.id)));
    setSelected([]);
    toast.info(`${ids.length} products deleted`);
  };

  const inp2: React.CSSProperties = { width: "100%", padding: "8px 12px", fontSize: "0.84rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text, outline: "none" };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: A.muted, fontFamily: F.sans }}>Loading products...</div>;
  }

  return (
    <div>
      <AHead title="Products" sub={`${products.length} product${products.length !== 1 ? "s" : ""}`}
        action={<ABtn onClick={openAdd}><Plus size={14} /> Add Product</ABtn>} />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...inp2, width: "auto", padding: "8px 12px" }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ ...inp2, width: "auto", padding: "8px 12px" }}>
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price</option>
          <option value="stock">Sort: Stock</option>
        </select>
        {selected.length > 0 && (
          <div className="flex gap-2 items-center ml-auto">
            <span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted }}>{selected.length} selected</span>
            <ABtn variant="danger" size="sm" onClick={bulkDelete}><Trash2 size={12} /> Delete</ABtn>
          </div>
        )}
      </div>

      {/* Table */}
      <ACard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${A.border}` }}>
                <th className="p-4 w-8"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={e => setSelected(e.target.checked ? filtered.map(p => p.id) : [])} /></th>
                {["Product","SKU","Price","Stock","Sold","Status","Featured","Actions"].map(h => (
                  <th key={h} className="p-4 text-left" style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center" style={{ color: A.muted, fontFamily: F.sans }}>No products found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-white/3 transition-colors" style={{ borderBottom: `1px solid ${A.border}` }}>
                  <td className="p-4"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                  <td className="p-4">
                    <div>
                      <p style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.ivory, fontWeight: 600 }}>{p.name}</p>
                      <p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}>{p.subtitle} · {p.weight}</p>
                    </div>
                  </td>
                  <td className="p-4"><code style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.75rem", color: A.muted }}>{p.sku}</code></td>
                  <td className="p-4"><p style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.ivory }}>Rs. {p.price}</p><p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}><s>Rs. {p.oldPrice}</s> -{p.discount}%</p></td>
                  <td className="p-4">
                    <span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: p.stock < 20 ? A.amber : A.green2, fontWeight: 600 }}>{p.stock}</span>
                  </td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.muted }}>{p.sold}</span></td>
                  <td className="p-4"><ABadge status={p.status} /></td>
                  <td className="p-4">
                    {p.featured ? <span style={{ fontSize: "0.7rem", color: A.gold, border: `1px solid ${A.gold}`, padding: "2px 6px", fontFamily: F.sans }}>★ Featured</span>
                      : <span style={{ fontSize: "0.7rem", color: A.muted }}>—</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:opacity-70"><Edit2 size={13} color={A.gold} /></button>
                      <button onClick={() => setDeleteId(p.id)} className="p-1.5 hover:opacity-70"><Trash2 size={13} color={A.red} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ACard>

      {/* Product Form Modal */}
      <AModal open={showForm} onClose={() => setShowForm(false)} title={editProduct ? "Edit Product" : "Add Product"} wide>
        <div className="grid sm:grid-cols-2 gap-4">
          {[["Product Name *", "name"], ["Subtitle", "subtitle"], ["SKU *", "sku"], ["Weight", "weight"]].map(([label, key]) => (
            <div key={key}>
              <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>{label}</label>
              <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp2} />
            </div>
          ))}
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Category *</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp2, width: "100%" }}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {[["Price (Rs.)*", "price"], ["Old Price", "oldPrice"], ["Discount %", "discount"], ["Stock", "stock"]].map(([label, key]) => (
            <div key={key}>
              <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>{label}</label>
              <input type="number" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: +e.target.value }))} style={inp2} />
            </div>
          ))}
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} style={{ ...inp2, width: "100%" }}>
              <option value="active">Active</option><option value="draft">Draft</option>
            </select>
          </div>
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Product Image</label>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} style={inp2} />
          </div>
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Product Video (optional)</label>
            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e => setVideoFile(e.target.files?.[0] || null)} style={inp2} />
          </div>
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Product Image 2 (optional)</label>
            <input type="file" accept="image/*" onChange={e => setImageFile2(e.target.files?.[0] || null)} style={inp2} />
          </div>
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Product Image 3 (optional)</label>
            <input type="file" accept="image/*" onChange={e => setImageFile3(e.target.files?.[0] || null)} style={inp2} />
          </div>
          <div className="flex items-center gap-2 pt-4">
            <input type="checkbox" id="feat" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
            <label htmlFor="feat" style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.muted }}>Featured Product</label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <ABtn onClick={saveProduct} disabled={saving}><Save size={13} /> {saving ? "Saving..." : editProduct ? "Save Changes" : "Add Product"}</ABtn>
          <ABtn variant="ghost" onClick={() => setShowForm(false)}>Cancel</ABtn>
        </div>
      </AModal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) removeProduct(deleteId); setDeleteId(null); }}
        title="Delete Product" message="Are you sure you want to delete this product? This action cannot be undone." />
    </div>
  );
}
// ─── Admin Categories ──────────────────────────────────────────────────────────
export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      setCategories(await fetchCategories());
    } catch (err: any) {
      toast.error(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadData(); }, []);

  const openAdd = () => { setForm({ name: "", slug: "" }); setEditCat(null); setShowForm(true); };
  const openEdit = (c: Category) => { setForm({ name: c.name, slug: c.slug }); setEditCat(c); setShowForm(true); };

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

 const saveCategory = async () => {
    if (!form.name || !form.slug) { toast.error("Name and slug are required"); return; }

    setSaving(true);
    try {
      if (editCat) {
        const updated = await updateCategory(editCat.id, form);
        setCategories(cs => cs.map(c => c.id === editCat.id ? updated : c));
        toast.success("Category updated!");
      } else {
        const created = await createCategory(form);
        setCategories(cs => [...cs, created]);
        toast.success("Category added!");
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories(cs => cs.filter(c => c.id !== id));
      toast.info("Category deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  const inp2: React.CSSProperties = { width: "100%", padding: "8px 12px", fontSize: "0.84rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text, outline: "none" };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: A.muted, fontFamily: F.sans }}>Loading categories...</div>;
  }

  return (
    <div>
      <AHead title="Categories" sub={`${categories.length} categor${categories.length !== 1 ? "ies" : "y"}`}
        action={<ABtn onClick={openAdd}><Plus size={14} /> Add Category</ABtn>} />

      <ACard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${A.border}` }}>
                {["Name", "Slug", "Actions"].map(h => (
                  <th key={h} className="p-4 text-left" style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center" style={{ color: A.muted, fontFamily: F.sans }}>No categories found</td></tr>
              ) : categories.map(c => (
                <tr key={c.id} className="hover:bg-white/3 transition-colors" style={{ borderBottom: `1px solid ${A.border}` }}>
                  <td className="p-4"><p style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.ivory, fontWeight: 600 }}>{c.name}</p></td>
                  <td className="p-4"><code style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.75rem", color: A.muted }}>{c.slug}</code></td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:opacity-70"><Edit2 size={13} color={A.gold} /></button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 hover:opacity-70"><Trash2 size={13} color={A.red} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ACard>

      <AModal open={showForm} onClose={() => setShowForm(false)} title={editCat ? "Edit Category" : "Add Category"}>
        <div className="space-y-4">
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: editCat ? f.slug : slugify(e.target.value) }))} style={inp2} />
          </div>
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Slug *</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} style={inp2} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <ABtn onClick={saveCategory} disabled={saving}><Save size={13} /> {saving ? "Saving..." : editCat ? "Save Changes" : "Add Category"}</ABtn>
          <ABtn variant="ghost" onClick={() => setShowForm(false)}>Cancel</ABtn>
        </div>
      </AModal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) removeCategory(deleteId); setDeleteId(null); }}
        title="Delete Category" message="Are you sure you want to delete this category? This action cannot be undone." />
    </div>
  );
}
// ─── Admin Orders ─────────────────────────────────────────────────────────────
export function AdminOrders() {
  const [orders, setOrders]     = useState<AdminOrderType[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");
  const [detail, setDetail]     = useState<AdminOrderType | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItemType[]>([]);
  const [detailTimeline, setDetailTimeline] = useState<OrderTimelineType[]>([]);
  const [adminNote, setAdminNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleVerifyPayment = async (approve: boolean) => {
    if (!detail) return;
    setVerifying(true);
    try {
      const updated = await verifyManualPayment(detail.id, approve);
      setOrders(os => os.map(o => o.id === detail.id ? updated : o));
      setDetail(updated);
      toast.success(approve ? "Payment approved — order confirmed!" : "Payment rejected — order cancelled.");
    } catch (err: any) {
      toast.error(err.message || "Failed to process verification");
    } finally {
      setVerifying(false);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadOrders(); }, []);

  const allStatuses = ["all","pending","processing","packed","shipped","delivered","cancelled"];
  const filtered = orders
    .filter(o => filter === "all" || o.status === filter)
    .filter(o => `${o.orderNumber} ${o.customer} ${o.city}`.toLowerCase().includes(search.toLowerCase()));

  const changeStatus = async (id: string, status: string) => {
    try {
      const updated = await updateOrderStatusApi(id, status);
      setOrders(os => os.map(o => o.id === id ? updated : o));
      if (detail?.id === id) setDetail(updated);
      toast.success(`Order status updated to ${STATUS[status]?.label ?? status}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const openDetail = async (o: AdminOrderType) => {
    setDetail(o);
    setAdminNote(o.adminNote);
    setDetailItems([]);
    setDetailTimeline([]);
    try {
      const full = await fetchOrderDetail(o.id);
      setDetailItems(full.items);
      setDetailTimeline(full.timeline);
    } catch (err: any) {
      toast.error(err.message || "Failed to load order details");
    }
  };

  const saveNote = async () => {
    if (!detail) return;
    setSavingNote(true);
    try {
      const updated = await updateOrderNotesApi(detail.id, adminNote);
      setOrders(os => os.map(o => o.id === detail.id ? updated : o));
      setDetail(updated);
      toast.success("Note saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: A.muted, fontFamily: F.sans }}>Loading orders...</div>;
  }

  return (
    <div>
      <AHead title="Orders" sub={`${orders.length} total orders`}
        action={<ABtn variant="ghost" size="sm" onClick={() => toast.info("Export coming soon!")}><Download size={13} /> Export</ABtn>} />

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {allStatuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="flex-shrink-0 px-3 py-1.5 text-xs uppercase tracking-widest capitalize transition-all"
            style={{ backgroundColor: filter === s ? A.gold : "transparent", color: filter === s ? A.green : A.muted, border: `1px solid ${filter === s ? A.gold : A.border}`, fontFamily: F.sans }}>
            {s === "all" ? `All (${orders.length})` : `${STATUS[s]?.label ?? s} (${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by order #, customer, city..." />
      </div>

      <ACard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${A.border}` }}>
                {["Order #","Customer","Date","Items","Total","Payment","Status","Actions"].map(h => (
                  <th key={h} className="p-4 text-left" style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center" style={{ color: A.muted, fontFamily: F.sans }}>No orders found</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className="hover:bg-white/3 transition-colors cursor-pointer" style={{ borderBottom: `1px solid ${A.border}` }}
                  onClick={() => openDetail(o)}>
                  <td className="p-4"><span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.78rem", color: A.gold }}>{o.orderNumber}</span></td>
                  <td className="p-4">
                    <p style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.ivory, fontWeight: 600 }}>{o.customer}</p>
                    <p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}>{o.city}, {o.province}</p>
                  </td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.muted }}>{o.date}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.text }}>{o.items}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.serif, fontSize: "0.9rem", color: A.gold, fontWeight: 700 }}>Rs. {o.total.toLocaleString()}</span></td>
                  <td className="p-4">
                    <span style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.muted }}>{o.payment}</span>
                    <span style={{
                      fontFamily: F.sans, fontSize: "0.68rem", marginLeft: 6, padding: "1px 6px",
                      color: o.paymentStatus === "paid" ? A.green2 : o.paymentStatus === "refunded" ? A.gold : o.paymentStatus === "failed" ? A.red : o.paymentStatus === "pending_verification" ? A.gold : A.muted,
                      border: `1px solid ${A.border}`, textTransform: "capitalize",
                    }}>{o.paymentStatus === "pending_verification" ? "Needs Review" : o.paymentStatus}</span>
                    {o.paymentProofUrl && o.paymentStatus === "pending_verification" && (
                      <span style={{ display: "block", fontFamily: F.sans, fontSize: "0.65rem", color: A.gold, marginTop: 2 }}>📎 Proof uploaded</span>
                    )}
                  </td>
                  <td className="p-4" onClick={e => e.stopPropagation()}>
                    <select value={o.status} onChange={e => changeStatus(o.id, e.target.value)}
                      style={{ fontSize: "0.75rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: STATUS[o.status]?.color ?? A.muted, padding: "4px 8px", outline: "none" }}>
                      {allStatuses.filter(s => s !== "all").map(s => <option key={s} value={s}>{STATUS[s]?.label ?? s}</option>)}
                    </select>
                  </td>
                  <td className="p-4" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => openDetail(o)} className="p-1.5 hover:opacity-70"><Eye size={13} color={A.gold} /></button>
                      <button onClick={() => toast.info("Invoice print coming soon!")} className="p-1.5 hover:opacity-70"><Printer size={13} color={A.muted} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ACard>

      {/* Order Detail Panel */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60]" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setDetail(null)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 z-[65] overflow-y-auto flex flex-col"
              style={{ width: "min(480px,100vw)", backgroundColor: A.card2, borderLeft: `1px solid ${A.border}` }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${A.border}` }}>
                <div>
                  <p style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.25em", color: A.muted, textTransform: "uppercase" }}>Order</p>
                  <p style={{ fontFamily: F.serif, fontSize: "1.1rem", color: A.gold }}>{detail.orderNumber}</p>
                </div>
                <button onClick={() => setDetail(null)}><X size={20} color={A.muted} /></button>
              </div>

              <div className="p-5 space-y-5 flex-1">
                <div className="flex justify-between items-start">
                  <ABadge status={detail.status} />
                  <p style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted }}>{detail.date}</p>
                </div>

                {[
                  { label: "Customer",  val: detail.customer },
                  { label: "Phone",     val: detail.phone },
                  { label: "Address",   val: `${detail.address}, ${detail.city}, ${detail.province}` },
                  { label: "Payment",   val: detail.payment },
                  { label: "Payment Status", val: detail.paymentStatus === "pending_verification" ? "Needs Review" : detail.paymentStatus },
                  { label: "Items",     val: `${detail.items} item(s)` },
                  { label: "Total",     val: `Rs. ${detail.total.toLocaleString()}` },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between py-2" style={{ borderBottom: `1px solid ${A.border}` }}>
                    <span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted }}>{label}</span>
                    <span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.text, textAlign: "right", maxWidth: "60%" }}>{val}</span>
                  </div>
                ))}

                {/* Manual payment verification — JazzCash/Easypaisa proof review */}
                {detail.paymentProofUrl && (
                  <div className="p-4" style={{ backgroundColor: A.bg, border: `1px solid ${A.border}` }}>
                    <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 8 }}>
                      Payment Proof
                    </label>
                    {detail.paymentReference && (
                      <p style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.text, marginBottom: 8 }}>
                        Reference: <span style={{ color: A.gold }}>{detail.paymentReference}</span>
                      </p>
                    )}
                    <a href={detail.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                      <img src={detail.paymentProofUrl} alt="Payment screenshot" className="w-full mb-3" style={{ maxHeight: 260, objectFit: "contain", border: `1px solid ${A.border}` }} />
                    </a>
                    {detail.paymentStatus === "pending_verification" && (
                      <div className="flex gap-2">
                        <ABtn size="sm" disabled={verifying} onClick={() => handleVerifyPayment(true)}>
                          <Check size={12} /> Approve Payment
                        </ABtn>
                        <ABtn variant="ghost" size="sm" disabled={verifying} onClick={() => handleVerifyPayment(false)}>
                          <X size={12} /> Reject
                        </ABtn>
                      </div>
                    )}
                    {detail.paymentStatus === "paid" && (
                      <p style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.green2 }}>✓ Verified and approved</p>
                    )}
                    {detail.paymentStatus === "failed" && (
                      <p style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.red }}>✕ Rejected</p>
                    )}
                  </div>
                )}

                {/* Order items (real) */}
                {detailItems.length > 0 && (
                  <div>
                    <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 6 }}>Order Items</label>
                    <div className="space-y-2">
                      {detailItems.map(it => (
                        <div key={it.id} className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${A.border}` }}>
                          <span style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.text }}>{it.product_name} × {it.quantity}</span>
                          <span style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.gold }}>Rs. {Number(it.subtotal).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline (real) */}
                {detailTimeline.length > 0 && (
                  <div>
                    <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 6 }}>Timeline</label>
                    <div className="space-y-2">
                      {detailTimeline.map(t => (
                        <div key={t.id} className="flex justify-between py-1">
                          <span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.text }}>{STATUS[t.status]?.label ?? t.status}{t.note ? ` — ${t.note}` : ""}</span>
                          <span style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}>{new Date(t.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Update status */}
                <div>
                  <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 6 }}>Update Status</label>
                  <select value={detail.status} onChange={e => changeStatus(detail.id, e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", fontSize: "0.84rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text, outline: "none" }}>
                    {allStatuses.filter(s => s !== "all").map(s => <option key={s} value={s}>{STATUS[s]?.label ?? s}</option>)}
                  </select>
                </div>

                {/* Admin note */}
                <div>
                  <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 6 }}>Admin Note</label>
                  <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3}
                    className="w-full outline-none resize-none"
                    style={{ padding: "8px 12px", fontSize: "0.84rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text }} />
                  <ABtn size="sm" className="mt-2" disabled={savingNote} onClick={saveNote}>
                    <Save size={12} /> {savingNote ? "Saving..." : "Save Note"}
                  </ABtn>
                </div>
              </div>

              <div className="p-5 flex gap-3" style={{ borderTop: `1px solid ${A.border}` }}>
                <ABtn size="sm" onClick={() => toast.info("Invoice print coming soon!")}><Printer size={12} /> Print Invoice</ABtn>
                <ABtn variant="ghost" size="sm" onClick={() => toast.info("Track shipment opening...")}><Truck size={12} /> Track</ABtn>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Admin Customers ──────────────────────────────────────────────────────────
export function AdminCustomers() {
  const [customers, setCustomers] = useState<AdminCustomerType[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search,    setSearch]    = useState("");
  const [profile,   setProfile]   = useState<AdminCustomer | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = customers
    .filter(c => filterStatus === "all" || c.status === filterStatus)
    .filter(c => `${c.name} ${c.email} ${c.city}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    fetchAdminCustomers()
      .then(setCustomers)
      .catch((err: any) => toast.error(err.message || "Failed to load customers"))
      .finally(() => setLoading(false));
  }, []);

  // Note: block/unblock and VIP toggling below are local-only (visual) for now —
  // your backend has no `is_blocked`/`is_vip` columns yet. Real persistence is a
  // quick follow-up once you want it (a one-column migration + one endpoint).
  const toggleBlock = (id: string) => {
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, status: c.status === "blocked" ? "active" : "blocked" } : c));
    toast.info("Customer status updated");
  };
  const toggleVIP = (id: string) => {
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, vip: !c.vip } : c));
  };

 if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: A.muted, fontFamily: F.sans }}>Loading customers...</div>;
  }

  return (
    <div>
      <AHead title="Customers" sub={`${customers.length} registered customers`} />

      <div className="flex flex-wrap gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, city..." />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", fontSize: "0.84rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text, outline: "none" }}>
          <option value="all">All Customers</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <ACard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${A.border}` }}>
                {["Customer","Contact","Location","Orders","Total Spent","Points","Status","Actions"].map(h => (
                  <th key={h} className="p-4 text-left" style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-white/3 transition-colors cursor-pointer" style={{ borderBottom: `1px solid ${A.border}` }}
                  onClick={() => setProfile(c)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{ backgroundColor: "rgba(201,168,76,0.12)", color: A.gold, fontFamily: F.serif }}>
                        {c.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.ivory, fontWeight: 600 }}>{c.name}</p>
                          {c.vip && <span style={{ fontSize: "0.6rem", color: A.gold, border: `1px solid ${A.gold}`, padding: "1px 4px", fontFamily: F.sans }}>VIP</span>}
                        </div>
                        <p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}>Since {c.joined}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.text }}>{c.email}</p>
                    <p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}>{c.phone}</p>
                  </td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.82rem", color: A.muted }}>{c.city}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.text, fontWeight: 600 }}>{c.orders}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.serif, fontSize: "0.9rem", color: A.gold }}>Rs. {c.spent.toLocaleString()}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.text }}>{c.points}</span></td>
                  <td className="p-4"><ABadge status={c.status} /></td>
                  <td className="p-4" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => toggleVIP(c.id)} className="p-1.5 hover:opacity-70" title={c.vip ? "Remove VIP" : "Make VIP"}>
                        <Award size={13} color={c.vip ? A.gold : A.muted} />
                      </button>
                      <button onClick={() => toggleBlock(c.id)} className="p-1.5 hover:opacity-70" title={c.status === "blocked" ? "Unblock" : "Block"}>
                        {c.status === "blocked" ? <CheckCircle size={13} color={A.green2} /> : <XCircle size={13} color={A.red} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ACard>

      {/* Customer Profile Modal */}
      <AModal open={!!profile} onClose={() => setProfile(null)} title="Customer Profile" wide>
        {profile && (
          <div>
            <div className="flex items-center gap-4 mb-6 pb-5" style={{ borderBottom: `1px solid ${A.border}` }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0"
                style={{ backgroundColor: "rgba(201,168,76,0.15)", color: A.gold, fontFamily: F.serif }}>
                {profile.name[0]}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 style={{ fontFamily: F.serif, fontSize: "1.3rem", color: A.ivory }}>{profile.name}</h3>
                  {profile.vip && <span style={{ fontSize: "0.65rem", color: A.gold, border: `1px solid ${A.gold}`, padding: "2px 6px", fontFamily: F.sans }}>VIP</span>}
                  <ABadge status={profile.status} />
                </div>
                <p style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.muted }}>Member since {profile.joined}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              {[
                { l: "Email",       v: profile.email },
                { l: "Phone",       v: profile.phone },
                { l: "Location",    v: `${profile.city}, ${profile.province}` },
                { l: "Reward Points", v: `${profile.points} pts` },
              ].map(({ l, v }) => (
                <div key={l}>
                  <p style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, marginBottom: 3 }}>{l}</p>
                  <p style={{ fontFamily: F.sans, fontSize: "0.88rem", color: A.text }}>{v}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              {[{ n: profile.orders, l: "Orders" }, { n: `Rs. ${profile.spent.toLocaleString()}`, l: "Total Spent" }, { n: profile.points, l: "Points" }].map(({ n, l }) => (
                <div key={l} className="p-4 text-center" style={{ backgroundColor: A.bg, border: `1px solid ${A.border}` }}>
                  <p style={{ fontFamily: F.serif, fontSize: "1.4rem", fontWeight: 700, color: A.gold }}>{n}</p>
                  <p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}>{l}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <ABtn size="sm" onClick={() => toggleVIP(profile.id)}>
                <Award size={12} /> {profile.vip ? "Remove VIP" : "Make VIP"}
              </ABtn>
              <ABtn variant={profile.status === "blocked" ? "secondary" : "danger"} size="sm" onClick={() => { toggleBlock(profile.id); setProfile(null); }}>
                {profile.status === "blocked" ? "Unblock" : "Block Customer"}
              </ABtn>
              <ABtn variant="ghost" size="sm" onClick={() => setProfile(null)}>Close</ABtn>
            </div>
          </div>
        )}
      </AModal>
    </div>
  );
}

// ─── Admin Marketing ──────────────────────────────────────────────────────────
export function AdminMarketing() {
  const [coupons, setCoupons]   = useState<CouponType[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editC, setEditC]       = useState<CouponType | null>(null);
  const [flashSale, setFlashSale] = useState(true);
  const [form, setForm] = useState({ code: "", type: "percent" as "percent" | "fixed", discount: 0, maxUses: 100, expiry: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetchCoupons()
      .then(setCoupons)
      .catch((err: any) => toast.error(err.message || "Failed to load coupons"))
      .finally(() => setLoadingCoupons(false));
  }, []);

  const save = async () => {
    if (!form.code) { toast.error("Code is required"); return; }
    setSaving(true);
    try {
      const input = {
        code: form.code,
        type: form.type,
        discount: form.discount,
        maxUses: form.maxUses || null,
        expiry: form.expiry || null,
        status: (editC?.status ?? "active") as "active" | "draft" | "inactive",
      };
      if (editC) {
        const updated = await updateCouponApi(editC.id, input);
        setCoupons(cs => cs.map(c => c.id === editC.id ? updated : c));
        toast.success("Coupon updated!");
      } else {
        const created = await createCouponApi(input);
        setCoupons(cs => [created, ...cs]);
        toast.success("Coupon created!");
      }
      setShowForm(false);
      setForm({ code: "", type: "percent", discount: 0, maxUses: 100, expiry: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteCouponApi(id);
      setCoupons(cs => cs.filter(c => c.id !== id));
      toast.info("Coupon deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete coupon");
    } finally {
      setDeleteId(null);
    }
  };

  const inp2: React.CSSProperties = { width: "100%", padding: "8px 12px", fontSize: "0.84rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text, outline: "none" };

  return (
    <div>
      <AHead title="Marketing" sub="Coupons, flash sales, and promotions" />

      {/* Flash Sale Toggle */}
      <ACard className="p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={18} color={A.gold} />
            <div>
              <p style={{ fontFamily: F.sans, fontSize: "0.9rem", fontWeight: 600, color: A.ivory }}>Flash Sale Banner</p>
              <p style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted }}>Show countdown banner on the storefront</p>
            </div>
          </div>
          <button onClick={() => { setFlashSale(!flashSale); toast.info(flashSale ? "Flash sale banner disabled" : "Flash sale banner enabled!"); }}
            className="w-11 h-6 rounded-full transition-all relative"
            style={{ backgroundColor: flashSale ? A.gold : A.border }}>
            <div className="w-5 h-5 rounded-full absolute top-0.5 transition-all"
              style={{ left: flashSale ? "calc(100% - 22px)" : 2, backgroundColor: "white" }} />
          </button>
        </div>
      </ACard>

      {/* Coupons */}
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontFamily: F.serif, fontSize: "1.1rem", color: A.ivory }}>Coupon Codes</h3>
        <ABtn size="sm" onClick={() => { setEditC(null); setForm({ code: "", type: "percent", discount: 0, maxUses: 100, expiry: "" }); setShowForm(true); }}>
          <Plus size={13} /> Add Coupon
        </ABtn>
      </div>

      <ACard className="overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${A.border}` }}>
                {["Code","Discount","Type","Uses","Max Uses","Expiry","Status","Actions"].map(h => (
                  <th key={h} className="p-4 text-left" style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingCoupons ? (
                <tr><td colSpan={8} className="p-6 text-center" style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.muted }}>Loading coupons...</td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center" style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.muted }}>No coupons yet.</td></tr>
              ) : coupons.map(c => (
                <tr key={c.id} className="hover:bg-white/3 transition-colors" style={{ borderBottom: `1px solid ${A.border}` }}>
                  <td className="p-4"><code style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.82rem", color: A.gold, fontWeight: 700 }}>{c.code}</code></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.88rem", color: A.ivory, fontWeight: 600 }}>{c.type === "percent" ? `${c.discount}%` : `Rs. ${c.discount}`}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted, textTransform: "capitalize" }}>{c.type}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.text }}>{c.uses}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.text }}>{c.maxUses ?? "—"}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted }}>{c.expiry ?? "—"}</span></td>
                  <td className="p-4"><ABadge status={c.status} /></td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditC(c); setForm({ code: c.code, type: c.type, discount: c.discount, maxUses: c.maxUses ?? 100, expiry: c.expiry ?? "" }); setShowForm(true); }}
                        className="p-1.5 hover:opacity-70"><Edit2 size={13} color={A.gold} /></button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 hover:opacity-70"><Trash2 size={13} color={A.red} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ACard>

      {/* Newsletter stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[{ l: "Subscribers", v: "342", icon: Mail, color: A.blue }, { l: "Email Opens", v: "68%", icon: Eye, color: A.green2 }, { l: "Click Rate", v: "24%", icon: TrendingUp, color: A.gold }].map(({ l, v, icon: Icon, color }) => (
          <KPICard key={l} label={l} value={v} icon={Icon} color={color} />
        ))}
      </div>

      {/* Coupon Form */}
      <AModal open={showForm} onClose={() => setShowForm(false)} title={editC ? "Edit Coupon" : "Add Coupon"}>
        <div className="space-y-4">
          {[["Coupon Code *", "code", "text"], ["Discount Value *", "discount", "number"], ["Max Uses", "maxUses", "number"], ["Expiry Date", "expiry", "text"]].map(([label, key, type]) => (
            <div key={key}>
              <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted,display: "block", marginBottom: 4 }}>{label}</label>
              <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? +e.target.value : e.target.value.toUpperCase() }))} style={inp2} placeholder={key === "expiry" ? "2026-07-31" : ""} />
            </div>
          ))}
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as "percent" | "fixed" }))} style={{ ...inp2, width: "100%" }}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed Amount (Rs.)</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <ABtn onClick={save} disabled={saving}><Save size={13} /> {saving ? "Saving..." : editC ? "Update" : "Create"}</ABtn>
          <ABtn variant="ghost" onClick={() => setShowForm(false)}>Cancel</ABtn>
        </div>
      </AModal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) remove(deleteId); }}
        title="Delete Coupon" message="Delete this coupon code? It will no longer be usable by customers." />
    </div>
  );
}

// ─── Admin Content ────────────────────────────────────────────────────────────
export function AdminContent() {
  const [faqs, setFaqs]         = useState(ADMIN_FAQS);
  const [testimonials]          = useState(ADMIN_TESTIMONIALS);
  const [faqForm, setFaqForm]   = useState({ id: "", question: "", answer: "" });
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editFaq, setEditFaq]   = useState<typeof ADMIN_FAQS[0] | null>(null);
  const [tab, setTab]           = useState("faqs");

  const saveFaq = () => {
    if (!faqForm.question || !faqForm.answer) { toast.error("Fill all fields"); return; }
    if (editFaq) {
      setFaqs(fs => fs.map(f => f.id === editFaq.id ? { ...f, question: faqForm.question, answer: faqForm.answer } : f));
      toast.success("FAQ updated!");
    } else {
      setFaqs(fs => [...fs, { id: `f${Date.now()}`, question: faqForm.question, answer: faqForm.answer, status: "active" }]);
      toast.success("FAQ added!");
    }
    setShowFaqModal(false);
  };

  const inp2: React.CSSProperties = { width: "100%", padding: "8px 12px", fontSize: "0.84rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text, outline: "none" };

  return (
    <div>
      <AHead title="Content Management" sub="FAQs, testimonials, and blog" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: `1px solid ${A.border}` }}>
        {["faqs", "testimonials", "blog"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2.5 text-xs uppercase tracking-widest capitalize transition-all border-b-2 -mb-px"
            style={{ borderColor: tab === t ? A.gold : "transparent", color: tab === t ? A.gold : A.muted, fontFamily: F.sans }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "faqs" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.muted }}>{faqs.length} FAQs</p>
            <ABtn size="sm" onClick={() => { setEditFaq(null); setFaqForm({ id: "", question: "", answer: "" }); setShowFaqModal(true); }}>
              <Plus size={13} /> Add FAQ
            </ABtn>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <ACard key={f.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span style={{ fontFamily: F.serif, fontSize: "1.1rem", color: A.gold, flexShrink: 0 }}>{i + 1}.</span>
                  <div className="flex-1">
                    <p style={{ fontFamily: F.sans, fontSize: "0.88rem", fontWeight: 600, color: A.ivory, marginBottom: 4 }}>{f.question}</p>
                    <p style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.muted, lineHeight: 1.6 }}>{f.answer}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditFaq(f); setFaqForm({ id: f.id, question: f.question, answer: f.answer }); setShowFaqModal(true); }}
                      className="p-1.5 hover:opacity-70"><Edit2 size={13} color={A.gold} /></button>
                    <button onClick={() => { setFaqs(fs => fs.filter(x => x.id !== f.id)); toast.info("FAQ removed"); }}
                      className="p-1.5 hover:opacity-70"><Trash2 size={13} color={A.red} /></button>
                  </div>
                </div>
              </ACard>
            ))}
          </div>
        </div>
      )}

      {tab === "testimonials" && (
        <div className="space-y-3">
          {testimonials.map(t => (
            <ACard key={t.id} className="p-4 flex items-start gap-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                style={{ backgroundColor: "rgba(201,168,76,0.12)", color: A.gold, fontFamily: F.serif }}>
                {t.name[0]}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p style={{ fontFamily: F.sans, fontSize: "0.86rem", fontWeight: 600, color: A.ivory }}>{t.name}</p>
                  <p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}>{t.city}</p>
                  <ABadge status={t.status} />
                </div>
                <div className="flex gap-0.5 mb-1">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={11} fill={A.gold} color={A.gold} />)}
                </div>
                <p style={{ fontFamily: F.sans, fontSize: "0.82rem", color: A.muted, fontStyle: "italic" }}>"{t.text}"</p>
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 hover:opacity-70" onClick={() => toast.success("Testimonial approved!")}><Check size={13} color={A.green2} /></button>
                <button className="p-1.5 hover:opacity-70" onClick={() => toast.info("Testimonial hidden")}><X size={13} color={A.red} /></button>
              </div>
            </ACard>
          ))}
        </div>
      )}

      {tab === "blog" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.muted }}>3 blog posts</p>
            <ABtn size="sm" onClick={() => toast.info("Blog editor coming soon!")}><Plus size={13} /> New Post</ABtn>
          </div>
          <div className="space-y-3">
            {[
              { title: "5 Benefits of Botanical Soap for Daily Skincare", date: "Jun 20, 2026", status: "published", views: 412 },
              { title: "How to Build a Natural Skincare Routine for Pakistani Skin", date: "Jun 10, 2026", status: "published", views: 289 },
              { title: "Neem vs Tea Tree: Which is Better for Acne?", date: "Jun 1, 2026", status: "draft", views: 0 },
            ].map(p => (
              <ACard key={p.title} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: F.sans, fontSize: "0.86rem", color: A.ivory, fontWeight: 600 }}>{p.title}</p>
                  <p style={{ fontFamily: F.sans, fontSize: "0.72rem", color: A.muted }}>{p.date} · {p.views} views</p>
                </div>
                <ABadge status={p.status} />
                <div className="flex gap-1">
                  <button className="p-1.5 hover:opacity-70" onClick={() => toast.info("Blog editor coming soon!")}><Edit2 size={13} color={A.gold} /></button>
                  <button className="p-1.5 hover:opacity-70" onClick={() => toast.info("Post deleted")}><Trash2 size={13} color={A.red} /></button>
                </div>
              </ACard>
            ))}
          </div>
        </div>
      )}

      <AModal open={showFaqModal} onClose={() => setShowFaqModal(false)} title={editFaq ? "Edit FAQ" : "Add FAQ"}>
        <div className="space-y-4">
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Question *</label>
            <input value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))} style={inp2} placeholder="Enter the question..." />
          </div>
          <div>
            <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 4 }}>Answer *</label>
            <textarea value={faqForm.answer} onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))} rows={4} style={{ ...inp2, resize: "none" }} placeholder="Enter the answer..." />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <ABtn onClick={saveFaq}><Save size={13} /> {editFaq ? "Update" : "Add"} FAQ</ABtn>
          <ABtn variant="ghost" onClick={() => setShowFaqModal(false)}>Cancel</ABtn>
        </div>
      </AModal>
    </div>
  );
}

// ─── Admin Reports ────────────────────────────────────────────────────────────
export function AdminReports() {
  const [products, setProducts] = useState<AdminProductType[]>([]);
  const [stats, setStats] = useState<DashboardStatsType | null>(null);
  const [customers, setCustomers] = useState<AdminCustomerType[]>([]);
  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => {});
    fetchDashboardStats().then(setStats).catch(() => {});
    fetchAdminCustomers().then(setCustomers).catch(() => {});
  }, []);
  const [range, setRange] = useState("14d");
  // NOTE: the range selector currently only affects this label — the backend's
  // revenueByDay is a fixed trailing-14-day window. Wiring 7d/30d/all to a real
  // date-ranged query is a bigger backend change than this pass covers; flagged
  // separately rather than left silently broken.
  const revenueByDay = stats?.revenueByDay ?? [];
  const totalRev  = stats?.totalRevenue ?? 0;
  const totalOrds = stats?.totalOrders ?? 0;
  const avgOrder  = totalOrds > 0 ? Math.round(totalRev / totalOrds) : 0;

  return (
    <div>
      <AHead title="Reports & Analytics" sub="Sales, orders, and revenue insights"
        action={
          <div className="flex gap-2">
            <ABtn variant="ghost" size="sm" onClick={() => toast.info("PDF export coming soon!")}><FileDown size={13} /> PDF</ABtn>
            <ABtn variant="ghost" size="sm" onClick={() => toast.info("Excel export coming soon!")}><FileSpreadsheet size={13} /> Excel</ABtn>
            <ABtn variant="ghost" size="sm" onClick={() => toast.info("CSV export coming soon!")}><Download size={13} /> CSV</ABtn>
          </div>
        } />

      {/* Range selector */}
      <div className="flex gap-2 mb-6">
        {[["7d","7 Days"],["14d","14 Days"],["30d","30 Days"],["all","All Time"]].map(([v, l]) => (
          <button key={v} onClick={() => setRange(v)}
            className="px-3 py-1.5 text-xs uppercase tracking-widest transition-all"
            style={{ backgroundColor: range === v ? A.gold : "transparent", color: range === v ? A.green : A.muted, border: `1px solid ${range === v ? A.gold : A.border}`, fontFamily: F.sans }}>
            {l}
          </button>
        ))}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Revenue"    value={`Rs. ${totalRev.toLocaleString()}`} icon={DollarSign} trend="up" trendVal="+12%"  color={A.gold} />
        <KPICard label="Total Orders"     value={String(totalOrds)}                   icon={ShoppingBag} trend="up" trendVal="+8%"  color={A.blue} />
        <KPICard label="Avg Order Value"  value={`Rs. ${avgOrder.toLocaleString()}`}  icon={TrendingUp}  trend="up" trendVal="+4%"  color={A.teal} />
        <KPICard label="Customers"        value={String(customers.length)}            icon={Users}       trend="up" trendVal="+5"   color={A.green2} />
      </div>

      {/* Revenue chart */}
      <ACard className="p-5 mb-6">
        <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 16 }}>Revenue Overview</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={revenueByDay}>
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={A.gold} stopOpacity={0.3} />
                <stop offset="95%" stopColor={A.gold} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={A.border} />
            <XAxis dataKey="date" tick={{ fontFamily: F.sans, fontSize: 10, fill: A.muted }} />
            <YAxis tick={{ fontFamily: F.sans, fontSize: 10, fill: A.muted }} />
            <Tooltip contentStyle={{ backgroundColor: A.card2, border: `1px solid ${A.border}`, fontFamily: F.sans, fontSize: "0.78rem" }} labelStyle={{ color: A.gold }} />
            <Area type="monotone" dataKey="revenue" stroke={A.gold} strokeWidth={2} fill="url(#rg)" name="Revenue (Rs.)" />
          </AreaChart>
        </ResponsiveContainer>
      </ACard>

      {/* Orders chart + devices */}
      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <ACard className="p-5">
          <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 12 }}>Orders per Day</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueByDay.slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" stroke={A.border} />
              <XAxis dataKey="date" tick={{ fontFamily: F.sans, fontSize: 10, fill: A.muted }} />
              <YAxis tick={{ fontFamily: F.sans, fontSize: 10, fill: A.muted }} />
              <Tooltip contentStyle={{ backgroundColor: A.card2, border: `1px solid ${A.border}`, fontFamily: F.sans, fontSize: "0.78rem" }} labelStyle={{ color: A.gold }} />
              <Bar dataKey="orders" fill={A.gold} name="Orders" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ACard>

        <ACard className="p-5">
          <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 12 }}>Traffic Sources</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={TRAFFIC_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={A.border} />
              <XAxis type="number" tick={{ fontFamily: F.sans, fontSize: 10, fill: A.muted }} />
              <YAxis dataKey="source" type="category" tick={{ fontFamily: F.sans, fontSize: 11, fill: A.muted }} width={60} />
              <Tooltip contentStyle={{ backgroundColor: A.card2, border: `1px solid ${A.border}`, fontFamily: F.sans, fontSize: "0.78rem" }} />
              <Bar dataKey="visitors" fill={A.teal} name="Visitors" radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ACard>
      </div>

      {/* Top products table */}
      <ACard className="p-5">
        <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 12 }}>Top Products</h3>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${A.border}` }}>
              {["Product","SKU","Units Sold","Revenue","Stock"].map(h => (
                <th key={h} className="py-3 px-2 text-left" style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${A.border}` }}>
                <td className="py-3 px-2"><span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.ivory }}>{p.name} {p.subtitle}</span></td>
                <td className="py-3 px-2"><code style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.75rem", color: A.muted }}>{p.sku}</code></td>
                <td className="py-3 px-2"><span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.text }}>{p.sold}</span></td>
                <td className="py-3 px-2"><span style={{ fontFamily: F.serif, fontSize: "0.9rem", color: A.gold }}>Rs. {(p.sold * p.price).toLocaleString()}</span></td>
                <td className="py-3 px-2"><span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: p.stock < 20 ? A.amber : A.green2 }}>{p.stock}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </ACard>
    </div>
  );
}

// ─── Admin Settings ───────────────────────────────────────────────────────────
export function AdminSettings() {
  const [store, setStore]       = useState({ name: "Arwa Botaniqs", email: "arwabotanicss@gmail.com", phone: "+92 371 4537622", address: "Faisalabad, Pakistan", currency: "PKR", language: "English" });
  const [shipping, setShipping] = useState({ rate: 300, minFree: 5000, days: "2-4" });
  const [savingShipping, setSavingShipping] = useState(false);
  useEffect(() => { fetchShippingSettings().then(s => setShipping({ rate: s.rate, minFree: s.minFree ?? 0, days: s.days })).catch(() => {}); }, []);
  const saveShipping = async () => {
    setSavingShipping(true);
    try {
      await updateShippingSettingsApi(shipping);
      toast.success("Shipping settings saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save shipping settings");
    } finally {
      setSavingShipping(false);
    }
  };
  const [maintenance, setMaintenance] = useState(false);
  const [payments, setPayments] = useState({ cod: true, jazzcash: true, easypaisa: true, visa: true });
  const [tab, setTab]           = useState("store");

  const inp2: React.CSSProperties = { width: "100%", padding: "9px 12px", fontSize: "0.84rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text, outline: "none" };
  const labelStyle: React.CSSProperties = { fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 5 };

  return (
    <div>
      <AHead title="Store Settings" sub="Manage your store configuration" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {["store","shipping","payments","maintenance"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-shrink-0 px-4 py-2 text-xs uppercase tracking-widest capitalize transition-all border-b-2 -mb-px"
            style={{ borderColor: tab === t ? A.gold : "transparent", color: tab === t ? A.gold : A.muted, fontFamily: F.sans }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <ACard className="p-6">
          <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 20 }}>Store Information</h3>

          {/* Logo upload */}
          <div className="mb-5">
            <label style={labelStyle}>Store Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 flex items-center justify-center" style={{ backgroundColor: A.gold }}>
                <span style={{ fontFamily: F.serif, fontWeight: 700, fontSize: "1rem", color: A.green }}>AB</span>
              </div>
              <ABtn variant="ghost" size="sm" onClick={() => toast.info("Logo upload — backend required")}><Upload size={12} /> Upload Logo</ABtn>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[["Store Name", "name"],["Support Email","email"],["Phone","phone"],["Address","address"],["Currency","currency"],["Language","language"]].map(([label,key]) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input value={(store as any)[key]} onChange={e => setStore(s => ({ ...s, [key]: e.target.value }))} style={inp2} />
              </div>
            ))}
          </div>
          <ABtn className="mt-5" onClick={() => toast.success("Store settings saved!")}><Save size={13} /> Save Changes</ABtn>
        </ACard>
      )}

      {tab === "shipping" && (
        <ACard className="p-6">
          <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 20 }}>Shipping Configuration</h3>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            {[["Shipping Rate (Rs.)","rate","number"],["Free Shipping Above (Rs.)","minFree","number"],["Delivery Days","days","text"]].map(([label,key,type]) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input type={type} value={(shipping as any)[key]} onChange={e => setShipping(s => ({ ...s, [key]: type === "number" ? +e.target.value : e.target.value }))} style={inp2} />
              </div>
            ))}
          </div>
          <ABtn onClick={saveShipping} disabled={savingShipping}><Save size={13} /> {savingShipping ? "Saving..." : "Save"}</ABtn>
        </ACard>
      )}

      {tab === "payments" && (
        <ACard className="p-6">
          <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 20 }}>Payment Methods</h3>
          <div className="space-y-4">
            {[["Cash on Delivery","cod","💵"],["JazzCash","jazzcash","📱"],["EasyPaisa","easypaisa","🟢"],["Visa / Mastercard","visa","💳"]].map(([label,key,icon]) => (
              <div key={key} className="flex items-center justify-between p-4" style={{ backgroundColor: A.bg, border: `1px solid ${A.border}` }}>
                <div className="flex items-center gap-3"><span className="text-xl">{icon}</span><span style={{ fontFamily: F.sans, fontSize: "0.88rem", color: A.text }}>{label}</span></div>
                <button onClick={() => setPayments(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                  className="w-10 h-5.5 rounded-full transition-all relative" style={{ backgroundColor: payments[key as keyof typeof payments] ? A.gold : A.border, width: 40, height: 22 }}>
                  <div className="w-4 h-4 rounded-full absolute top-1 transition-all" style={{ left: payments[key as keyof typeof payments] ? "calc(100% - 18px)" : 2, backgroundColor: "white" }} />
                </button>
              </div>
            ))}
          </div>
          <ABtn className="mt-5" onClick={() => toast.success("Payment settings saved!")}><Save size={13} /> Save</ABtn>
        </ACard>
      )}

      {tab === "maintenance" && (
        <ACard className="p-6">
          <h3 style={{ fontFamily: F.serif, fontSize: "1rem", color: A.ivory, marginBottom: 20 }}>Maintenance Mode</h3>
          <div className="flex items-center justify-between p-5 mb-4" style={{ backgroundColor: maintenance ? "rgba(239,68,68,0.08)" : A.bg, border: `1px solid ${maintenance ? "rgba(239,68,68,0.35)" : A.border}` }}>
            <div>
              <p style={{ fontFamily: F.sans, fontSize: "0.9rem", fontWeight: 600, color: maintenance ? A.red : A.ivory }}>
                Maintenance Mode is {maintenance ? "ON" : "OFF"}
              </p>
              <p style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted, marginTop: 3 }}>When enabled, the storefront shows a maintenance page to visitors.</p>
            </div>
            <button onClick={() => { setMaintenance(!maintenance); toast.info(maintenance ? "Maintenance mode disabled" : "Maintenance mode enabled!"); }}
              className="w-10 rounded-full transition-all relative" style={{ backgroundColor: maintenance ? A.red : A.border, height: 22, width: 40 }}>
              <div className="w-4 h-4 rounded-full absolute top-1 transition-all" style={{ left: maintenance ? "calc(100% - 18px)" : 2, backgroundColor: "white" }} />
            </button>
          </div>
          <div className="p-4" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: `1px solid rgba(245,158,11,0.25)` }}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} color={A.amber} className="flex-shrink-0 mt-0.5" />
              <p style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.amber, lineHeight: 1.65 }}>Enabling maintenance mode will make the storefront inaccessible to customers. Admin panel remains accessible.</p>
            </div>
          </div>
        </ACard>
      )}
    </div>
  );
}

// ─── Admin Support ────────────────────────────────────────────────────────────
export function AdminSupport() {
  const [tickets, setTickets] = useState(ADMIN_TICKETS);
  const [filter,  setFilter]  = useState("all");
  const [detail,  setDetail]  = useState<typeof ADMIN_TICKETS[0] | null>(null);
  const [reply,   setReply]   = useState("");
  const [search,  setSearch]  = useState("");

  const filtered = tickets
    .filter(t => filter === "all" || t.status === filter)
    .filter(t => `${t.id} ${t.customer} ${t.subject}`.toLowerCase().includes(search.toLowerCase()));

  const priorityColor = (p: string) => p === "high" ? A.red : p === "medium" ? A.amber : A.muted;

  return (
    <div>
      <AHead title="Support Center" sub={`${tickets.filter(t => t.status !== "resolved").length} open tickets`} />

      <div className="flex flex-wrap gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tickets..." />
        <div className="flex gap-1">
          {["all","open","in-progress","resolved"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 text-xs uppercase tracking-widest capitalize transition-all"
              style={{ backgroundColor: filter === s ? A.gold : "transparent", color: filter === s ? A.green : A.muted, border: `1px solid ${filter === s ? A.gold : A.border}`, fontFamily: F.sans }}>
              {s === "all" ? "All" : STATUS[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      <ACard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${A.border}` }}>
                {["Ticket ID","Customer","Subject","Priority","Date","Status","Actions"].map(h => (
                  <th key={h} className="p-4 text-left" style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-white/3 transition-colors cursor-pointer" style={{ borderBottom: `1px solid ${A.border}` }}
                  onClick={() => { setDetail(t); setReply(""); }}>
                  <td className="p-4"><code style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.78rem", color: A.gold }}>{t.id}</code></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.ivory }}>{t.customer}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.82rem", color: A.muted }}>{t.subject}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: priorityColor(t.priority), textTransform: "capitalize" }}>{t.priority}</span></td>
                  <td className="p-4"><span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted }}>{t.date}</span></td>
                  <td className="p-4"><ABadge status={t.status} /></td>
                  <td className="p-4">
                    <button onClick={e => { e.stopPropagation(); setTickets(ts => ts.map(x => x.id === t.id ? { ...x, status: "resolved" } : x)); toast.success("Ticket resolved!"); }}
                      className="p-1.5 hover:opacity-70" disabled={t.status === "resolved"}><CheckCircle size={13} color={t.status === "resolved" ? A.muted : A.green2} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ACard>

      <AModal open={!!detail} onClose={() => setDetail(null)} title={detail?.id || "Ticket"}>
        {detail && (
          <div>
            <div className="space-y-3 mb-5">
              {[["Customer", detail.customer], ["Subject", detail.subject], ["Date", detail.date], ["Priority", detail.priority]].map(([l, v]) => (
                <div key={l} className="flex justify-between py-2" style={{ borderBottom: `1px solid ${A.border}` }}>
                  <span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted }}>{l}</span>
                  <span style={{ fontFamily: F.sans, fontSize: "0.84rem", color: A.text, textTransform: "capitalize" }}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${A.border}` }}>
                <span style={{ fontFamily: F.sans, fontSize: "0.78rem", color: A.muted }}>Status</span>
                <ABadge status={detail.status} />
              </div>
            </div>
            <div>
              <label style={{ fontFamily: F.sans, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: A.muted, display: "block", marginBottom: 6 }}>Reply</label>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4} placeholder="Type your reply..."
                className="w-full outline-none resize-none"
                style={{ padding: "8px 12px", fontSize: "0.84rem", fontFamily: F.sans, backgroundColor: A.bg, border: `1px solid ${A.border}`, color: A.text }} />
              <div className="flex gap-2 mt-3">
                <ABtn size="sm" onClick={() => { toast.success("Reply sent!"); setDetail(null); }}>Send Reply</ABtn>
                <ABtn variant="secondary" size="sm" onClick={() => { setTickets(ts => ts.map(x => x.id === detail.id ? { ...x, status: "resolved" } : x)); toast.success("Ticket resolved!"); setDetail(null); }}>
                  <CheckCircle size={12} /> Mark Resolved
                </ABtn>
              </div>
            </div>
          </div>
        )}
      </AModal>
    </div>
  );
}

// ─── Admin Notifications ──────────────────────────────────────────────────────
export function AdminNotifications() {
  const navigate = useNavigate();
  const { adminNotifications, adminUnreadCount, markAdminNotifRead, markAllAdminNotifsRead, deleteAdminNotif } = useStore();

  return (
    <div>
      <AHead title="Notifications" sub={`${adminUnreadCount} unread notifications`}
        action={
          <div className="flex gap-2">
            <ABtn variant="ghost" size="sm" onClick={markAllAdminNotifsRead}><Check size={12} /> Mark All Read</ABtn>
          </div>
        } />

      {adminNotifications.length === 0 ? (
        <ACard className="p-12 text-center">
          <Bell size={40} color={A.muted} style={{ margin: "0 auto 12px" }} />
          <p style={{ fontFamily: F.sans, fontSize: "0.88rem", color: A.muted }}>No notifications</p>
        </ACard>
      ) : (
        <div className="space-y-3">
          {adminNotifications.map(n => {
            const Icon = adminNotifIcon(n.type);
            return (
              <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
                <ACard className="p-4 flex items-start gap-4 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ borderColor: n.is_read ? A.border : "rgba(201,168,76,0.35)", backgroundColor: n.is_read ? A.card : "rgba(201,168,76,0.05)" }}
                  onClick={() => { markAdminNotifRead(n.id); if (n.link) navigate(n.link); }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: n.is_read ? A.bg : "rgba(201,168,76,0.15)" }}>
                    <Icon size={16} color={n.is_read ? A.muted : A.gold} />
                  </div>
                  <div className="flex-1">
                    <p style={{ fontFamily: F.sans, fontSize: "0.86rem", fontWeight: n.is_read ? 400 : 600, color: A.ivory }}>{n.title}</p>
                    <p style={{ fontFamily: F.sans, fontSize: "0.8rem", color: A.muted, lineHeight: 1.6, marginTop: 2 }}>{n.message}</p>
                    <p style={{ fontFamily: F.sans, fontSize: "0.7rem", color: "rgba(245,240,232,0.3)", marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!n.is_read && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: A.gold }} />}
                    <button onClick={e => { e.stopPropagation(); deleteAdminNotif(n.id); }}
                      className="p-1 hover:opacity-60 transition-opacity"><X size={13} color={A.muted} /></button>
                  </div>
                </ACard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

