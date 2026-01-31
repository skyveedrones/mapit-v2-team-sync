# Project TODO

## Marker Clustering Feature
- [x] Implement marker clustering on ProjectMap.tsx
- [x] Implement marker clustering on EmbeddedProjectMap.tsx
- [x] Add cluster styling with count badges
- [x] Test clustering with projects that have many GPS points

## Bug Fixes and Enhancements
- [x] Fix video markers not showing on embedded project map (only show after clicking fullscreen)
- [x] Fix video thumbnails showing blank and not opening video player
- [x] Add numbers to media gallery thumbnails matching GPS marker numbers
- [x] Enlarge PDF report map while keeping it on first page
- [x] Reduce PDF report top and bottom margins
- [x] Enlarge Mapit logo in PDF report
- [x] Change all green font to black in PDF report

## Additional Bug Fixes
- [x] Fix video thumbnails showing blank in fullscreen map info windows
- [x] Add borders around photo tiles in PDF report
- [x] Fix media gallery numbering to match GPS marker order (currently breaks when sorting changes)

## Logo Update
- [x] Remove black square background from Mapit logo and make it transparent

## UI Update
- [x] Remove GPS marker numbers from media gallery thumbnails

## Video Marker Bug Fixes
- [x] Fix video GPS markers not showing on embedded project map (only show on fullscreen)
- [x] Fix blank video thumbnails in map popup windows

## Video Thumbnail Bug Fix
- [x] Fix video thumbnails not displaying in info window popup on enlarged/fullscreen map
- [x] Fix video thumbnails in Selected Media Preview popup (bottom right corner)

## Logo Display Fix
- [x] Fix Mapit logo showing checkered transparency pattern on homepage - created new logo with solid dark background

## Logo Revert
- [x] Revert Mapit logo back to original version (mapit-logo-white.png)

## Logo Restoration
- [x] Restore Mapit logo to correct version with solid black background

## Pricing Page Implementation
- [x] Create Pricing.tsx page component with 4 subscription tiers
- [x] Add feature comparison table
- [x] Add pricing route to App.tsx
- [x] Add Pricing link to navigation
- [x] Style pricing cards with Mapit branding (green accents)
- [x] Add annual/monthly toggle
- [x] Test pricing page responsiveness

## Pricing Page Link Placement
- [x] Add "View Pricing" CTA button to homepage hero section
- [ ] Create footer component with pricing link
- [ ] Add footer to all pages (Home, Dashboard, Pricing, etc.)
- [ ] Add upgrade prompts in dashboard when users hit plan limits
- [ ] Test all pricing links work correctly

## Stripe Payment Integration
- [x] Add Stripe feature to project using webdev_add_feature
- [x] Configure Stripe API keys (test and production)
- [x] Create subscription plans configuration file
- [ ] Create subscription products in Stripe dashboard
- [ ] Implement checkout flow on pricing page
- [ ] Add webhook handlers for subscription events
- [ ] Create subscription management page in dashboard
- [ ] Test payment flow with Stripe test cards

## Feature Gating & Plan Limits
- [x] Add subscription tier field to user table
- [x] Create plan limits configuration (projects, storage, team members)
- [ ] Implement middleware to check plan limits before actions
- [ ] Add upgrade prompts when users hit limits
- [ ] Show current plan and usage in dashboard
- [ ] Add "Upgrade" buttons throughout app
- [ ] Test all plan limit enforcement

## Pricing FAQ Update
- [x] Remove nonprofit and education discount question from pricing FAQ

## Sitewide Logo Update
- [x] Copy new logo file to project images directory
- [x] Update logo on homepage (Home.tsx)
- [x] Update logo in PDF report generator (server/report.ts)
- [x] Update logo in email templates (text-based logo, no image file needed)
- [x] Update logo on pricing page (Pricing.tsx)
- [x] Update logo in navigation/header components (Home.tsx has nav)
- [x] Update logo in dashboard layout (no logo in DashboardLayout)
- [x] Update logo in all remaining pages (FlightDetail, ProjectDetail, InviteAccept, Footer)
- [x] Test all pages to verify new logo displays correctly
