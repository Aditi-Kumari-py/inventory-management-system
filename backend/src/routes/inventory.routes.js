import { Router } from "express";

import {
  createPurchase,
  createSale,
   publishEvent,
   getInventoryOverview,
  getTransactionLedger,
} from "../controllers/inventory.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/purchase", requireAuth, createPurchase);
router.post("/sale", requireAuth, createSale);
router.post("/events", requireAuth, publishEvent);
router.get("/overview", requireAuth, getInventoryOverview);
router.get("/ledger", requireAuth, getTransactionLedger);
export default router;