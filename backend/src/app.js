import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://inventory-management-system-theta-seven.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      // Allows requests without an Origin header, such as curl.
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/inventory-management-system-[a-zA-Z0-9-]+\.vercel\.app$/.test(
          origin
        );

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use("/api/auth", authRoutes);app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Inventory Management API is running",
  });
});

export default app;
