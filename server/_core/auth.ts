import { createClerkClient } from "@clerk/backend";
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
    // First try Clerk session cookie authentication
    const requestState = await clerkClient.authenticateRequest(req as any, {
      authorizedParties: [],
    });
    if (requestState.isSignedIn) {
      const clerkUserId = requestState.toAuth().userId;
      if (clerkUserId) {
        return await db.getUserByClerkId(clerkUserId);
      }
    }
    
    // Fallback: try Bearer token authentication
    const authHeader = req.headers.authorization;
    console.log('[Auth] Authorization header:', authHeader ? `"${authHeader.substring(0, 20)}..."` : 'MISSING');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('[Auth] Bearer token found, length:', token.length);
      try {
        const verifiedToken = await clerkClient.verifyToken(token);
        if (verifiedToken && verifiedToken.sub) {
          return await db.getUserByClerkId(verifiedToken.sub);
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
