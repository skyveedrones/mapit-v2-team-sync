import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createClerkClient } from "@clerk/backend";
import { importSPKI, jwtVerify } from "jose";
import * as db from "../db";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Keep clerkClient for user lookups (not for token verification)
const clerkClient = createClerkClient({ secretKey: ENV.clerkSecretKey });

// Pre-import the RSA public key once at startup for fast local JWT verification.
// This completely bypasses clerkClient.authenticateRequest() and its network calls.
let _publicKey: Awaited<ReturnType<typeof importSPKI>> | null = null;
async function getPublicKey() {
  if (!_publicKey && ENV.clerkJwtKey) {
    _publicKey = await importSPKI(ENV.clerkJwtKey, "RS256");
  }
  return _publicKey;
}

async function verifyClerkToken(token: string): Promise<string | null> {
  try {
    const publicKey = await getPublicKey();
    if (!publicKey) return null;
    const { payload } = await jwtVerify(token, publicKey, {
      clockTolerance: 60,
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Extract token from Authorization header or __session cookie
    let token: string | null = null;
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      const cookieHeader = opts.req.headers.cookie ?? "";
      const match = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return { req: opts.req, res: opts.res, user: null };
    }

    const clerkUserId = await verifyClerkToken(token);
    if (!clerkUserId) {
      return { req: opts.req, res: opts.res, user: null };
    }

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
          dbUser = await db.getUserByOpenId(clerkUserId) ?? null;
        } else {
          // Link the existing user to the new Clerk ID
          const dbInstance = await db.getDb();
          if (dbInstance) {
            const { users } = await import("../../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await dbInstance
              .update(users)
              .set({ clerkUserId })
              .where(eq(users.id, dbUser.id));
            dbUser = { ...dbUser, clerkUserId };
          }
        }
      } catch (err) {
        console.error("[Auth] Failed to sync Clerk user to DB:", err);
      }
    }

    user = dbUser ?? null;
  } catch (err) {
    console.error("[Auth] Unexpected error in createContext:", err);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
