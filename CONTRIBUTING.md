# MAPIT Development Guidelines

## 🛠 Deployment & Versioning Protocol

To ensure the live environment at **mapit.skyveedrones.com** stays in sync with development, the following rules are **mandatory**:

### 1. Automatic Versioning

Every bug fix, feature, or UI tweak must be followed by a version bump.

**Command:** `npm run bump`

This command automatically updates:
- `package.json` (increments patch version)
- `shared/version.ts` (syncs the version constant)

**Example workflow:**
```bash
# Make your code changes
git add .
git commit -m "Fix: Mapbox blank screen on first load"

# Bump the version
npm run bump

# Verify the new version
cat package.json | grep version
# Output: "version": "1.1.3"
```

### 2. Definition of Done

A task is **not complete** until all three conditions are met:

| Step | Action | Verification |
|------|--------|--------------|
| 1 | Code changes implemented and tested | Browser preview shows correct behavior |
| 2 | Version bumped | `npm run bump` executed successfully |
| 3 | Checkpoint saved | New version number appears in final task summary |

**Example final confirmation:**
> "Fixed Mapbox blank screen. Updated to **v1.1.3**. Checkpoint saved."

### 3. Publishing to Live

After a checkpoint is saved, the **Publish** button in the Management UI must be triggered to push the new version to mapit.skyveedrones.com.

**Steps:**
1. Ensure checkpoint is saved (shows in version history)
2. Click **Publish** button (top-right of Management UI)
3. Wait 5-15 minutes for CDN propagation
4. Verify live version at Settings → Version tab

### 4. Version Numbering Scheme

MAPIT uses **semantic versioning** (MAJOR.MINOR.PATCH):

- **MAJOR** (e.g., 2.0.0) — Breaking changes, major feature releases
- **MINOR** (e.g., 1.2.0) — New features, backward compatible
- **PATCH** (e.g., 1.1.3) — Bug fixes, small improvements

**Typical workflow:** Most changes increment PATCH via `npm run bump`.

### 5. Test Clients, Projects, and Users

**Always delete test data immediately after use.** This prevents database clutter and ensures production data stays clean.

**Cleanup checklist:**
- Delete test clients (prefix: "Test", "Demo", "Logo Test")
- Delete test projects (prefix: "Test", "Template")
- Delete test users (email: test@*, demo@*)

**Command example:**
```bash
# Find and delete test clients
node -e "
const mysql = require('mysql2/promise');
// Query and delete test records
"
```

---

## 🚀 Quick Reference

| Task | Command |
|------|---------|
| Bump version | `npm run bump` |
| Run tests | `npm test` |
| Format code | `npm run format` |
| Check TypeScript | `npm run check` |
| Push DB migrations | `npm run db:push` |
| Start dev server | `npm run dev` |
| Build for production | `npm run build` |

---

## 📋 Checklist Before Checkpoint

Before saving a checkpoint, verify:

- [ ] Code changes are complete and tested
- [ ] `npm run bump` has been executed
- [ ] New version number is confirmed in `package.json`
- [ ] All test data (clients, projects, users) has been deleted
- [ ] TypeScript compilation passes (`npm run check`)
- [ ] Browser preview shows expected behavior
- [ ] Final task summary includes new version number

---

## 🔄 CI/CD Integration (Future)

Once GitHub Actions is configured, the following will be automated:

- TypeScript type checking on every push
- Automated tests run before merge
- Version bump triggers a build and deployment
- Changelog auto-generated from commit messages

For now, all steps are manual but follow this protocol to prepare for automation.

---

## Questions?

Refer to the project README.md or reach out to the development team. This document is the source of truth for deployment rules.
