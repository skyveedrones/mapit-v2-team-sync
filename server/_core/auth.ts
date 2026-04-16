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
  try {
    const requestState = await clerkClient.authenticateRequest(req as any, {
      authorizedParties: [],
    });
    if (!requestState.isSignedIn) return null;
    const clerkUserId = requestState.toAuth().userId;
    if (!clerkUserId) return null;
    return await db.getUserByClerkId(clerkUserId);
  } catch {
    return null;
  }
}
