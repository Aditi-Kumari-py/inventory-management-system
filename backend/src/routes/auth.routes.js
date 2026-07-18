import { Router } from "express";
import {
  healthCheck,
  login,
} from "../controllers/auth.controller.js";

const router = Router();

router.get("/health", healthCheck);
router.post("/login", login);

export default router;