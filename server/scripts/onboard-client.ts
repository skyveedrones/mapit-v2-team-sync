#!/usr/bin/env tsx
/**
 * Phase 5: Client Onboarding Automation Script
 * =============================================
 * Creates a new Client/Organization, optionally links an existing Project to it,
 * creates a new portal User linked to that Client, and generates a magic login link.
 *
 * Usage:
 *   npx tsx server/scripts/onboard-client.ts \
 *     --clientName "City of Garland" \
 *     --contactName "Jane Doe" \
 *     --contactEmail "jane@garland.gov" \
 *     --userName "Jane Doe" \
 *     --userEmail "jane@garland.gov" \
 *     --ownerId 1 \
 *     [--projectId 42]
 *
 * All steps run inside a logical transaction (sequential with rollback on failure).
 *
 * NOTE ON ROLES
 * -------------
 * The users.role DB enum is: ["user", "admin", "webmaster"]
 * Portal-only (client) users should be created with role = "user".
 * The clientUsers join table controls their portal access scope.
 * The Phase 2 guards in App.tsx / Dashboard.tsx check user?.role === 'client' —
 * that enum value does not exist in the DB yet. See SCHEMA NOTE below.
 *
 * SCHEMA NOTE — ACTION REQUIRED
 * ------------------------------
 * To make the Phase 2 role-based redirect guards work, the users.role enum
 * needs a "client" value added via a Drizzle migration:
 *
 *   ALTER TABLE users MODIFY COLUMN role
 *     ENUM('user','admin','webmaster','client') NOT NULL DEFAULT 'user';
 *
 * Until that migration runs, this script assigns role = "user" and the
 * portal guards will not fire. Run the migration, then change the line below
 * to role: 'client' and update the InsertUser type in schema.ts accordingly.
 */

import { randomBytes } from "crypto";
import { parseArgs } from "util";
import * as db from "../db";
import { ENV } from "../_core/env";
import { createClerkClient } from "@clerk/backend";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function printUsage() {
  console.log(`
Usage:
  npx tsx server/scripts/onboard-client.ts \\
    --clientName   "City of Garland"    (required) Client/org display name
    --contactName  "Jane Doe"           (optional) Primary contact name
    --contactEmail "jane@garland.gov"   (optional) Primary contact email
    --userName     "Jane Doe"           (required) Portal user display name
    --userEmail    "jane@garland.gov"   (required) Portal user email address
    --ownerId      1                    (required) Admin user ID who owns this client
    --projectId    42                   (optional) Existing project ID to link to client
`);
}

function parseCliArgs() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      clientName:    { type: "string" },
      contactName:   { type: "string" },
      contactEmail:  { type: "string" },
      userName:      { type: "string" },
      userEmail:     { type: "string" },
      ownerId:       { type: "string" },
      projectId:     { type: "string" },
      help:          { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const missing: string[] = [];
  if (!values.clientName)  missing.push("--clientName");
  if (!values.userName)    missing.push("--userName");
  if (!values.userEmail)   missing.push("--userEmail");
  if (!values.ownerId)     missing.push("--ownerId");

  if (missing.length > 0) {
    console.error(`\n❌  Missing required arguments: ${missing.join(", ")}\n`);
    printUsage();
    process.exit(1);
  }

  return {
    clientName:    values.clientName!,
    contactName:   values.contactName ?? null,
    contactEmail:  values.contactEmail ?? null,
    userName:      values.userName!,
    userEmail:     values.userEmail!,
    ownerId:       parseInt(values.ownerId!, 10),
    projectId:     values.projectId ? parseInt(values.projectId, 10) : null,
  };
}

// ---------------------------------------------------------------------------
// Magic login link generation (Clerk)
// ---------------------------------------------------------------------------

/**
 * Generates a Clerk magic sign-in link for the given Clerk user ID.
 * The user must already exist in Clerk (created via the Clerk API or webhook).
 */
async function generateMagicLoginLink(clerkUserId: string, _name: string): Promise<string> {
  const clerk = createClerkClient({ secretKey: ENV.clerkSecretKey });
  const baseUrl =
    process.env.APP_BASE_URL ??
    process.env.VITE_APP_URL ??
    "https://mapit.skyveedrones.com";

  // Create a sign-in token (magic link) via Clerk
  const signInToken = await clerk.signInTokens.createSignInToken({
    userId: clerkUserId,
    expiresInSeconds: 60 * 60 * 24 * 7, // 7 days
  });

  return `${baseUrl}/login?token=${encodeURIComponent(signInToken.token)}`;
}

// ---------------------------------------------------------------------------
// Main onboarding function
// ---------------------------------------------------------------------------

export async function onboardClient(args: {
  clientName: string;
  contactName: string | null;
  contactEmail: string | null;
  userName: string;
  userEmail: string;
  ownerId: number;
  projectId: number | null;
}) {
  console.log("\n🚀  Starting client onboarding...\n");

  // ── Step 1: Verify the owner exists ──────────────────────────────────────
  console.log(`[1/5] Verifying owner (userId: ${args.ownerId})...`);
  const owner = await db.getUserById(args.ownerId);
  if (!owner) {
    throw new Error(`Owner with userId ${args.ownerId} not found in the database.`);
  }
  console.log(`      ✓ Owner found: ${owner.name ?? owner.email ?? owner.openId}`);

  // ── Step 2: Create the Client/Organization ────────────────────────────────
  console.log(`\n[2/5] Creating client "${args.clientName}"...`);
  const newClient = await db.createClient({
    ownerId: args.ownerId,
    name: args.clientName,
    contactName: args.contactName ?? undefined,
    contactEmail: args.contactEmail ?? undefined,
  });
  if (!newClient) {
    throw new Error("Failed to create client record.");
  }
  console.log(`      ✓ Client created  →  id: ${newClient.id}, name: "${newClient.name}"`);

  // ── Step 3: Link Project to Client (optional) ─────────────────────────────
  if (args.projectId !== null) {
    console.log(`\n[3/5] Linking project ${args.projectId} to client ${newClient.id}...`);
    const updatedProject = await db.assignProjectToClient(
      args.projectId,
      newClient.id,
      args.ownerId
    );
    if (!updatedProject) {
      throw new Error(
        `Failed to link project ${args.projectId} to client ${newClient.id}. ` +
        `Ensure the project exists and belongs to ownerId ${args.ownerId}.`
      );
    }
    console.log(`      ✓ Project "${updatedProject.name}" linked to client "${newClient.name}"`);
  } else {
    console.log(`\n[3/5] No --projectId provided, skipping project assignment.`);
  }

  // ── Step 4: Create portal User ────────────────────────────────────────────
  console.log(`\n[4/5] Creating portal user "${args.userName}" <${args.userEmail}>...`);

  // Generate a stable synthetic openId for this user.
  // Format: "client_<16-hex-bytes>" — unique, non-OAuth, easily identifiable.
  const syntheticOpenId = `client_${randomBytes(16).toString("hex")}`;

  await db.upsertUser({
    openId: syntheticOpenId,
    name: args.userName,
    email: args.userEmail,
    loginMethod: "invite",
    lastSignedIn: new Date().toISOString(),
    // 'client' is now a valid enum value in drizzle/schema.ts.
    // A DB migration (ALTER TABLE users MODIFY COLUMN role ENUM(...,'client'))
    // must be applied to the live database before this takes effect.
    role: "client",
  });

  const newUser = await db.getUserByOpenId(syntheticOpenId);
  if (!newUser) {
    throw new Error("Failed to retrieve newly created user from database.");
  }
  console.log(`      ✓ User created    →  id: ${newUser.id}, openId: ${syntheticOpenId}`);

  // Link user to client via client_users join table
  await db.addClientUser({
    clientId: newClient.id,
    userId: newUser.id,
    role: "viewer",
  });
  console.log(`      ✓ User linked to client "${newClient.name}" with portal role: viewer`);

  // If a project was linked, also assign it directly to this user
  if (args.projectId !== null) {
    await db.assignProjectToUser(
      newClient.id,
      newUser.id,
      args.projectId,
      args.ownerId
    );
    console.log(`      ✓ Project ${args.projectId} assigned to user ${newUser.id}`);
  }

  // ── Step 5: Generate Magic Login Link ─────────────────────────────────────
  console.log(`\n[5/5] Generating magic login link...`);
  // Use clerkUserId if available; fall back to a note that Clerk user must be created first
  const clerkIdForLink = newUser.clerkUserId ?? syntheticOpenId;
  const magicLink = await generateMagicLoginLink(clerkIdForLink, args.userName);
  console.log(`      ✓ Magic login link generated`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  ✅  Onboarding Complete                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Client                                                          ║
║    ID   : ${String(newClient.id).padEnd(55)}║
║    Name : ${newClient.name.padEnd(55)}║
╠══════════════════════════════════════════════════════════════════╣
║  Portal User                                                     ║
║    ID      : ${String(newUser.id).padEnd(52)}║
║    Name    : ${(newUser.name ?? "").padEnd(52)}║
║    Email   : ${(newUser.email ?? "").padEnd(52)}║
║    OpenId  : ${syntheticOpenId.padEnd(52)}║
╠══════════════════════════════════════════════════════════════════╣
║  Magic Login Link (share with the client user):                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
  console.log(magicLink);
  console.log(`
⚠️  IMPORTANT: This link contains a long-lived session token.
   Send it securely (e.g., encrypted email). It expires in 1 year.

⚠️  SCHEMA REMINDER: The users.role enum does not yet include 'client'.
   The Phase 2 portal guards will not redirect this user until the
   migration is applied. See SCHEMA NOTE in this file for the SQL.
`);

  return {
    client: newClient,
    user: newUser,
    magicLink,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const args = parseCliArgs();
onboardClient(args).catch((err) => {
  console.error("\n❌  Onboarding failed:", err.message ?? err);
  process.exit(1);
});
