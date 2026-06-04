import { createClerkClient, verifyToken } from "@clerk/backend";
import type { Request } from "express";
import * as db from "../db";
import { ENV } from "./env";
import type { User } from "../../drizzle/schema";

const clerkClient = createClerkClient({ secretKey: ENV.clerkSecretKey });

/**
 * Authenticate an Express request via Clerk session token.
 * Returns the DB User or null if unauthenticated.
 */
export async function authenticateRequest(req: Request): Promise<User | null> {
  console.log('[Auth] clerkSecretKey length:', ENV.clerkSecretKey.length);
  try {
    // First try Clerk session cookie authentication.
    // Keep this isolated so a cookie parsing error does not skip bearer-token fallback.
    try {
      const requestState = await clerkClient.authenticateRequest(req as any, {
        authorizedParties: [],
      });
      if (requestState.isSignedIn) {
        const clerkUserId = requestState.toAuth().userId;
        if (clerkUserId) {
          const existingUser = await db.getUserByClerkId(clerkUserId);
          if (existingUser) return existingUser;

          // Mirror the tRPC context fallback so migrated users and newly linked
          // Clerk accounts still authenticate even if the DB row is missing its clerkUserId.
          try {
            const clerkUser = await clerkClient.users.getUser(clerkUserId);
            const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;

            if (email) {
              const emailUser = await db.getUserByEmail(email);
              if (emailUser) {
                const dbInstance = await db.getDb();
                if (dbInstance) {
                  const { users } = await import("../../drizzle/schema");
                  const { eq } = await import("drizzle-orm");
                  await dbInstance
                    .update(users)
                    .set({ clerkUserId })
                    .where(eq(users.id, emailUser.id));
                }
                return { ...emailUser, clerkUserId };
              }
            }

            await db.upsertUser({
              openId: clerkUserId,
              clerkUserId,
              email,
              name:
                [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
                email ||
                clerkUserId,
              loginMethod: "clerk",
              lastSignedIn: new Date().toISOString(),
            });

            return (await db.getUserByOpenId(clerkUserId)) ?? (await db.getUserByClerkId(clerkUserId));
          } catch (syncErr) {
            console.warn('[Auth] Failed to sync Clerk user to DB during cookie auth:', syncErr);
          }
        }
      }
    } catch (cookieErr) {
      console.warn('[Auth] Cookie authentication failed, trying bearer token fallback:', cookieErr);
    }
    
    // Fallback: try Bearer token authentication
    const authHeader = req.headers.authorization;
    console.log('[Auth] Authorization header:', authHeader ? `"${authHeader.substring(0, 20)}..."` : 'MISSING');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('[Auth] Bearer token found, length:', token.length);
      try {
        // Verify and decode the JWT token
        const decoded = await verifyToken(token, { secretKey: ENV.clerkSecretKey });
        if (decoded && decoded.sub) {
          const clerkUserId = decoded.sub;
          console.log('[Auth] Verified Clerk user ID from token:', clerkUserId);
          const existingUser = await db.getUserByClerkId(clerkUserId);
          if (existingUser) return existingUser;

          // Same migrated-user fallback as above for bearer-token auth.
          try {
            const clerkUser = await clerkClient.users.getUser(clerkUserId);
            const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;

            if (email) {
              const emailUser = await db.getUserByEmail(email);
              if (emailUser) {
                const dbInstance = await db.getDb();
                if (dbInstance) {
                  const { users } = await import("../../drizzle/schema");
                  const { eq } = await import("drizzle-orm");
                  await dbInstance
                    .update(users)
                    .set({ clerkUserId })
                    .where(eq(users.id, emailUser.id));
                }
                return { ...emailUser, clerkUserId };
              }
            }

            await db.upsertUser({
              openId: clerkUserId,
              clerkUserId,
              email,
              name:
                [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
                email ||
                clerkUserId,
              loginMethod: "clerk",
              lastSignedIn: new Date().toISOString(),
            });

            return (await db.getUserByOpenId(clerkUserId)) ?? (await db.getUserByClerkId(clerkUserId));
          } catch (syncErr) {
            console.warn('[Auth] Failed to sync Clerk user to DB during bearer auth:', syncErr);
          }
        }
      } catch (tokenErr) {
        console.error('[Auth] Bearer token verification failed:', tokenErr);
      }
    }
    
    return null;
  } catch (err) {
    console.error('[Auth] Authentication error:', err);
    return null;
  }
}
