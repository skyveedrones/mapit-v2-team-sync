import express, { type Request, type Response } from "express";
import { Webhook } from "svix";
import { ENV } from "../_core/env";
import * as db from "../db";
import { EmailConflictError } from "../db";

const router = express.Router();

/**
 * POST /api/clerk/webhook
 * Verifies Clerk webhook payload via svix signature, then handles user lifecycle events.
 * Must be registered BEFORE express.json() so the raw body is available for verification.
 */
router.post(
  "/clerk/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const secret = ENV.clerkWebhookSecret;
    if (!secret) {
      console.error("[ClerkWebhook] CLERK_WEBHOOK_SECRET is not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Verify signature using svix
    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({ error: "Missing svix headers" });
    }

    let event: any;
    try {
      const wh = new Webhook(secret);
      event = wh.verify(req.body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      console.error("[ClerkWebhook] Signature verification failed:", err);
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const eventType: string = event.type;
    console.log(`[ClerkWebhook] Received event: ${eventType}`);

    if (eventType === "user.created") {
      const data = event.data;
      const clerkUserId: string = data.id;
      const email: string | undefined =
        data.email_addresses?.[0]?.email_address;
      const firstName: string | undefined = data.first_name;
      const lastName: string | undefined = data.last_name;
      const name =
        [firstName, lastName].filter(Boolean).join(" ") || email || clerkUserId;

      try {
        // Check if user already exists by clerkUserId (migrated users)
        let existingUser = await db.getUserByClerkId(clerkUserId);

        if (!existingUser && email) {
          // Check if a user with this email was migrated (has clerkUserId null)
          existingUser = await db.getUserByEmail(email);
        }

        if (existingUser) {
          // Update clerkUserId on existing migrated user
          const dbInstance = await db.getDb();
          if (dbInstance) {
            const { users } = await import("../../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await dbInstance
              .update(users)
              .set({ clerkUserId })
              .where(eq(users.id, existingUser.id));
            console.log(
              `[ClerkWebhook] Linked clerkUserId to existing user id=${existingUser.id}`
            );
          }
        } else {
          // Brand-new user — create a DB record
          // openId is required by upsertUser; use clerkUserId as the openId for Clerk-native users
          await db.upsertUser({
            openId: clerkUserId,
            clerkUserId,
            email: email ?? null,
            name,
            loginMethod: "clerk",
            lastSignedIn: new Date().toISOString(),
          });
          console.log(
            `[ClerkWebhook] Created new user for clerkUserId=${clerkUserId}`
          );
        }
      } catch (err) {
        if (err instanceof EmailConflictError) {
          // Email already exists under a different login method — not a fatal error.
          // Return 200 so Clerk does not retry; log a warning for visibility.
          console.warn(
            `[ClerkWebhook] Email conflict for clerkUserId=${clerkUserId}: email already registered via ${err.existingLoginMethod}. Skipping insert.`
          );
          return res.json({ received: true, warning: "email_conflict", existingMethod: err.existingLoginMethod });
        }
        console.error("[ClerkWebhook] Failed to upsert user:", err);
        return res.status(500).json({ error: "Failed to process user" });
      }
    }

    return res.json({ received: true });
  }
);

export default router;
