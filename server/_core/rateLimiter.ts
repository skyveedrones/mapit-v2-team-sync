/**
 * API Rate Limiting Middleware
 * Implements per-user rate limiting based on subscription tier
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient, type RedisClientType } from 'redis';
import { getPlanLimits } from '../products';
import type { Request } from 'express';

let redisClient: RedisClientType | null = null;
let redisInitialized = false;
let redisInitializing = false;

/**
 * Initialize Redis client for rate limiting (non-blocking)
 * Starts connection in background without blocking server startup
 */
export function initializeRedisClient(): void {
  if (redisInitialized || redisInitializing) return;
  
  redisInitializing = true;
  
  // Start Redis connection in background without awaiting
  (async () => {
    try {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries: number) => Math.min(retries * 50, 500),
        },
      } as any);

      client.on('error', (err: any) => console.error('[Redis] Error:', err));
      client.on('connect', () => {
        console.log('[Redis] Connected');
        redisInitialized = true;
      });
      client.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

      await client.connect();
      redisClient = client as any;
      redisInitialized = true;
      console.log('[Redis] Client initialized successfully');
    } catch (error) {
      console.warn('[Redis] Failed to initialize, using in-memory rate limiting:', error);
      redisInitializing = false;
    }
  })();
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

/**
 * Check if Redis is ready
 */
export function isRedisReady(): boolean {
  return redisInitialized && redisClient !== null;
}

/**
 * Create a rate limiter for a specific tier
 */
function createTierLimiter(tier: string, limits: any) {
  const client = getRedisClient();

  if (!client) {
    // Fallback to in-memory store if Redis is not available
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: limits.apiCallsPerHour === -1 ? 1000000 : limits.apiCallsPerHour,
      message: `Too many API requests for ${tier} tier, please try again later`,
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  return rateLimit({
    store: new RedisStore({
      client: client,
      prefix: `rl:${tier}:`,
    } as any),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: limits.apiCallsPerHour === -1 ? 1000000 : limits.apiCallsPerHour,
    message: `Too many API requests for ${tier} tier, please try again later`,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: any) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/ping';
    },
  });
}

/**
 * Per-user rate limiter based on subscription tier
 */
export function createPerUserRateLimiter() {
  const limiters: Record<string, any> = {};

  // Pre-create limiters for each tier
  const tiers = ['free', 'starter', 'professional', 'business', 'enterprise'];
  for (const tier of tiers) {
    const limits = getPlanLimits(tier as any);
    limiters[tier] = createTierLimiter(tier, limits);
  }

  return (req: Request, res: any, next: any) => {
    // Get user's subscription tier from request context
    const tier = (req as any).user?.subscriptionTier || 'free';
    const limiter = limiters[tier] || limiters['free'];

    limiter(req, res, next);
  };
}

/**
 * File upload rate limiter (more restrictive)
 */
export function createUploadRateLimiter() {
  const redisClient = getRedisClient();

  if (!redisClient) {
    return rateLimit({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 100, // fallback max
      message: 'Too many file uploads, please try again tomorrow',
    });
  }

  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:upload:',
    } as any),
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: (req: any) => {
      const tier = (req as any).user?.subscriptionTier || 'free';
      const limits = getPlanLimits(tier as any);
      return limits.fileUploadsPerDay === -1 ? 10000 : limits.fileUploadsPerDay;
    },
    message: 'Daily upload limit exceeded, please try again tomorrow',
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * PDF export rate limiter
 */
export function createPdfExportRateLimiter() {
  const redisClient = getRedisClient();

  if (!redisClient) {
    return rateLimit({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 20, // fallback max
      message: 'Too many PDF exports, please try again tomorrow',
    });
  }

  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:pdf:',
    } as any),
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: (req: any) => {
      const tier = (req as any).user?.subscriptionTier || 'free';
      const limits = getPlanLimits(tier as any);
      return limits.pdfExportsPerDay === -1 ? 1000 : limits.pdfExportsPerDay;
    },
    message: 'Daily PDF export limit exceeded, please try again tomorrow',
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * Concurrent requests limiter
 */
export function createConcurrentRequestsLimiter() {
  const activeRequests: Record<number, number> = {};

  return (req: Request, res: any, next: any) => {
    const userId = (req as any).user?.id;
    if (!userId) return next();

    const tier = (req as any).user?.subscriptionTier || 'free';
    const limits = getPlanLimits(tier as any);
    const maxConcurrent = limits.concurrentRequests === -1 ? 1000 : limits.concurrentRequests;

    activeRequests[userId] = (activeRequests[userId] || 0) + 1;

    if (activeRequests[userId] > maxConcurrent) {
      activeRequests[userId]--;
      return res.status(429).json({
        error: 'Too many concurrent requests',
        message: `Maximum ${maxConcurrent} concurrent requests allowed for ${tier} tier`,
      });
    }

    // Decrement on response finish
    res.on('finish', () => {
      activeRequests[userId]--;
      if (activeRequests[userId] <= 0) {
        delete activeRequests[userId];
      }
    });

    next();
  };
}

/**
 * Close Redis client connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      console.error('[Redis] Error closing connection:', error);
    }
    redisClient = null;
    redisInitialized = false;
    redisInitializing = false;
  }
}
