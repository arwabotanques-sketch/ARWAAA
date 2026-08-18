import { updateProfileApi, changePasswordApi, uploadProfilePictureApi, removeProfilePictureApi } from "../api/profile";
import { fetchAddresses, addAddressApi, updateAddressApi, deleteAddressApi, setDefaultAddressApi, type Address } from "../api/addresses";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, type Notification as NotificationType } from "../api/notifications";
import { useState, useEffect } from "react";
import { fetchMyOrders, type MyOrder } from "../api/myOrders";
import { Outlet, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useStore } from "../store";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { C, FadeIn, StarRating, GoldLine } from "../shared";
import {
  LayoutDashboard, User, ShoppingBag, Heart, MapPin, CreditCard, Bell,
  Gift, Tag, Users, Settings, HelpCircle, LogOut, ChevronRight, Menu, X,
  Eye, EyeOff, Edit2, Plus, Trash2, Check, Copy, Share2, Star,
  Package, Truck, RotateCcw, Award, TrendingUp, Download,
} from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_COUPONS = [
  { code: "ARWA10", discount: 10, type: "percent" as const, expiry: "July 31, 2026", uses: 3, maxUses: 5 },
  { code: "WELCOME", discount: 15, type: "percent" as const, expiry: "July 15, 2026", uses: 0, maxUses: 1 },
  { code: "BOTANIQ20", discount: 20, type: "percent" as const, expiry: "Aug 1, 2026", uses: 1, maxUses: 3 },
];

const MOCK_POINTS_HISTORY = [
  { id: "1", action: "Purchase — ARW-241567", pts: +50, date: "July 1, 2026", type: "earn" as const },
  { id: "2", action: "Welcome Bonus",         pts: +100, date: "June 15, 2026", type: "earn" as const },
  { id: "3", action: "Purchase — ARW-189034", pts: +50, date: "June 15, 2026", type: "earn" as const },
  { id: "4", action: "Redeemed for Discount", pts: -150, date: "June 10, 2026", type: "redeem" as const },
  { id: "5", action: "Referral Bonus",         pts: +50, date: "June 3, 2026", type: "earn" as const },
  { id: "6", action: "Purchase — ARW-156789", pts: +100, date: "June 3, 2026", type: "earn" as const },
];

const STATUS_COLORS: Record<string, string> = {
  delivered: "#22c55e",
  shipped:   "#3b82f6",
  packed:    "#f59e0b",
  placed:    C.gold,
  cancelled: "#d4183d",
};

// ─── Sidebar links ────────────────────────────────────────────────────────────
const SIDEBAR_LINKS = [
  { label: "Dashboard",        href: "/dashboard",                icon: LayoutDashboard },
  { label: "My Profile",       href: "/dashboard/profile",        icon: User },
  { label: "My Orders",        href: "/dashboard/orders",         icon: ShoppingBag },
  { label: "My Wishlist",      href: "/dashboard/wishlist",       icon: Heart },
  { label: "Addresses",        href: "/dashboard/addresses",      icon: MapPin },
  { label: "Payment Methods",  href: "/dashboard/payments",       icon: CreditCard },
  { label: "Notifications",    href: "/dashboard/notifications",  icon: Bell },
  { label: "Reward Points",    href: "/dashboard/rewards",        icon: Award },
  { label: "My Coupons",       href: "/dashboard/coupons",        icon: Tag },
  { label: "Referrals",        href: "/dashboard/referrals",      icon: Users },
  { label: "Account Settings", href: "/dashboard/settings",       icon: Settings },
  { label: "Support",          href: "/dashboard/support",        icon: HelpCircle },
];

// ─── Dashboard Layout ─────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const { user, isAuthenticated, customerAuthLoading, logout } = useStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Still asking the backend "is this cookie still valid?" — don't flash the
  // sign-in screen while that's in flight, or every refresh looks like a logout.
  if (customerAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.ivory }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full animate-spin" style={{ border: `3px solid rgba(26,61,43,0.15)`, borderTopColor: C.green }} />
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: C.muted }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center pt-20 px-4" style={{ backgroundColor: C.ivory }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(201,168,76,0.1)", border: `1px solid ${C.gold}` }}>
          <User size={28} color={C.gold} />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", color: C.green, marginBottom: 8 }}>Please Sign In</h2>
        <p style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted, marginBottom: 24 }}>You need to be signed in to access your dashboard.</p>
        <button onClick={() => navigate("/auth/login")} className="px-8 py-3 text-sm uppercase tracking-widest"
          style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Sign In</button>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* User card */}
      <div className="p-5 mb-2" style={{ borderBottom: `1px solid rgba(201,168,76,0.15)` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'Playfair Display',serif", fontSize: "1.1rem" }}>
            {user.name[0]}
          </div>
          <div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600, color: C.ivory }}>{user.name}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "rgba(245,240,232,0.45)" }}>{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 px-2 py-1.5" style={{ backgroundColor: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.2)` }}>
          <Award size={13} color={C.gold} />
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: C.gold, fontWeight: 600 }}>{user.points} Reward Points</span>
        </div>
      </div>

      {/* Links */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {SIDEBAR_LINKS.map(({ label, href, icon: Icon }) => {
          const active = location.pathname === href;
          return (
            <button key={href} onClick={() => { navigate(href); setMobileOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-left transition-all duration-200"
              style={{ backgroundColor: active ? "rgba(201,168,76,0.15)" : "transparent", borderLeft: active ? `2px solid ${C.gold}` : "2px solid transparent", color: active ? C.gold : "rgba(245,240,232,0.65)" }}>
              <Icon size={16} />
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem" }}>{label}</span>
              {active && <ChevronRight size={13} className="ml-auto" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3" style={{ borderTop: `1px solid rgba(201,168,76,0.15)` }}>
        <button onClick={() => { logout(); navigate("/"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 transition-colors"
          style={{ color: "#f87171", fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem" }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen pt-24" style={{ backgroundColor: C.ivory }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 fixed left-0 top-10 sm:top-16 bottom-0 z-30" style={{ backgroundColor: C.green, borderRight: `1px solid rgba(201,168,76,0.15)` }}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="mob-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[50] md:hidden" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setMobileOpen(false)} />
            <motion.aside key="mob-side" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.28 }}
              className="fixed left-0 top-0 bottom-0 z-[55] w-64 md:hidden flex flex-col" style={{ backgroundColor: C.green }}>
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1"><X size={20} color={C.ivory} /></button>
              <div className="mt-12"><SidebarContent /></div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <main className="flex-1 md:ml-60 min-h-screen">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-16 z-20" style={{ backgroundColor: C.cream, borderBottom: `1px solid rgba(201,168,76,0.2)` }}>
          <button onClick={() => setMobileOpen(true)}><Menu size={20} color={C.green} /></button>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", color: C.green }}>My Account</span>
        </div>
        <div className="p-5 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// ─── Page heading ─────────────────────────────────────────────────────────────
function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <GoldLine w={24} />
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: C.green }}>{title}</h1>
      </div>
      {sub && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.muted }}>{sub}</p>}
    </div>
  );
}

// ─── Dashboard Home ───────────────────────────────────────────────────────────
export function DashboardHome() {
  const { user, wishlistCount } = useStore();
  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState<MyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    fetchMyOrders()
      .then(setRecentOrders)
      .catch(() => toast.error("Couldn't load your recent orders."))
      .finally(() => setOrdersLoading(false));
  }, []);

  const stats = [
    { label: "Total Orders",    value: recentOrders.length, icon: ShoppingBag, color: C.green,  href: "/dashboard/orders" },
    { label: "Reward Points",   value: user?.points || 0,  icon: Award,       color: C.gold,   href: "/dashboard/rewards" },
    { label: "Wishlist Items",  value: wishlistCount,       icon: Heart,       color: "#d4183d", href: "/dashboard/wishlist" },
    { label: "Active Coupons",  value: MOCK_COUPONS.length, icon: Tag,         color: "#3b82f6", href: "/dashboard/coupons" },
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="p-6 mb-8 relative overflow-hidden" style={{ backgroundColor: C.green, border: `1px solid rgba(201,168,76,0.2)` }}>
        <div className="sun absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 80% 50%, rgba(201,168,76,0.12) 0%, transparent 60%)` }} />
        <div className="relative z-10">
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: C.gold, marginBottom: 6 }}>Welcome back</p>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 700, color: C.ivory }}>Hello, {user?.name?.split(" ")[0]}! 🌿</h2>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "rgba(245,240,232,0.55)", marginTop: 4 }}>Member since {user?.joinDate} · {user?.points} reward points available</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <FadeIn key={label}>
            <button onClick={() => navigate(href)} className="w-full p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
              <div className="w-9 h-9 flex items-center justify-center mb-3" style={{ backgroundColor: `${color}15` }}>
                <Icon size={18} color={color} />
              </div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: C.green }}>{value}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted }}>{label}</p>
            </button>
          </FadeIn>
        ))}
      </div>

      {/* Recent orders */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: C.green }}>Recent Orders</h3>
          <button onClick={() => navigate("/dashboard/orders")} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.gold }} className="hover:opacity-70">View all →</button>
        </div>
        <div className="space-y-3">
          {ordersLoading ? (
            [0, 1].map(i => <div key={i} className="h-16 animate-pulse" style={{ backgroundColor: "rgba(26,61,43,0.06)" }} />)
          ) : recentOrders.length === 0 ? (
            <div className="p-6 text-center" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.18)` }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: C.muted }}>No orders yet — your first order will show up here.</p>
              <button onClick={() => navigate("/shop")} className="mt-3 text-xs uppercase tracking-widest hover:opacity-70" style={{ color: C.gold, fontFamily: "'DM Sans',sans-serif" }}>Start Shopping →</button>
            </div>
          ) : (
            recentOrders.slice(0, 2).map(order => (
            <div key={order.id} className="flex items-center justify-between p-4" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.18)` }}>
              <div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600, color: C.green }}>{order.id}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: C.muted }}>{order.date} · Rs. {order.total.toLocaleString()}</p>
              </div>
              <span className="px-2.5 py-1 text-xs" style={{ backgroundColor: `${STATUS_COLORS[order.status]}18`, color: STATUS_COLORS[order.status], fontFamily: "'DM Sans',sans-serif", border: `1px solid ${STATUS_COLORS[order.status]}40` }}>
                {order.status === "cancelled" && order.paymentStatus === "refunded" ? "Refunded" : order.statusLabel}
              </span>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: C.green, marginBottom: 16 }}>Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Shop Now",     icon: ShoppingBag, href: "/shop" },
            { label: "Skin Quiz",    icon: TrendingUp,  href: "/quiz" },
            { label: "AI Assistant", icon: HelpCircle,  href: "/ai" },
            { label: "Invite Friend", icon: Users,      href: "/dashboard/referrals" },
          ].map(({ label, icon: Icon, href }) => (
            <button key={label} onClick={() => navigate(href)} className="flex flex-col items-center gap-2 p-4 hover:bg-[rgba(201,168,76,0.08)] transition-colors"
              style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
              <Icon size={20} color={C.gold} />
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.green }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

export function DashboardProfile() {
  const { user, updateUser } = useStore();
  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState(user?.name || "");
  const [email,   setEmail]   = useState(user?.email || "");
  const [phone,   setPhone]   = useState(user?.phone || "");
  const [dob,     setDob]     = useState(user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "");
  const [gender,  setGender]  = useState(user?.gender || "");
  const [showPw,  setShowPw]  = useState(false);
  const [oldPw,   setOldPw]   = useState("");
  const [newPw,   setNewPw]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);

  const save = async () => {
    const [first_name, ...rest] = name.trim().split(" ");
    const last_name = rest.join(" ") || "-";
    setSaving(true);
    try {
      const updated = await updateProfileApi(first_name, last_name, email, phone, dob || null, gender || null);
      updateUser({
        name: `${updated.first_name} ${updated.last_name}`.trim(),
        email: updated.email,
        phone: updated.phone || "",
        dateOfBirth: updated.date_of_birth || null,
        gender: updated.gender || null,
      });
      setEditing(false);
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!oldPw || !newPw) { toast.error("Both password fields are required."); return; }
    if (newPw.length < 6) { toast.error("New password must be at least 6 characters."); return; }
    setChangingPw(true);
    try {
      await changePasswordApi(oldPw, newPw);
      toast.success("Password changed!");
      setOldPw(""); setNewPw("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setChangingPw(false);
    }
  };

  const handlePictureSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    setUploadingPic(true);
    try {
      const updated = await uploadProfilePictureApi(file);
      updateUser({ profilePicture: updated.profile_picture || null });
      toast.success("Profile picture updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload profile picture.");
    } finally {
      setUploadingPic(false);
      e.target.value = "";
    }
  };

  const handlePictureRemove = async () => {
    setUploadingPic(true);
    try {
      const updated = await removeProfilePictureApi();
      updateUser({ profilePicture: updated.profile_picture || null });
      toast.info("Profile picture removed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove profile picture.");
    } finally {
      setUploadingPic(false);
    }
  };

  const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", fontSize: "0.88rem", outline: "none", border: `1px solid rgba(26,61,43,0.2)`, backgroundColor: "transparent", color: C.green, fontFamily: "'DM Sans',sans-serif" };
  const lbl: React.CSSProperties = { fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: 6 };

  return (
    <div>
      <PageHead title="My Profile" sub="Manage your personal information" />

      {/* Avatar */}
      <div className="flex items-center gap-5 mb-8 p-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
        <div className="relative w-16 h-16 flex-shrink-0">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl"
              style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'Playfair Display',serif" }}>
              {user?.name[0]}
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: C.green, border: `2px solid ${C.cream}`, opacity: uploadingPic ? 0.6 : 1 }}>
            <Edit2 size={11} color={C.ivory} />
            <input type="file" accept="image/*" className="hidden" disabled={uploadingPic} onChange={handlePictureSelect} />
          </label>
        </div>
        <div>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, color: C.green }}>{user?.name}</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: C.muted }}>Member since {user?.joinDate}</p>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Award size={13} color={C.gold} />
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.gold }}>{user?.points} points</span>
            </div>
            {user?.profilePicture && (
              <button onClick={handlePictureRemove} disabled={uploadingPic} className="text-xs hover:opacity-60" style={{ color: "#d4183d", fontFamily: "'DM Sans',sans-serif" }}>
                Remove photo
              </button>
            )}
          </div>
        </div>
        <button onClick={() => setEditing(!editing)} className="ml-auto flex items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-widest"
          style={{ backgroundColor: editing ? C.green : "transparent", color: editing ? C.ivory : C.green, border: `1px solid ${editing ? C.green : "rgba(26,61,43,0.25)"}`, fontFamily: "'DM Sans',sans-serif" }}>
          <Edit2 size={12} /> {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* Profile fields */}
      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        {[["Full Name", name, setName], ["Email Address", email, setEmail], ["Phone Number", phone, setPhone]].map(([label, val, set]) => (
          <div key={label as string}>
            <label style={lbl}>{label as string}</label>
            <input disabled={!editing} value={val as string} onChange={e => (set as any)(e.target.value)} style={{ ...inp, backgroundColor: editing ? "transparent" : "rgba(26,61,43,0.03)", opacity: editing ? 1 : 0.75 }} />
          </div>
        ))}
        <div>
          <label style={lbl}>Date of Birth</label>
          <input type="date" disabled={!editing} value={dob} onChange={e => setDob(e.target.value)} style={{ ...inp, backgroundColor: editing ? "transparent" : "rgba(26,61,43,0.03)", opacity: editing ? 1 : 0.75 }} />
        </div>
        <div>
          <label style={lbl}>Gender</label>
          <select disabled={!editing} value={gender} onChange={e => setGender(e.target.value)} style={{ ...inp, backgroundColor: editing ? "transparent" : "rgba(26,61,43,0.03)", opacity: editing ? 1 : 0.75 }}>
            {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
      </div>

      {editing && (
        <button onClick={save} disabled={saving} className="px-8 py-3 text-sm uppercase tracking-widest mb-8" style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      )}

      {/* Change password */}
      <div className="pt-6" style={{ borderTop: `1px solid rgba(201,168,76,0.2)` }}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: C.green, marginBottom: 16 }}>Change Password</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label style={lbl}>Current Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={oldPw} onChange={e => setOldPw(e.target.value)} style={{ ...inp, paddingRight: 36 }} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPw ? <EyeOff size={14} color={C.muted} /> : <Eye size={14} color={C.muted} />}
              </button>
            </div>
          </div>
          <div>
            <label style={lbl}>New Password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={inp} placeholder="••••••••" />
          </div>
        </div>
        <button onClick={savePassword} disabled={changingPw} className="mt-4 px-6 py-2.5 text-sm uppercase tracking-widest"
          style={{ backgroundColor: "transparent", border: `1px solid rgba(26,61,43,0.3)`, color: C.green, fontFamily: "'DM Sans',sans-serif", opacity: changingPw ? 0.6 : 1 }}>
          {changingPw ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}

// ─── My Orders ────────────────────────────────────────────────────────────────
export function DashboardOrders() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [allOrders, setAllOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyOrders()
      .then(setAllOrders)
      .catch((err: any) => toast.error(err.message || "Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  const filters = ["all", "pending", "processing", "packed", "shipped", "delivered", "cancelled"];
  const orders = filter === "all" ? allOrders : allOrders.filter(o => o.status === filter);

  if (loading) {
    return (
      <div>
        <PageHead title="My Orders" sub="Track and manage your orders" />
        <div className="space-y-4">
          {[0, 1, 2].map(i => <div key={i} className="h-28 animate-pulse" style={{ backgroundColor: "rgba(26,61,43,0.06)" }} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHead title="My Orders" sub="Track and manage your orders" />

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className="flex-shrink-0 px-4 py-2 text-xs uppercase tracking-widest capitalize transition-all"
            style={{ backgroundColor: filter === f ? C.green : "transparent", color: filter === f ? C.ivory : C.green, border: `1px solid ${filter === f ? C.green : "rgba(26,61,43,0.25)"}`, fontFamily: "'DM Sans',sans-serif" }}>
            {f}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16"><Package size={48} color="rgba(201,168,76,0.3)" className="mx-auto mb-4" /><p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: C.green }}>No orders found</p></div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="p-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.18)` }}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase", color: C.muted }}>Order ID</p>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: C.green }}>{order.id}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted }}>Placed on {order.date}</p>
                </div>
                <span className="px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${STATUS_COLORS[order.status]}15`, color: STATUS_COLORS[order.status], border: `1px solid ${STATUS_COLORS[order.status]}40`, fontFamily: "'DM Sans',sans-serif" }}>
                  {order.status === "cancelled" && order.paymentStatus === "refunded" ? "Refunded" : order.statusLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-4" style={{ borderTop: `1px solid rgba(201,168,76,0.15)` }}>
                <div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted }}>Total</p>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: C.green }}>Rs. {order.total.toLocaleString()}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => navigate(`/track/${order.id}`)} className="flex items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-widest"
                    style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>
                    <Truck size={12} /> Track
                  </button>
                  <button onClick={() => toast.info("Invoice download coming soon!")} className="flex items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-widest border"
                    style={{ borderColor: "rgba(26,61,43,0.25)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
                    <Download size={12} /> Invoice
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export function DashboardWishlist() {
  const { wishlist, toggleWishlist, addToCart, products } = useStore();
  const navigate = useNavigate();
  const wishedProducts = products.filter(p => wishlist.has(p.id));

  return (
    <div>
      <PageHead title="My Wishlist" sub={`${wishedProducts.length} saved item${wishedProducts.length !== 1 ? "s" : ""}`} />
      {wishedProducts.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={48} color="rgba(201,168,76,0.3)" className="mx-auto mb-4" />
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: C.green, marginBottom: 8 }}>Your wishlist is empty</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", color: C.muted, marginBottom: 20 }}>Save products you love to your wishlist.</p>
          <button onClick={() => navigate("/shop")} className="px-6 py-3 text-sm uppercase tracking-widest" style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Browse Shop</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {wishedProducts.map(p => (
            <div key={p.id} className="p-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
              <div className="aspect-square mb-4 flex items-center justify-center cursor-pointer overflow-hidden" style={{ backgroundColor: "#eee8da" }} onClick={() => navigate(`/products/${p.slug}`)}>
                {p.imageUrl ? (
                  <ImageWithFallback src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ fontFamily: "'Playfair Display',serif", color: C.muted }}>Arwa Botaniqs</span>
                )}
              </div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 600, color: C.green }}>{p.name} {p.subtitle}</p>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: C.green, marginTop: 4 }}>Rs. {p.price}</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => addToCart(p)} className="flex-1 py-2.5 text-xs uppercase tracking-widest" style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Add to Cart</button>
                <button onClick={() => toggleWishlist(p)} className="w-10 flex items-center justify-center border hover:border-[#d4183d] transition-colors" style={{ borderColor: "rgba(26,61,43,0.25)" }}>
                  <Trash2 size={14} color="#d4183d" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Addresses ────────────────────────────────────────────────────────────────
const EMPTY_ADDRESS_FORM = { label: "Home", name: "", phone: "", address: "", city: "", province: "", postal: "", country: "Pakistan", isDefault: false };

function AddressFormModal({ initial, onClose, onSaved }: { initial: Address | null; onClose: () => void; onSaved: (addr: Address) => void }) {
  const [form, setForm] = useState(
    initial
      ? { label: initial.label, name: initial.name, phone: initial.phone, address: initial.address, city: initial.city, province: initial.province, postal: initial.postal || "", country: initial.country || "Pakistan", isDefault: initial.is_default }
      : EMPTY_ADDRESS_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", fontSize: "0.88rem", outline: "none", border: `1px solid rgba(26,61,43,0.2)`, backgroundColor: "transparent", color: C.green, fontFamily: "'DM Sans',sans-serif" };
  const lbl: React.CSSProperties = { fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: 6 };

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.address || !form.city || !form.province || !form.country) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const payload = { label: form.label, name: form.name, phone: form.phone, address: form.address, city: form.city, province: form.province, postal: form.postal || null, country: form.country, isDefault: form.isDefault };
      const saved = initial
        ? await updateAddressApi(initial.id, payload)
        : await addAddressApi(payload);
      onSaved(saved);
      toast.success(initial ? "Address updated!" : "Address added!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" style={{ backgroundColor: C.ivory }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.25rem", color: C.green }}>{initial ? "Edit Address" : "Add New Address"}</h3>
            <button onClick={onClose}><X size={18} color={C.muted} /></button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label style={lbl}>Label</label>
              <select value={form.label} onChange={set("label")} style={inp}>
                <option value="Home">Home</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Full Name</label>
              <input value={form.name} onChange={set("name")} style={inp} placeholder="Recipient's full name" />
            </div>
            <div>
              <label style={lbl}>Phone Number</label>
              <input value={form.phone} onChange={set("phone")} style={inp} placeholder="+92 3XX XXXXXXX" />
            </div>
            <div>
              <label style={lbl}>Country</label>
              <input value={form.country} onChange={set("country")} style={inp} placeholder="Pakistan" />
            </div>
            <div className="sm:col-span-2">
              <label style={lbl}>Full Address</label>
              <input value={form.address} onChange={set("address")} style={inp} placeholder="House / Street / Area" />
            </div>
            <div>
              <label style={lbl}>City</label>
              <input value={form.city} onChange={set("city")} style={inp} placeholder="Lahore" />
            </div>
            <div>
              <label style={lbl}>Province / State</label>
              <input value={form.province} onChange={set("province")} style={inp} placeholder="Punjab" />
            </div>
            <div>
              <label style={lbl}>Postal Code</label>
              <input value={form.postal} onChange={set("postal")} style={inp} placeholder="54000 (optional)" />
            </div>
            <div className="flex items-center gap-2 sm:mt-6">
              <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
              <label htmlFor="isDefault" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.green }}>Set as default address</label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} disabled={saving} className="flex-1 px-6 py-3 text-sm uppercase tracking-widest"
              style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : initial ? "Save Changes" : "Add Address"}
            </button>
            <button onClick={onClose} className="px-6 py-3 text-sm uppercase tracking-widest border" style={{ borderColor: "rgba(26,61,43,0.25)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function DashboardAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);

  useEffect(() => {
    fetchAddresses().then(setAddresses).catch(() => toast.error("Failed to load addresses.")).finally(() => setLoading(false));
  }, []);

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddressApi(id);
      setAddresses(a => a.map(x => ({ ...x, is_default: x.id === id })));
      toast.success("Default address updated!");
    } catch { toast.error("Failed to update default address."); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAddressApi(id);
      setAddresses(a => a.filter(x => x.id !== id));
      toast.info("Address removed.");
    } catch { toast.error("Failed to remove address."); }
  };

  const handleAdded = (addr: Address) => {
    setAddresses(a => (addr.is_default ? a.map(x => ({ ...x, is_default: false })) : a).concat(addr));
  };

  const handleUpdated = (addr: Address) => {
    setAddresses(a => a.map(x => (x.id === addr.id ? addr : addr.is_default ? { ...x, is_default: false } : x)));
  };

  if (loading) {
    return (
      <div>
        <PageHead title="Saved Addresses" sub="Manage your delivery addresses" />
        <div className="grid sm:grid-cols-2 gap-5">
          {[0, 1].map(i => <div key={i} className="h-40 animate-pulse" style={{ backgroundColor: "rgba(26,61,43,0.06)" }} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHead title="Saved Addresses" sub="Manage your delivery addresses" />

      {addresses.length === 0 && (
        <div className="p-8 text-center mb-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: C.muted }}>You haven't saved any addresses yet.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        {addresses.map(addr => (
          <div key={addr.id} className="p-5 relative" style={{ backgroundColor: C.cream, border: `2px solid ${addr.is_default ? C.gold : "rgba(201,168,76,0.18)"}` }}>
            {addr.is_default && <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] uppercase" style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif" }}>Default</span>}
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase", color: C.gold, marginBottom: 6 }}>{addr.label}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, color: C.green }}>{addr.name}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted, lineHeight: 1.6 }}>{addr.address}<br />{addr.city}, {addr.province} {addr.postal}<br />{addr.country}<br />{addr.phone}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditingAddr(addr)} className="text-xs px-3 py-1.5 border hover:border-[#c9a84c] transition-colors" style={{ borderColor: "rgba(26,61,43,0.25)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>Edit</button>
              {!addr.is_default && (
                <button onClick={() => handleSetDefault(addr.id)}
                  className="text-xs px-3 py-1.5 border hover:border-[#c9a84c] transition-colors" style={{ borderColor: "rgba(26,61,43,0.25)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
                  Set Default
                </button>
              )}
              <button onClick={() => handleDelete(addr.id)}
                className="ml-auto text-xs hover:opacity-60" style={{ color: "#d4183d", fontFamily: "'DM Sans',sans-serif" }}>Remove</button>
            </div>
          </div>
        ))}
        <button onClick={() => setAdding(true)} className="flex flex-col items-center justify-center p-8 border-dashed hover:border-[#c9a84c] transition-colors"
          style={{ border: `2px dashed rgba(201,168,76,0.3)`, color: C.muted, minHeight: 160 }}>
          <Plus size={24} color={C.gold} className="mb-2" />
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem" }}>Add New Address</span>
        </button>
      </div>

      {adding && <AddressFormModal initial={null} onClose={() => setAdding(false)} onSaved={handleAdded} />}
      {editingAddr && <AddressFormModal initial={editingAddr} onClose={() => setEditingAddr(null)} onSaved={handleUpdated} />}
    </div>
  );
}


// ─── Payment Methods ──────────────────────────────────────────────────────────
export function DashboardPayments() {
  return (
    <div>
      <PageHead title="Payment Methods" sub="Manage your saved payment methods (UI only)" />
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { label: "JazzCash",   icon: "📱", last4: null, color: "#e63946" },
          { label: "EasyPaisa",  icon: "🟢", last4: null, color: "#2ecc71" },
          { label: "Visa Card",  icon: "💳", last4: "4532", color: "#1a56db" },
          { label: "Cash on Delivery", icon: "💵", last4: null, color: C.green },
        ].map(m => (
          <div key={m.label} className="p-5 flex items-center gap-4" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.18)` }}>
            <span className="text-2xl">{m.icon}</span>
            <div className="flex-1">
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, color: C.green }}>{m.label}</p>
              {m.last4 && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: C.muted }}>•••• •••• •••• {m.last4}</p>}
            </div>
            <button onClick={() => toast.info("Payment methods integration coming soon!")} className="text-xs hover:opacity-60" style={{ color: C.muted, fontFamily: "'DM Sans',sans-serif" }}>Manage</button>
          </div>
        ))}
      </div>
      <button onClick={() => toast.info("Add payment method — backend coming soon!")} className="mt-4 flex items-center gap-2 px-5 py-2.5 text-sm uppercase tracking-widest border"
        style={{ borderColor: "rgba(26,61,43,0.25)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
        <Plus size={14} /> Add Payment Method
      </button>
    </div>
  );
}

function notifIcon(type: string) {
  if (type === "order") return Package;
  if (type === "promo") return Tag;
  if (type === "reward") return Award;
  return Bell;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function DashboardNotifications() {
  const [notifs, setNotifs] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications()
      .then(setNotifs)
      .catch(() => toast.error("Couldn't load notifications."))
      .finally(() => setLoading(false));
  }, []);

  const markAll = () => {
    setNotifs(n => n.map(x => ({ ...x, is_read: true })));
    markAllNotificationsRead().catch(() => toast.error("Couldn't mark all as read."));
  };

  const markOne = (id: string) => {
    setNotifs(prev => prev.map(x => x.id === id ? { ...x, is_read: true } : x));
    markNotificationRead(id).catch(() => {});
  };

  if (loading) {
    return (
      <div>
        <PageHead title="Notifications" sub="Loading..." />
        <div className="space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse" style={{ backgroundColor: "rgba(26,61,43,0.06)" }} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <PageHead title="Notifications" sub={`${notifs.filter(n => !n.is_read).length} unread`} />
        <button onClick={markAll} className="text-xs hover:opacity-70 mt-2" style={{ fontFamily: "'DM Sans',sans-serif", color: C.gold }}>Mark all read</button>
      </div>
      {notifs.length === 0 ? (
        <div className="p-8 text-center" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.18)` }}>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: C.muted }}>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map(n => {
            const Icon = notifIcon(n.type);
            return (
              <div key={n.id} onClick={() => markOne(n.id)}
                className="flex items-start gap-4 p-4 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: n.is_read ? C.cream : "rgba(201,168,76,0.06)", border: `1px solid ${n.is_read ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.35)"}` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: n.is_read ? "rgba(201,168,76,0.08)" : "rgba(201,168,76,0.18)" }}>
                  <Icon size={16} color={C.gold} />
                </div>
                <div className="flex-1">
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: n.is_read ? 400 : 600, color: C.green }}>{n.title}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: C.muted, lineHeight: 1.6 }}>{n.message}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "rgba(26,61,43,0.4)", marginTop: 4 }}>{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: C.gold }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Rewards ──────────────────────────────────────────────────────────────────
export function DashboardRewards() {
  const { user } = useStore();
  const balance  = user?.points || 250;
  const earned   = 400;
  const redeemed = 150;

  return (
    <div>
      <PageHead title="Reward Points" sub="Earn points with every purchase and redeem for discounts" />

      {/* Points summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[{ label: "Total Earned", value: earned, color: "#22c55e" }, { label: "Redeemed", value: redeemed, color: "#f59e0b" }, { label: "Available", value: balance, color: C.gold }].map(s => (
          <div key={s.label} className="p-5 text-center" style={{ backgroundColor: C.green, border: `1px solid rgba(201,168,76,0.2)` }}>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "rgba(245,240,232,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* How to earn */}
      <div className="mb-8 p-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: C.green, marginBottom: 12 }}>How to Earn Points</h3>
        <div className="space-y-3">
          {[["Every purchase", "Earn 1 point per Rs. 10 spent"], ["Write a review", "+25 points"], ["Refer a friend", "+50 points per referral"], ["Birthday bonus", "+100 points on your birthday"]].map(([a, b]) => (
            <div key={a} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.gold }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: C.green }}>{a} <span style={{ color: C.muted }}>— {b}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: C.green, marginBottom: 12 }}>Points History</h3>
      <div className="space-y-2">
        {MOCK_POINTS_HISTORY.map(h => (
          <div key={h.id} className="flex items-center justify-between p-3.5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.15)` }}>
            <div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.86rem", color: C.green }}>{h.action}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>{h.date}</p>
            </div>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: h.type === "earn" ? "#22c55e" : "#f87171" }}>
              {h.type === "earn" ? "+" : ""}{h.pts}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Coupons ──────────────────────────────────────────────────────────────────
export function DashboardCoupons() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success(`${code} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <PageHead title="My Coupons" sub="Your available discount codes" />
      <div className="grid sm:grid-cols-2 gap-5">
        {MOCK_COUPONS.map(c => (
          <div key={c.code} className="p-5 relative overflow-hidden" style={{ backgroundColor: C.cream, border: `2px dashed rgba(201,168,76,0.4)` }}>
            <div className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: C.gold }} />
            <div className="pl-4">
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", letterSpacing: "0.3em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>Discount Coupon</p>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: C.green }}>{c.discount}% OFF</p>
              <div className="flex items-center gap-2 my-3 px-3 py-2" style={{ backgroundColor: "rgba(201,168,76,0.08)", border: `1px dashed rgba(201,168,76,0.4)` }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "1rem", fontWeight: 700, color: C.green, flex: 1, letterSpacing: "0.2em" }}>{c.code}</span>
                <button onClick={() => copy(c.code)}>
                  {copied === c.code ? <Check size={15} color="#22c55e" /> : <Copy size={15} color={C.gold} />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>Expires: {c.expiry}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>Used: {c.uses}/{c.maxUses}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Referrals ────────────────────────────────────────────────────────────────
export function DashboardReferrals() {
  const { user } = useStore();
  const code     = "ARWA" + (user?.name?.slice(0, 4).toUpperCase() || "SKIN");
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <PageHead title="Referral Program" sub="Invite friends and earn reward points together" />

      {/* Referral card */}
      <div className="p-6 mb-8 text-center" style={{ backgroundColor: C.green, border: `1px solid rgba(201,168,76,0.2)` }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(201,168,76,0.15)" }}>
          <Users size={28} color={C.gold} />
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: C.gold }}>Your Referral Code</p>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "2rem", fontWeight: 700, color: C.ivory, letterSpacing: "0.2em", marginTop: 8, marginBottom: 16 }}>{code}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); toast.success("Code copied!"); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm uppercase tracking-widest"
            style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'DM Sans',sans-serif" }}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied!" : "Copy Code"}
          </button>
          <a href={`https://wa.me/?text=Use my Arwa Botaniqs referral code ${code} for exclusive discounts!`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 text-sm uppercase tracking-widest border"
            style={{ borderColor: "rgba(201,168,76,0.4)", color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>
            <Share2 size={14} /> Share
          </a>
        </div>
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-3 gap-5 mb-8">
        {[["1", "Share your code", "Send your unique referral code to friends and family."], ["2", "Friend purchases", "They make their first Arwa Botaniqs purchase."], ["3", "Both earn points", "You get 50 points, your friend gets 25 points!"]].map(([n, t, d]) => (
          <div key={n} className="p-5 text-center" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold mx-auto mb-3" style={{ backgroundColor: C.gold, color: C.green, fontFamily: "'Playfair Display',serif" }}>{n}</div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600, color: C.green, marginBottom: 4 }}>{t}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: C.muted, lineHeight: 1.6 }}>{d}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[{ label: "Friends Referred", value: "3" }, { label: "Points Earned", value: "150" }, { label: "Friends Joined", value: "3" }].map(s => (
          <div key={s.label} className="p-4 text-center" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.18)` }}>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: C.green }}>{s.value}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export function DashboardSettings() {
  const { logout } = useStore();
  const navigate   = useNavigate();
  const [prefs, setPrefs] = useState({ emailNotifs: true, smsNotifs: false, marketing: true, newsletter: true });
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div>
      <PageHead title="Account Settings" sub="Manage your preferences and account options" />

      {/* Notifications prefs */}
      <div className="mb-8 p-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: C.green, marginBottom: 16 }}>Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { key: "emailNotifs", label: "Order & delivery updates", sub: "Email notifications about your orders" },
            { key: "smsNotifs",   label: "SMS notifications",         sub: "Text messages for important updates" },
            { key: "marketing",   label: "Promotional offers",        sub: "Exclusive deals and special offers" },
            { key: "newsletter",  label: "Weekly newsletter",         sub: "Skincare tips and new launches" },
          ].map(({ key, label, sub }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: C.green }}>{label}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: C.muted }}>{sub}</p>
              </div>
              <button onClick={() => setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                className="w-10 h-5 rounded-full transition-all relative"
                style={{ backgroundColor: prefs[key as keyof typeof prefs] ? C.gold : "rgba(26,61,43,0.2)" }}>
                <div className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                  style={{ left: prefs[key as keyof typeof prefs] ? "calc(100% - 18px)" : 2, backgroundColor: "white" }} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => toast.success("Preferences saved!")} className="mt-5 px-6 py-2.5 text-sm uppercase tracking-widest"
          style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Save Preferences</button>
      </div>

      {/* Danger zone */}
      <div className="p-5" style={{ backgroundColor: "rgba(212,24,61,0.04)", border: `1px solid rgba(212,24,61,0.2)` }}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: "#d4183d", marginBottom: 12 }}>Danger Zone</h3>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm uppercase tracking-widest"
            style={{ backgroundColor: "transparent", border: `1px solid rgba(212,24,61,0.4)`, color: "#d4183d", fontFamily: "'DM Sans',sans-serif" }}>
            Delete Account
          </button>
        ) : (
          <div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.84rem", color: "#d4183d", marginBottom: 12 }}>
              Are you sure? This action cannot be undone. All your orders, points, and data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { logout(); navigate("/"); toast.info("Account deleted."); }} className="px-5 py-2.5 text-sm uppercase tracking-widest" style={{ backgroundColor: "#d4183d", color: "white", fontFamily: "'DM Sans',sans-serif" }}>Yes, Delete</button>
              <button onClick={() => setShowDelete(false)} className="px-5 py-2.5 text-sm border" style={{ borderColor: "rgba(26,61,43,0.25)", color: C.green, fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Support ──────────────────────────────────────────────────────────────────
export function DashboardSupport() {
  const [msg, setMsg]         = useState("");
  const [subject, setSubject] = useState("");
  const [sent, setSent]       = useState(false);
  const tickets = [
    { id: "TKT-001", subject: "Order delivery question", status: "Resolved", date: "June 20, 2026" },
  ];

  return (
    <div>
      <PageHead title="Support Center" sub="Get help with your orders and account" />

      {/* Contact options */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: "💬", label: "WhatsApp", sub: "+92 314 0628188", action: () => window.open("https://wa.me/923140628188") },
          { icon: "📧", label: "Email",    sub: "havkeddd@gmail.com", action: () => window.open("mailto:havkeddd@gmail.com") },
          { icon: "📞", label: "Call Us",  sub: "+92 314 0628188", action: () => window.open("tel:+923140628188") },
        ].map(({ icon, label, sub, action }) => (
          <button key={label} onClick={action} className="p-5 text-center hover:shadow-md transition-shadow"
            style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
            <span className="text-2xl block mb-2">{icon}</span>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, color: C.green }}>{label}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", color: C.muted }}>{sub}</p>
          </button>
        ))}
      </div>

      {/* Submit ticket */}
      <div className="mb-8 p-5" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.2)` }}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: C.green, marginBottom: 16 }}>Submit a Support Ticket</h3>
        {sent ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: C.gold }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p style={{ fontFamily: "'Playfair Display',serif", color: C.green }}>Ticket Submitted!</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: C.muted, marginTop: 4 }}>We will respond within 24 hours.</p>
            <button onClick={() => setSent(false)} className="mt-4 text-xs hover:opacity-60" style={{ color: C.muted, fontFamily: "'DM Sans',sans-serif" }}>Submit another</button>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); setSent(true); toast.success("Support ticket submitted!"); }} className="space-y-4">
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" required
              className="w-full px-4 py-2.5 text-sm outline-none"
              style={{ border: `1px solid rgba(26,61,43,0.2)`, backgroundColor: "transparent", color: C.green, fontFamily: "'DM Sans',sans-serif" }} />
            <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Describe your issue..." rows={4} required
              className="w-full px-4 py-2.5 text-sm outline-none resize-none"
              style={{ border: `1px solid rgba(26,61,43,0.2)`, backgroundColor: "transparent", color: C.green, fontFamily: "'DM Sans',sans-serif" }} />
            <button type="submit" className="px-6 py-2.5 text-sm uppercase tracking-widest"
              style={{ backgroundColor: C.green, color: C.ivory, fontFamily: "'DM Sans',sans-serif" }}>Submit Ticket</button>
          </form>
        )}
      </div>

      {/* Previous tickets */}
      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: C.green, marginBottom: 12 }}>Previous Tickets</h3>
      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} className="flex items-center justify-between p-4" style={{ backgroundColor: C.cream, border: `1px solid rgba(201,168,76,0.18)` }}>
            <div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600, color: C.green }}>{t.subject}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: C.muted }}>{t.id} · {t.date}</p>
            </div>
            <span className="px-2.5 py-1 text-xs" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", fontFamily: "'DM Sans',sans-serif" }}>{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
