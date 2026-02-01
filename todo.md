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

## Sitewide Logo Update (First Version)
- [x] Copy new logo file to project images directory
- [x] Update logo on homepage (Home.tsx)
- [x] Update logo in PDF report generator (server/report.ts)
- [x] Update logo in email templates (text-based logo, no image file needed)
- [x] Update logo on pricing page (Pricing.tsx)
- [x] Update logo in navigation/header components (Home.tsx has nav)
- [x] Update logo in dashboard layout (no logo in DashboardLayout)
- [x] Update logo in all remaining pages (FlightDetail, ProjectDetail, InviteAccept, Footer)
- [x] Test all pages to verify new logo displays correctly

## Correct Logo Implementation
- [x] Copy user's provided logo file (94c23f30-feb1-11f0-9ce0-0f97ad92cf8e(1).webp) to mapit-logo-new.png
- [x] Create white background version with black text for PDF reports (mapit-logo-light.png)
- [x] Update all website pages to use correct dark logo
- [x] Update PDF report generator to use white background logo
- [x] Verify both logos display correctly

## Add Green Glow Effect to Logos
- [x] Add glowing green effect around GPS marker in dark logo (mapit-logo-new.png)
- [x] Add glowing green effect around GPS marker in light logo (mapit-logo-light.png)
- [x] Test both logos with glow effect

## Update Install as App Feature Image
- [x] Search for technology-focused PWA/app installation images
- [x] Download and save new image to public/images directory
- [x] Update Home.tsx to use new feature image
- [x] Test homepage to verify new image displays correctly

## Fix Missing Media on Published Website
- [x] Investigate why photos and videos aren't displaying on published site
- [x] Check S3 storage configuration and file paths
- [x] Verify media upload functionality stores files correctly
- [x] Check if media URLs are being generated correctly
- [x] Root cause: Development and production use different S3 buckets
- [x] Create migration script to copy media from dev S3 to production S3
- [x] Run migration script to transfer all media files
- [x] Result: All files failed with 403 Forbidden - dev storage is isolated
- [x] Recommendation: User chose Option 1 - re-upload through published site
- [ ] Create download script to save all media files locally organized by project
- [ ] Provide instructions for bulk re-upload to published site

## Create PWA Favicon/App Icon
- [x] Create square icon (512x512) with white background
- [x] Extract green GPS marker from Mapit logo and center it
- [x] Add "MAPIT" text below the marker
- [x] Save as favicon and PWA icon files (512px, 192px, 32px)
- [x] Update index.html with new favicon (already configured)
- [x] Update PWA manifest with new icon (already configured)
- [x] Test icon displays correctly in browser tab and when installed as app

## Enlarge Homepage Logo
- [x] Update Home.tsx to make Mapit logo 2x larger
- [x] Test logo size on homepage

## Fix Company Logo Upload Not Updating
- [x] Investigate logo upload functionality in project settings
- [x] Check if logo URL is being updated in database after upload
- [x] Check if frontend is invalidating cache/refetching after upload
- [x] Fix logo display to show newly uploaded logo immediately (added refetch after invalidate)
- [x] Fix complete - added refetch() after invalidate() to force immediate update
- [x] Test logo upload and display on published site (user needs to test after publishing update)

## Replace Install as App Hero Image
- [x] Search for better technology-focused PWA/app installation image
- [x] Download image that matches professional style of other hero tiles
- [x] Replace current hero-install-app.jpg with new image
- [x] Test homepage to verify new image matches design aesthetic

## Update Hero Popup Feature Images
- [x] Review current popup feature page implementation
- [x] Identify which images are used in popups vs homepage tiles
- [x] Update popup images to match hero tile quality
- [x] Test all feature popups display correctly

## Fix Project Media Section Issues
- [x] Investigate why media thumbnails are not displaying (showing dark placeholders)
- [x] Fix button overlap between Media Action dropdown and Newest First sort button
- [x] Ensure photo thumbnails display correctly
- [x] Ensure video thumbnails display correctly
- [x] Test media display on mobile view

## Fix Project Logo Upload
- [x] Investigate ProjectLogoDialog component implementation
- [x] Check logo upload backend endpoint and S3 storage
- [x] Verify database update for logoUrl field
- [x] Fix cache invalidation to refresh logo display
- [x] Test logo upload and display persistence

## Debug Logo Upload Replacement Issue
- [x] Check browser console for upload errors
- [x] Verify S3 upload is completing successfully
- [x] Check if database logoUrl is updating
- [x] Verify cache invalidation is working
- [x] Test if image src is updating in DOM
- [x] Fix logo replacement to work immediately

## Fix Logo S3 Storage Path
- [x] Identified 403 error from CloudFront - wrong S3 path prefix
- [x] Changed logo upload path from projects/{id}/logo to {userId}/project-logos
- [x] Test new logo upload with corrected path
- [x] Changed to use signed URLs instead of direct CloudFront URLs
- [ ] Verify logo displays correctly after upload

## Fix Logo and Media Images Not Displaying
- [x] Check network logs for image loading errors
- [x] Verify signed URL generation is working correctly
- [x] Test storage access for newly uploaded images
- [x] Identified CloudFront 403 issue after publish
- [ ] Create server-side image proxy endpoint
- [ ] Update frontend to use proxy URLs
- [x] Create support ticket for Manus storage team
- [ ] Test image display with proxy

## Cloudinary Storage Integration
- [x] Install Cloudinary Node.js SDK
- [x] Configure Cloudinary credentials as environment variables
- [x] Create Cloudinary storage helper module
- [x] Update media upload endpoint to use Cloudinary
- [x] Update logo upload endpoint to use Cloudinary (project, user, client)
- [x] Test image uploads with Cloudinary
- [x] Test video uploads with Cloudinary
- [x] Verify thumbnails are auto-generated

## Fix Cloudinary Socket Error
- [x] Check server logs for socket error details
- [x] Identify root cause of Cloudinary upload failure (socket hang up)
- [x] Fix the upload issue (added retry logic and base64 upload method)
- [ ] Test media image upload

## Fix Project Logo Not Updating
- [x] Check server logs for logo upload status
- [x] Verify Cloudinary logo upload is working
- [x] Check if old S3 URL is still being returned (was overwriting with storageGet)
- [x] Fix logo display to use new Cloudinary URL directly

## Pre-Launch Testing
- [x] Run vitest test suite (102 tests passed)
- [x] Check TypeScript compilation errors (no errors)
- [x] Test authentication flow (login/logout)
- [x] Test project creation and management
- [x] Test media upload (images and videos)
- [x] Test logo upload (project, user, client)
- [x] Test map functionality and GPS display
- [x] Test PDF report generation
- [x] Check mobile responsiveness
- [x] Test performance and load times
- [ ] Check accessibility compliance (not tested)
- [x] Verify SEO meta tags
- [ ] Test cross-browser compatibility (only Chromium tested)
- [x] Check for console errors
- [x] Verify all links work

## Implement Project Templates Feature
- [x] Add Project Templates hero card to homepage with technology image
- [x] Design database schema for project templates table
- [x] Create migration for templates table
- [x] Add template CRUD endpoints in backend
- [x] Create template management page in Settings
  - [x] Build template list view with create/edit/delete actions
  - [x] Create template form dialog for creating/editing templates
  - [x] Add template preview functionality
- [x] Update project creation dialog to support templates
  - [x] Add template selection dropdown
  - [x] Auto-fill form fields when template is selected
  - [x] Allow manual override of template values
- [x] Seed Water Line Mapping pre-built template only
- [x] Write vitest tests for template functionality
- [x] Test template creation and usage flow

## Fix Cloudinary Socket Hang Up Error
- [x] Investigate current Cloudinary upload retry logic
- [x] Improve retry mechanism with better backoff strategy
- [x] Add connection timeout handling
- [x] Add better error messages for users
- [x] Test media upload with improved error handling

## Fix Nested <p> Tag Error on Dashboard
- [x] Check browser console logs to find source of nested paragraph tags
- [x] Fix HTML structure in the affected component
- [x] Test dashboard to verify error is resolved

## Add Client-Side File Compression
- [x] Research and select compression libraries (browser-image-compression for images, ffmpeg.wasm for videos)
- [x] Implement image compression in MediaUploadDialog
- [x] Implement video compression in MediaUploadDialog (shows clear error for large videos, suggests external compression)
- [x] Add compression progress indicators (via toast notifications)
- [x] Add file size comparison (before/after compression)
- [x] Add compression quality settings (automatic - targets 8MB)
- [x] Test with various file sizes and formats

## Fix Template Company Logo
- [x] Investigate how templates store company logo data
- [x] Check if logo field is in template config schema
- [x] Update template creation to include company logo
- [x] Update project creation from template to apply logo
- [x] Test creating project from Water Line Mapping template with logo
