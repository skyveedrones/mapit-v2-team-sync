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
