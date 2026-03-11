import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { nowIso } from "../utils/time.js";

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || now >= existing.resetAt) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > options.maxRequests) {
      res.status(429).json({
        ok: false,
        message: "Rate limit exceeded. Please retry later."
      });
      return;
    }

    next();
  };
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers["x-request-id"];
  const requestId = typeof headerId === "string" && headerId.length > 0 ? headerId : randomUUID();
  res.setHeader("x-request-id", requestId);
  (req as Request & { requestId?: string }).requestId = requestId;
  next();
}

export function requestLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  const requestId = (req as Request & { requestId?: string }).requestId ?? "unknown";

  res.on("finish", () => {
    const latencyMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        timestamp: nowIso(),
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        latencyMs
      })
    );
  });
  next();
}
