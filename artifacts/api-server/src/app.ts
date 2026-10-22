import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import type { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";
import { optionalAuth } from "./middlewares/auth-session";

const app: Express = express();

function allowSameOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }

  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || req.get("host");
  try {
    if (requestHost && new URL(origin).host.toLowerCase() === requestHost.toLowerCase()) {
      next();
      return;
    }
  } catch {
    // An invalid Origin is rejected below.
  }
  res.status(403).json({ error: "Cross-origin requests are not allowed." });
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(allowSameOrigin);
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(optionalAuth);

app.use("/api", router);

export default app;
