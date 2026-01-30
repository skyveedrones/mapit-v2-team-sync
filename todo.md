# Project TODO

- [x] Basic homepage layout with hero section
- [x] Navigation menu with mobile responsiveness
- [x] Features grid section
- [x] CTA section
- [x] Footer
- [x] User authentication - Login functionality
- [x] User authentication - Logout functionality
- [x] Protected dashboard route for authenticated users
- [x] User profile display in navigation

- [x] Database schema for projects table
- [x] Backend API - Create project
- [x] Backend API - List user projects
- [x] Backend API - Get project details
- [x] Backend API - Update project
- [x] Backend API - Delete project
- [x] Project creation modal/form
- [x] Projects list view on dashboard
- [x] Project detail page
- [x] Project settings/edit functionality
- [x] Project deletion with confirmation

- [x] Migrate City of Forney Project 1
- [x] Migrate City of Forney Project 2
- [x] Migrate City of Forney Project 3

## Media Upload Feature
- [x] Database schema for media files table
- [x] Backend API - Upload media file to S3
- [x] Backend API - Extract GPS metadata from EXIF
- [x] Backend API - List media for a project
- [x] Backend API - Delete media
- [x] Media upload UI with drag-and-drop
- [x] Media gallery view in project detail
- [x] Update project media count on upload/delete

## Interactive Map Feature
- [x] Create ProjectMap page component
- [x] Integrate Google Maps with markers for media locations
- [x] Add flight path polyline connecting GPS points
- [x] Create marker info windows with media thumbnails
- [x] Add map controls (satellite/terrain toggle)
- [x] Link map page from project detail

## Media Migration from Existing Site
- [ ] Extract media data from CIP222 Water Line project
- [ ] Extract media data from Gail Wilson Extension project
- [ ] Extract media data from Oncor Forney Switch project
- [ ] Import all media records to new database
- [ ] Verify media displays correctly on map

## Hero Feature Pages
- [x] GPS Data Export page - Export in KML, CSV, GeoJSON, GPX formats
- [x] PDF Map Overlay page - Overlay construction plans on maps
- [x] Install as App page - PWA installation instructions
- [x] Easy Upload feature page
- [x] Interactive Maps feature page
- [x] Flight Path Tracking feature page
- [x] Link feature cards on home page to feature pages

## Dashboard UI Simplification
- [x] Consolidate quick actions and New Project into single action dropdown

## Bug Fixes
- [x] Fix project card click navigation not working

## GPS Data Export Feature
- [x] Backend API - Export to KML format
- [x] Backend API - Export to CSV format
- [x] Backend API - Export to GeoJSON format
- [x] Backend API - Export to GPX format
- [x] Export UI in project detail page
- [x] Download functionality for each format

## Project Detail UI Simplification
- [x] Consolidate project action cards into single dropdown button

- [x] Fix JSON parse error on project detail page mutations (increased file size limit to 100MB)

## Project Sharing Feature
- [ ] Add shareToken field to projects database schema
- [ ] Backend API - Generate share link
- [ ] Backend API - Revoke share link
- [ ] Backend API - Public project view (no auth required)
- [ ] Public project map page accessible via share link
- [ ] Share dialog UI in project detail page
- [ ] Copy share link to clipboard functionality

## Project Sharing Feature (with Registration Required)
- [x] Database schema - Project collaborators table
- [x] Database schema - Project invitations table
- [x] Integrate Resend API for email sending (API key validated)
- [x] Create SkyVee branded email invitation template
- [x] Backend API - Send project invitation
- [x] Backend API - Accept invitation (link user to project)
- [x] Backend API - List project collaborators
- [x] Backend API - Remove collaborator
- [x] Access control - Allow collaborators to view shared projects
- [x] Share/Invite dialog UI in project detail page
- [x] Invitation acceptance page for new users

## Map View & Media Gallery Improvements
- [x] Move file information section in map view to not block full map
- [x] Consolidate project information into single compact box
- [x] Change "+Media" button to "Action" dropdown menu
- [x] Add Upload option to Action dropdown
- [x] Add Download option to Action dropdown
- [x] Add Watermark option to Action dropdown
- [x] Add Delete option to Action dropdown
- [x] Add Sort option to Action dropdown

## Watermark Feature
- [x] Backend API - Apply watermark to images
- [x] Watermark dialog UI with logo upload
- [x] Watermark position and opacity settings
- [x] Apply watermark to selected/all images

## Bug Fixes
- [ ] Fix project sharing email invitations not being delivered
- [x] Fix watermark dialog not opening from Action dropdown (verified working)
- [x] Fix map view thumbnail not loading when GPS marker is selected

## Media Gallery Enhancements
- [x] Individual image selection for watermarks and deleting (already implemented)
- [x] Add GPS/flight path sorting option (by capture time)
- [x] Manual GPS entry dialog for media without location
- [x] Map-based GPS picker centered on project media points
- [x] Backend API for updating media GPS coordinates
- [x] Fix media thumbnail checkboxes not visible for individual selection
- [x] Add "No GPS" indicator badge on thumbnails missing GPS data

## Flight Folder System
- [x] Database schema - Create flights table (id, projectId, name, description, flightDate, createdAt)
- [x] Update media table to include optional flightId reference
- [x] Backend API - Create flight (under a project)
- [x] Backend API - List flights for a project
- [x] Backend API - Update flight details
- [x] Backend API - Delete flight
- [x] Backend API - Get flight with media
- [x] UI - Add "New Flight" button to Action dropdown
- [x] UI - Display flights list in project detail page
- [x] UI - Create flight detail page with media gallery
- [x] UI - Allow uploading media to specific flight
- [x] UI - Flight card component showing flight info and media count

## Project Report Generation
- [x] Backend API - Generate project report PDF
- [x] Include project information section (name, description, location, dates, etc.)
- [x] Include project map with GPS marker points (static map image)
- [x] Include selected media files with optional watermarks
- [x] Resolution quality selector for media (affects file size)
- [x] Report generation dialog UI with media selection
- [x] Preview report before download
- [x] Download button for generated PDF

## UI Improvements
- [x] Condense project information into single compact tile on project detail page

## Report Map Enhancements
- [x] Add flight path polylines connecting GPS markers in capture order
- [x] Add map style selector (satellite, roadmap, hybrid, terrain)

## User Logo Feature
- [x] Database schema - Add logo fields to user table (logoUrl, logoKey)
- [x] Backend API - Upload user logo to S3
- [x] Backend API - Get/delete user logo
- [x] Replace "Upload Media" with "Upload Logo" in dashboard Action menu
- [x] Create logo upload dialog with preview
- [x] Display user logo on dashboard header
- [x] Include user logo in project report header

## Map Popup Enhancements
- [x] Add enlarge button to GPS marker popup on project map
- [x] Create fullscreen image viewer when enlarge is clicked

## Project Warranty Feature
- [x] Database schema - Add warranty fields to projects table (warrantyStartDate, warrantyEndDate)
- [x] Database schema - Create warranty_reminders table (projectId, reminderEmail, intervals, emailTemplate, enabled)
- [x] Backend API - Update project with warranty dates
- [x] Backend API - Configure warranty reminders (email, intervals)
- [x] Backend API - Send warranty reminder emails
- [x] UI - Add warranty fields to project edit form
- [x] UI - Display warranty info on project detail page
- [x] UI - Create warranty reminder configuration dialog
- [x] Email template for warranty reminders
- [x] Scheduled job to check and send due reminders (processDueReminders API ready)

## Warranty Reminder Dialog Updates
- [x] Remove renewal option from warranty reminder dialog
- [x] Change interval selection to monthly dropdown (every 3, 6, or 9 months)
- [x] Add custom date schedule option for reminders

## Media Section Button Layout Changes
- [x] Remove "Upload Media" from Project Actions dropdown
- [x] Rename "Action" button to "Media Action" in media section
- [x] Move "Media Action" button to left side under Project Media title
- [x] Move "Select All" button to right side where Action button was

## Embedded Project Map Section
- [x] Create embedded map component for project detail page
- [x] Add Project Map section between project info and media sections
- [x] Display GPS markers from project media on the embedded map
- [x] Remove View Map from Project Actions dropdown (now always visible)

## UI Styling Fixes
- [x] Update Project Map title to match Project Media title (same font, remove icon)

## Watermark Feature Updates
- [x] Store user watermark image in database for reuse
- [x] Permanently apply watermarks to media photos in S3 (not just download)
- [x] Generate watermarked thumbnails
- [x] Default watermark position to upper left
- [x] Load saved watermark in dialog if available

## Move Logo to Project Level
- [x] Add logoUrl and logoKey fields to projects table
- [x] Create backend API for project logo upload/delete
- [x] Add Upload Logo option to Project Actions dropdown
- [x] Display project logo on project detail page
- [x] Include project logo in project reports (instead of user logo)
- [x] Remove logo upload from dashboard Action menu
- [x] Remove logo display from dashboard header

## Watermark Preview Feature
- [x] Add live preview showing watermark on sample image
- [x] Update preview when position/opacity/scale changes
- [x] Show preview before applying permanently

## Project Logo Display & PDF Fixes
- [x] Fix PDF download function not working
- [x] Display project logo on project detail page header/info tile
- [x] Include project logo in PDF report header

## Automatic PDF Download
- [x] Implement server-side PDF generation using puppeteer or similar
- [x] Update frontend to download PDF directly without print dialog
- [x] Test PDF download functionality

## Mobile PDF Download Fix
- [x] Change PDF download to open in new tab instead of blob download
- [x] Works more reliably on mobile devices (Samsung tablets, phones)

## PDF Save As Dialog
- [x] Use File System Access API to trigger native Save As dialog
- [x] Let user choose where to save the PDF file

## Increase Video Upload Size
- [x] Increase media file upload size limit to 1 GB for videos

## Video Upload Enhancements
- [x] Add detailed upload progress indicator with speed and ETA for large files
- [x] Add video compression option before upload to save storage
- [x] Add automatic video thumbnail extraction from uploaded videos

## Video Gallery & Playback
- [x] Display video thumbnails in media gallery instead of generic video icon
- [x] Add inline video player in media detail view

## Video Upload Bug Fixes
- [x] Fix video compression failure (removed unreliable browser compression)
- [x] Fix out of memory error on normal video uploads (use direct S3 upload for files >50MB)

## Fix Video Upload Presigned URL Error
- [x] Fix "Failed to get presigned URL (404)" error for large video uploads
- [x] Use chunked upload approach instead of presigned URLs

## Fix Video Upload JSON Parse Error
- [x] Fix "JSON.parse: unexpected character" error during chunked video upload (reduced chunk size to 2MB, added retry logic)

## Upload Progress Persistence
- [x] Save upload state to localStorage (uploadId, filename, chunks uploaded, total chunks)
- [x] Detect incomplete uploads on page load and show resume option
- [x] Add "Resume Upload" button for interrupted uploads
- [x] Clean up completed/expired upload states from localStorage

## Fix Video Display Issue
- [x] Fix green/corrupted video display in media detail dialog
- [x] Decided against server-side transcoding (not available in production)
- [x] Detect H.265/HEVC codec in video files before upload
- [x] Show warning dialog when H.265 video detected
- [x] Recommend HandBrake for conversion to H.264
- [x] Allow user to proceed anyway or cancel upload

## TUS Resumable Upload Implementation
- [x] Install TUS dependencies (tus-js-client, @tus/server, @tus/file-store)
- [x] Create TUS server endpoint at /api/video-upload
- [x] Update MediaUploadDialog to use TUS for video uploads
- [x] Add createFromUrl mutation for creating media records after TUS upload
- [x] Keep H.265 detection warning (no transcoding)
- [x] Support up to 5GB video files
- [x] Client-side thumbnail extraction for videos (server stores thumbnail to S3)

## Video Thumbnail Bug Fix
- [x] Fix video thumbnail not displaying after TUS upload
- [x] Ensure extracted thumbnail is properly saved to S3
- [x] Verify thumbnail URL is stored in media record
- [x] Add detailed logging for thumbnail extraction debugging
- [x] Remove 500MB file size limit for thumbnail extraction

## Video Watermark Feature
- [x] Extend watermark feature to support video files
- [x] Implement server-side video watermarking using ffmpeg
- [x] Update WatermarkDialog to handle video files
- [x] Add progress indicator for video watermarking (longer process)
- [x] Add unit tests for video watermark functionality

## Video Watermark Bug Fix
- [x] Fix watermark dialog not showing video count when only videos selected
- [x] Fix "Apply Permanently" button staying disabled when only videos selected
- [x] Update menu item from "Watermark Photos" to "Watermark Media"

## Media Viewer Navigation
- [x] Add left/right navigation arrows to media viewer dialog
- [x] Navigate to previous/next media file when clicking arrows
- [x] Add keyboard support (left/right arrow keys)
- [x] Show current position indicator (e.g., "3 of 15")

## Media Viewer Fullscreen and Zoom
- [x] Add fullscreen mode toggle button
- [x] Implement zoom in/out controls
- [x] Add mouse wheel zoom support
- [x] Add pan/drag when zoomed in
- [x] Show zoom level indicator
- [x] Reset zoom button
- [x] Keyboard shortcuts (+/- for zoom, F for fullscreen, 0 to reset)

## Bug Fixes - Google Maps and Fullscreen
- [x] Fix Google Maps API being loaded multiple times error
- [x] Fix fullscreen mode not displaying image properly in media viewer

## Website Branding Color Scheme Update
- [x] Update CSS variables with aurora-inspired palette
- [x] Spearmint (#117660) - secondary buttons, hover states
- [x] Forest Green (#09323B) - dark backgrounds, cards
- [x] Lime Green (#04B16F) - primary accent, CTAs
- [x] Neon Green (#14E114) - logo accent, highlights
- [x] Add white accents for contrast and readability
- [x] Apply new colors across all components

## Video Player UI Improvement
- [x] Move H.265 video tip from above to below the video player

## Generate Reports UI Update
- [x] Remove "Add Watermark" option from Generate Reports tile

## Video Tip Layout Bug Fix
- [x] Fix video tip message blocking metadata grid in media viewer

## Email Configuration Update
- [x] Update "from" email address to use verified Resend domain (notifications.skyveedrones.com)
- [x] Send test email to verify configuration

## Client Portal Feature
- [x] Add clients table to database
- [x] Add clientId field to projects table (preserving existing data)
- [x] Create client management UI for admin
- [x] Implement client invitation system
- [x] Build client projects page for assigning projects
- [x] Create "City of Forney" as first client
- [x] Assign relevant projects to City of Forney

## Client Portal Completion
- [x] Build client portal dashboard view (read-only project access for clients)
- [x] Implement client invitation email system
- [x] Assign Oncor Forney Switch project to City of Forney
- [x] Assign Gail Wilson Extension project to City of Forney

## Dashboard Navigation Enhancement
- [x] Add sidebar navigation to Dashboard page (consistent with Clients page)

## Client Management Page
- [x] Create backend API for client logo upload to S3
- [x] Create backend API for client logo delete
- [x] Build full client management page with:
  - [x] Logo upload/change section
  - [x] Edit client details (name, contact, phone, address)
  - [x] Invite users section
  - [x] View/manage invited users list
  - [x] Delete client option
- [x] Update client cards to display logo instead of building icon (already implemented)

## Bug Fix: Client Portal Invite Link 404 Error
- [x] Fix invite acceptance route - users getting 404 when clicking email invite link

## Dashboard UI Changes
- [x] Remove View Maps button from Dashboard action buttons

## Site-wide Background Enhancement
- [x] Add dynamic background graphic from Homepage to all pages
- [x] Keep dark color scheme consistent

## Bug Fix: Background Z-Index
- [x] Fix global background z-index so it stays behind all page content

## Background Image Update
- [x] Change global background to aerial map-style image (now visible site-wide)

## Photo Zoom Feature
- [ ] Create lightbox/zoom component for images
- [ ] Integrate zoom feature into media gallery
- [ ] Allow users to click photos to view full-size in modal

## Project Information Fields
- [x] Add Drone Pilot field to projects
- [x] Add FAA License # field to projects
- [x] Add LAANC Authorization # field to projects

## Default Pilot Info & Report Enhancement
- [x] Add pilot info fields to user profile (dronePilot, faaLicenseNumber, laancAuthNumber)
- [x] Create user settings page for managing default pilot info
- [x] Auto-fill pilot info when creating new projects from user defaults
- [x] Include pilot credentials in PDF report generator output

## PDF Report Layout Redesign
- [ ] Remove blank sections, move data up for compact layout
- [ ] Photo grid: 8 photos per page (4 rows × 2 columns)
- [ ] SkyVee logo top left corner
- [ ] Client/project logo top right corner (symmetrical size)
- [ ] Verify project information populates correct fields
- [ ] Polish professional design

## PDF Report Layout Fix
- [x] Fix Project Details section - align horizontally like on project page

## Bug Fix: Media Upload NaN Error
- [x] Fix media upload to convert NaN GPS values to null before database insertion

## Media Thumbnail Icon Styling
- [x] Replace white photo/video icons with stylish colored icons
- [x] Photo icon - use brand green color (#04B16F)
- [x] Video icon - use red color

## Bug Fix: Video Thumbnails on Map
- [x] Fix video thumbnails not showing in GPS marker popups
- [x] Enable enlarge functionality for video thumbnails like photos

## Media Notes Feature
- [x] Add notes field to media table in database
- [x] Create backend API to update media notes
- [x] Combine File Size and Upload Date tiles into single Notes tile
- [x] Make Notes tile same height as tiles on left
- [x] Add text editing functionality to Notes tile
- [x] Save notes to database when user types

## Media Detail Popup Layout Reorganization
- [x] Move file size and upload date to Captured tile
- [x] Move camera information to Captured tile
- [x] Move altitude information to Location tile
- [x] Move Notes tile to be directly below the image
- [x] Enlarge Notes tile to match image width
- [x] Add scrollbar to popup dialog
- [x] Shrink green video tip banner
- [x] Adjust all tiles for symmetry and alignment

## Video Zoom Feature
- [x] Enable zoom controls for video playback
- [x] Apply zoom transformation to video element
- [x] Support pan/drag functionality for zoomed videos

## Media Popup Scroll Reset
- [x] Reset popup scroll position to top when opening media detail dialog

## Flight Upload Bug
- [x] Fix uploaded photos being assigned to wrong flight
- [x] Ensure flight ID is correctly passed and stored during upload

## Flight Upload Still Not Working
- [x] Debug why uploads from Flight Detail page still go to main project
- [x] Verify flightId is being passed correctly through upload flow
- [x] Check if there's a caching or invalidation issue

## Flight Upload Issue - Media Still Showing on Main Project Page
- [x] Verify flight assignment is working in database
- [x] Check if main project page should exclude flight-assigned media
- [x] Fix project media gallery to only show unassigned media

## Flight Map GPS Markers Fix
- [x] Update flight detail map to show only GPS markers from that flight's media
- [x] Filter map data by flightId instead of showing all project media

## Drone Pilot Information Fields
- [x] Add pilot fields to flights database table (name, license, contact)
- [x] Update flight creation dialog with pilot information inputs
- [x] Display pilot information on flight detail page
- [x] Allow editing pilot information on existing flights

## SkyVee Logo Link Update
- [x] Change SkyVee logo link to point to www.skyveedrones.com

## Report Download Page Logo Fix
- [x] Fix SkyVee logo "V" on report download page
- [x] Lower the logo position to not be crowded at top of page

## Report Logo Fix - Use Home Page Logo
- [x] Use the actual SkyVee logo image from home page instead of SVG
- [x] Make client logo (Forney) bigger in upper right
- [x] Add more spacing between client logo and edge of form

## PDF Report Logo Color Fix
- [x] Use dark/black version of SkyVee logo for visibility on white PDF background

## PDF Report SkyVee Logo Spacing
- [x] Add left margin to SkyVee logo to match Forney logo spacing on right

## PDF Report Photo Layout
- [x] Make media photos more square-shaped
- [x] Reduce photo width
- [x] Create equal white spacing on the page

## PDF Report Photo Size Fix
- [x] Increase photo size - photos are too small
- [x] Reduce photos per page to allow larger display

## Flight Upload Bug - Photos Going to Main Project (Again)
- [x] Investigate why photos from Add Flights page upload to main project instead of flight
- [x] Fix flight ID assignment in upload process

## Feature Page Scroll Fix
- [x] Fix feature pages to scroll to top when navigating from homepage hero tiles

## Feature Page Image Updates
- [x] Find and update Easy Upload feature page image
- [x] Find and update Interactive Maps feature page image
- [x] Find and update Flight Path Tracking feature page image
- [x] Find and update GPS Data Export feature page image
- [x] Find and update PDF Map Overlay feature page image
- [x] Find and update Install as App feature page image

## Homepage Feature Card Images
- [x] Add image display to homepage feature cards
- [x] Update card layout to show feature images

## Flight PDF Report Feature
- [ ] Add backend endpoint to generate PDF reports for individual flights
- [ ] Add report generation UI to FlightDetail page
- [ ] Include flight-specific media and metadata in flight reports
- [ ] Match project report styling and layout for consistency

## Hero Feature Image Update
- [x] Replace GPS Data Export feature image with darker image that matches site theme

## Rebranding to Mapit
- [x] Generate Mapit logo with green dotted "i" (use MAPit font weight, smaller dot)
- [x] Update all text references from SkyVee to Mapit
- [x] Update logo files and favicon
- [x] Update page titles and metadata
- [x] Test all branding changes across the site

## Update Mapit Logo with Green V
- [x] Generate new Mapit logo with green "V" replacing GPS marker dot
- [x] Update logo files throughout the site
- [x] Extract SkyVee green V wing and composite it into Mapit logo
