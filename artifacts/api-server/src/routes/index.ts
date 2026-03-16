import { Router } from "express";
import healthRouter from "./health";
import playersRouter from "./players";
import matchesRouter from "./matches";

const router = Router();

router.use(healthRouter);
router.use(playersRouter);
router.use(matchesRouter);

export default router;
