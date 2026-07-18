import { Router } from "express";

import {
    createProduct,
    getProducts
} from "../controllers/product.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", requireAuth, createProduct);

router.get("/", requireAuth, getProducts);

export default router;