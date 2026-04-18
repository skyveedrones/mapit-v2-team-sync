import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createClerkClient } from "@clerk/backend";
import * as db from "../db";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const clerkClient = createClerkClient({ secretKey: ENV.clerkSecretKey });

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Clerk sends the session token in the Authorization header as "Bearer <token>"
    // or as a __session cookie. The Clerk backend SDK handles both.
    const requestState = await clerkClient.authenticateRequest(opts.req as any, {
      // Allow tokens issued for any of our deployed domains.
      // Empty array would cause Clerk to reject tokens with an azp claim mismatch.
      authorizedParties: [
        'https://mapit.skyveedrones.com',
        'https://skyveedrones.com',
        'https://skyveemapit.manus.space',
        'https://dronemapv2-fis5wf2n.manus.space',
        'http://localhost:3000',
        'http://localhost:5173',
      ],
    });

    if (requestState.isSignedIn) {
      const clerkUserId = requestState.toAuth().userId;
      if (clerkUserId) {
        // Look up by Clerk user ID first
        let dbUser = await db.getUserByClerkId(clerkUserId);

        if (!dbUser) {
          // Fallback: fetch user from Clerk and try email match (for migrated users)
          try {
            const clerkUser = await clerkClient.users.getUser(clerkUserId);
            const email = clerkUser.emailAddresses[0]?.emailAddress;
            if (email) {
              dbUser = await db.getUserByEmail(email);
            }
            // If still not found, create a new DB record
            if (!dbUser) {
              const firstName = clerkUser.firstName ?? "";
              const lastName = clerkUser.lastName ?? "";
              const name = [firstName, lastName].filter(Boolean).join(" ") || email || clerkUserId;
              await db.upsertUser({
                openId: clerkUserId,
                clerkUserId,
                email: email ?? null,
                name,
                loginMethod: "clerk",
                lastSignedIn: new Date().toISOString(),
              });
              // Use openId lookup to avoid TiDB read-after-write race on clerkUserId index
              dbUser = await db.getUserByOpenId(clerkUserId) ?? null;
            } else {
              // Link the existing user to Clerk
              const dbInstance = await db.getDb();
              if (dbInstance) {
                const { users } = await import("../../drizzle/schema");
                const { eq } = await import("drizzle-orm");
                await dbInstance
                  .update(users)
                  .set({ clerkUserId })
                  .where(eq(users.id, dbUser.id));
                // Patch in-memory to avoid TiDB read-after-write race
                dbUser = { ...dbUser, clerkUserId };
              }
            }
          } catch (err) {
            console.error("[Auth] Failed to sync Clerk user to DB:", err);
          }
        }

        user = dbUser ?? null;
      }
    }
  } catch {
    // Not authenticated — public procedures will still work
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
