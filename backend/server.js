import paymentRoutes from "./routes/paymentRoutes.js";
import { stripeWebhook } from "./controllers/paymentController.js"
import notificationRoutes from "./routes/notificationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import pool from "./config/db.js";
import { validateEnv } from "./utils/validateEnv.js";
import { notFoundHandler, globalErrorHandler } from "./middleware/errorHandler.js";
import { globalLimiter, authLimiter, orderLimiter } from "./middleware/rateLimiters.js";

import productRoutes from "./routes/productRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";

dotenv.config();
validateEnv();

const app = express();
app.set("trust proxy", 1);
const isProd = process.env.NODE_ENV === "production";

// ==========================
// Middleware
// ==========================

// Comma-separated list in production (e.g. "https://arwaa.pk,https://www.arwaa.pk"),
// falls back to localhost for local dev.
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        console.warn(`CORS blocked request from origin: ${origin}`);
        return callback(null, false); // deny cleanly, no 500, no server error
    },
    credentials: true,
}));

app.use(helmet({
    contentSecurityPolicy: isProd ? undefined : false, // avoid CSP breaking local dev tools; keep default strict CSP in prod
    crossOriginResourcePolicy: { policy: "cross-origin" }, // product images need to load on the frontend origin
}));

if (!isProd) app.use(morgan("dev")); // request logging only in dev — avoid noisy/verbose logs in prod
app.use(cookieParser());
app.use(globalLimiter);

// The Stripe webhook needs the RAW request body to verify its signature, so it
// must be mounted with express.raw() BEFORE the global express.json() parser
// below — otherwise the body would already be parsed/consumed as JSON and
// signature verification would fail.
app.post("/api/payments/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);

// ==========================
// Routes
// ==========================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "🚀 Arwa.pk Backend Running Successfully"
    });
});

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/orders", orderLimiter, orderRoutes);
app.use("/api/customers", authLimiter, userRoutes); // customer login/register also live under this router
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/newsletter", newsletterRoutes);

// ==========================
// 404 + Global Error Handling
// ==========================

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ==========================
// Database Connection
// ==========================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const db = await pool.query("SELECT current_database()");
console.log("Connected Database:", db.rows[0].current_database);

await pool.query("SELECT 1");
    console.log("✅ PostgreSQL Connected");

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Database Error:", err);
    process.exit(1);
  }
}

startServer();