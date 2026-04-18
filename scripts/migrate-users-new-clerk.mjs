/**
 * Clerk User Migration Script — New Instance
 * ============================================
 * Migrates existing users to the new Clerk instance (mapit.skyveedrones.com).
 *
 * Handles two user types:
 *   1. OAuth users (Google/Microsoft) — created with email only; old Clerk ID
 *      stored in external_id for reference. Users re-link via OAuth on next login.
 *   2. Email/password user — created with bcrypt password hash so they can
 *      log in immediately without a password reset.
 *
 * Flags on every request:
 *   skip_password_checks: true  — accepts raw bcrypt hash
 *   skip_legal_checks:    true  — skips ToS requirement
 *   skip_webhooks:        true  — no user.created events fired
 *
 * After creating each user in Clerk, the script writes the new Clerk user ID
 * back to the `clerkUserId` column in the database.
 *
 * Usage:
 *   node scripts/migrate-users-new-clerk.mjs
 *
 * CLERK_SECRET_KEY and DATABASE_URL are read from environment / .env
 */

import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomBytes } from "crypto";

// Generate a secure random temporary password that meets Clerk's requirements
// (min 8 chars, upper + lower + number + special)
function generateTempPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;
  const rand = randomBytes(16);
  // Guarantee at least one of each required character class
  let pwd = [
    upper[rand[0] % upper.length],
    lower[rand[1] % lower.length],
    digits[rand[2] % digits.length],
    special[rand[3] % special.length],
  ];
  for (let i = 4; i < 16; i++) {
    pwd.push(all[rand[i] % all.length]);
  }
  // Shuffle
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = rand[i % rand.length] % (i + 1);
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }
  return pwd.join('');
}

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error("❌  CLERK_SECRET_KEY not set");
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set");
  process.exit(1);
}

// ── User list ───────────────────────────────────────────────────────────────
// Set robban's passwordHash below once you have it.
// All other users are OAuth — no password needed.

const USERS = [
  // ── Google OAuth ──────────────────────────────────────────────────────────
  {
    email: "claybechtol@gmail.com",
    firstName: "Clay",
    lastName: "",
    loginMethod: "google",
    oldClerkId: "user_3CSXE5BgwInBqtcOCVUWpiTpott",
    passwordHash: null,
  },
  {
    email: "traceybechtol@gmail.com",
    firstName: "Tracey",
    lastName: "Bechtol",
    loginMethod: "google",
    oldClerkId: "user_3CSXE8yyo0yPKFbPUwlNXXJ9QRm",
    passwordHash: null,
  },
  // ── Microsoft OAuth ───────────────────────────────────────────────────────
  {
    email: "mrozelle@garlandtx.gov",
    firstName: "Mike",
    lastName: "Rozelle",
    loginMethod: "microsoft",
    oldClerkId: "user_3CSXEDlJ5cHMnQk5nl0oPt3WvhY",
    passwordHash: null,
  },
  {
    email: "eluna@forneytx.gov",
    firstName: "eluna",
    lastName: "",
    loginMethod: "microsoft",
    oldClerkId: "user_3CSXE9KF3ItCFT2cqlHEkev3i5p",
    passwordHash: null,
  },
  {
    email: "tbechtol@forneytx.gov",
    firstName: "Tracey",
    lastName: "Bechtol",
    loginMethod: "microsoft",
    oldClerkId: "user_3CSXE9ZJD08B0AiQNQXcqJbKNVA",
    passwordHash: null,
  },
  // ── Email / Password ──────────────────────────────────────────────────────
  // TODO: Replace null below with robban's bcrypt hash ($2a$...)
  {
    email: "robban@overcastinnovations.com",
    firstName: "robban",
    lastName: "",
    loginMethod: "email",
    oldClerkId: "user_3CSXEB10a1NAhFwdZTSBbqugFdw",
    passwordHash: null, // ← REPLACE WITH BCRYPT HASH BEFORE RUNNING
  },
];

// ── Clerk API helper ─────────────────────────────────────────────────────────

async function clerkPost(path, body) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function clerkGet(path) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  return { status: res.status, data: await res.json() };
}

// ── Import a single user ─────────────────────────────────────────────────────

async function importUser(user) {
  const isEmailUser = user.loginMethod === "email" && user.passwordHash;

  // Generate a temporary password for all users — required by this Clerk instance.
  // OAuth users will re-link via Google/Microsoft on next login (password ignored).
  // Email users without a hash will need to use 'Forgot Password' to set their own.
  const tempPassword = generateTempPassword();

  const payload = {
    email_address: [user.email],
    first_name: user.firstName || undefined,
    last_name: user.lastName || undefined,
    // Store old Clerk ID as external_id for reference / audit trail
    external_id: user.oldClerkId,
    // Temporary password satisfies Clerk's password requirement
    password: tempPassword,
    // Suppress all side-effects
    skip_password_checks: true,
    skip_legal_checks: true,
    skip_webhooks: true,
  };

  if (isEmailUser) {
    // Email/password user — override with their real bcrypt hash
    delete payload.password;
    payload.password_hasher = "bcrypt";
    payload.password_digest = user.passwordHash;
  }
  // OAuth users: password is set but ignored — they re-link via Google/Microsoft on next login

  const { status, data } = await clerkPost("/users", payload);

  if (status === 200 && data.id) {
    return { result: "created", clerkUserId: data.id };
  }

  const errorCode = data.errors?.[0]?.code ?? "";
  const errorMsg = data.errors?.[0]?.long_message ?? data.errors?.[0]?.message ?? JSON.stringify(data);

  // Already exists — look up by email
  if (errorCode === "form_identifier_exists" || errorMsg.includes("already exists")) {
    const { data: searchData } = await clerkGet(
      `/users?email_address=${encodeURIComponent(user.email)}&limit=1`
    );
    const existing = Array.isArray(searchData) ? searchData[0] : null;
    if (existing?.id) {
      return { result: "already_exists", clerkUserId: existing.id };
    }
    return { result: "already_exists_lookup_failed", clerkUserId: null };
  }

  return { result: "error", clerkUserId: null, error: errorMsg };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Validate robban's hash is set before running
  const robban = USERS.find((u) => u.email === "robban@overcastinnovations.com");
  if (!robban.passwordHash) {
    console.warn(
      "⚠️   robban@overcastinnovations.com has no passwordHash set.\n" +
      "    They will be created without a password (OAuth-style).\n" +
      "    They will need to use 'Forgot Password' to set a new one.\n" +
      "    To import with their existing hash, edit USERS in this script and re-run.\n"
    );
  }

  const conn = await createConnection(DATABASE_URL);
  console.log("\n🚀  Starting Clerk user migration...\n");

  let created = 0;
  let alreadyExists = 0;
  let errors = 0;

  for (const user of USERS) {
    process.stdout.write(`  ⏳  ${user.email} (${user.loginMethod})... `);

    const { result, clerkUserId, error } = await importUser(user);

    if (result === "created" || result === "already_exists") {
      if (clerkUserId) {
        // Write new Clerk ID back to database
        await conn.execute(
          "UPDATE users SET clerkUserId = ? WHERE email = ?",
          [clerkUserId, user.email]
        );
        const icon = result === "created" ? "✅" : "⚠️ ";
        const label = result === "created" ? "created" : "already existed";
        console.log(`${icon}  ${label} → ${clerkUserId}`);
        result === "created" ? created++ : alreadyExists++;
      } else {
        console.log(`⚠️   already exists but Clerk lookup failed — clerkUserId not updated`);
        alreadyExists++;
      }
    } else {
      console.log(`❌  error: ${error}`);
      errors++;
    }

    // Small delay to respect Clerk rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  await conn.end();

  console.log("\n── Migration Summary ──────────────────────────────────────────");
  console.log(`  Total:          ${USERS.length}`);
  console.log(`  ✅  Created:    ${created}`);
  console.log(`  ⚠️   Existing:  ${alreadyExists}`);
  console.log(`  ❌  Errors:     ${errors}`);
  console.log("───────────────────────────────────────────────────────────────\n");

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("❌  Fatal:", err.message);
  process.exit(1);
});
