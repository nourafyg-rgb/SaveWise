import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import futureFundRouter from "./future-fund";
import rewardsRouter from "./rewards";
import savewiseRouter from "./savewise";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(savewiseRouter);
router.use(futureFundRouter);
router.use(rewardsRouter);

export default router;
