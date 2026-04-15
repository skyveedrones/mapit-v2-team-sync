import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, uniqueIndex, int, varchar, text, timestamp, mysqlEnum, decimal, json, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const auditLog = mysqlTable("audit_log", {
	id: int().autoincrement().notNull(),
	action: varchar({ length: 50 }).notNull(),
	entityType: varchar({ length: 50 }).notNull(),
	entityId: int().notNull(),
	entityName: varchar({ length: 255 }),
	userId: int().notNull(),
	userName: varchar({ length: 255 }),
	details: text(),
	ipAddress: varchar({ length: 45 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_audit_log_entity").on(table.entityType, table.entityId),
	index("idx_audit_log_user").on(table.userId),
	index("idx_audit_log_created").on(table.createdAt),
]);

export const clientInvitations = mysqlTable("client_invitations", {
	id: int().autoincrement().notNull(),
	clientId: int().notNull(),
	invitedBy: int().notNull(),
	email: varchar({ length: 320 }).notNull(),
	token: varchar({ length: 64 }).notNull(),
	role: mysqlEnum(['viewer','user','admin']).default('viewer').notNull(),
	status: mysqlEnum(['pending','accepted','expired','revoked']).default('pending').notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	acceptedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("client_invitations_token_unique").on(table.token),
]);

export const clientProjectAssignments = mysqlTable("client_project_assignments", {
	id: int().autoincrement().notNull(),
	clientId: int().notNull(),
	userId: int().notNull(),
	projectId: int().notNull(),
	assignedBy: int().notNull(),
	assignedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const clientUsers = mysqlTable("client_users", {
	id: int().autoincrement().notNull(),
	clientId: int().notNull(),
	userId: int().notNull(),
	role: mysqlEnum(['viewer','user','admin']).default('viewer').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const clients = mysqlTable("clients", {
	id: int().autoincrement().notNull(),
	ownerId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	contactEmail: varchar({ length: 320 }),
	contactName: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	address: text(),
	logoUrl: varchar({ length: 500 }),
	logoKey: varchar({ length: 500 }),
	projectCount: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("idx_clients_deleted").on(table.deletedAt),
]);

export const flights = mysqlTable("flights", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	flightDate: timestamp({ mode: 'string' }),
	mediaCount: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	dronePilot: varchar({ length: 255 }),
	faaLicenseNumber: varchar({ length: 100 }),
	laancAuthNumber: varchar({ length: 100 }),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
},
(table) => [
	index("idx_flights_deleted").on(table.deletedAt),
]);

export const media = mysqlTable("media", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	userId: int().notNull(),
	filename: varchar({ length: 255 }).notNull(),
	fileKey: varchar({ length: 500 }).notNull(),
	url: varchar({ length: 500 }).notNull(),
	mimeType: varchar({ length: 100 }).notNull(),
	fileSize: int().notNull(),
	mediaType: mysqlEnum(['photo','video']).notNull(),
	latitude: decimal({ precision: 12, scale: 9 }),
	longitude: decimal({ precision: 12, scale: 9 }),
	altitude: decimal({ precision: 10, scale: 2 }),
	capturedAt: timestamp({ mode: 'string' }),
	cameraMake: varchar({ length: 100 }),
	cameraModel: varchar({ length: 100 }),
	thumbnailUrl: varchar({ length: 500 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	flightId: int(),
	notes: text(),
	priority: mysqlEnum(['none','low','high']).default('none').notNull(),
	thumbnailKey: varchar({ length: 500 }),
	originalWidth: int(),
	originalHeight: int(),
	thumbnailWidth: int(),
	thumbnailHeight: int(),
	isHighResolution: int().default(1),
	highResUrl: varchar({ length: 500 }),
	highResKey: varchar({ length: 500 }),
	highResFileSize: int(),
	duration: decimal({ precision: 10, scale: 2 }),
	resolution: varchar({ length: 50 }),
	frameRate: decimal({ precision: 5, scale: 2 }),
	telemetryPath: text(),
	uploadSessionId: varchar({ length: 64 }),
	processingStatus: mysqlEnum(['pending','processing','completed','failed']).default('pending'),
	processingError: text(),
	transcodedUrl: varchar({ length: 500 }),
	transcodedKey: varchar({ length: 500 }),
	transcodeStatus: mysqlEnum(['none','pending','processing','completed','failed']).default('none'),
	transcodeError: text(),
	videoCodec: varchar({ length: 50 }),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	metadata: json(),
},
(table) => [
	index("idx_media_deleted").on(table.deletedAt),
]);

export const organizations = mysqlTable("organizations", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	logoUrl: varchar({ length: 500 }),
	logoKey: varchar({ length: 500 }),
	subscriptionTier: mysqlEnum(['starter','professional','pilot']).default('starter').notNull(),
	type: mysqlEnum(['drone_service_provider','municipality','engineering_firm','other']).default('drone_service_provider').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	brandColor: varchar({ length: 20 }),
});

export const projectCollaborators = mysqlTable("project_collaborators", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	userId: int().notNull(),
	role: mysqlEnum(['viewer','editor','vendor']).default('viewer').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const projectInvitations = mysqlTable("project_invitations", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	invitedBy: int().notNull(),
	email: varchar({ length: 320 }).notNull(),
	token: varchar({ length: 64 }).notNull(),
	role: mysqlEnum(['viewer','editor','vendor']).default('viewer').notNull(),
	status: mysqlEnum(['pending','accepted','expired','revoked']).default('pending').notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	acceptedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("project_invitations_token_unique").on(table.token),
]);

export const projectMembers = mysqlTable("project_members", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	userId: int().notNull(),
	role: mysqlEnum(['owner','vendor','viewer']).default('viewer').notNull(),
	canEdit: mysqlEnum(['yes','no']).default('no').notNull(),
	canDeleteMedia: mysqlEnum(['yes','no']).default('no').notNull(),
	canCreateFlights: mysqlEnum(['yes','no']).default('no').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const projectOverlays = mysqlTable("project_overlays", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	fileUrl: varchar({ length: 512 }).notNull(),
	opacity: decimal({ precision: 4, scale: 2 }).default('0.5'),
	coordinates: json(),
	isActive: int().default(1),
	label: varchar({ length: 100 }).default('Initial Plan'),
	versionNumber: int("version_number").default(1),
	rotation: decimal({ precision: 7, scale: 4 }).default('0'),
	originalCoordinates: json("original_coordinates"),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const projectDocuments = mysqlTable("project_documents", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileKey: varchar({ length: 512 }).notNull(),
	fileType: varchar({ length: 50 }).notNull(),
	status: varchar({ length: 50 }).default('uploaded'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const projectTemplates = mysqlTable("project_templates", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	isSystem: mysqlEnum(['yes','no']).default('no').notNull(),
	config: text().notNull(),
	useCount: int().default(0).notNull(),
	lastUsedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const projects = mysqlTable("projects", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	location: varchar({ length: 500 }),
	clientName: varchar({ length: 255 }),
	status: mysqlEnum(['active','completed','archived']).default('active').notNull(),
	flightDate: timestamp({ mode: 'string' }),
	coverImage: varchar({ length: 500 }),
	mediaCount: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	warrantyStartDate: timestamp({ mode: 'string' }),
	warrantyEndDate: timestamp({ mode: 'string' }),
	logoUrl: varchar({ length: 500 }),
	logoKey: varchar({ length: 500 }),
	clientId: int(),
	dronePilot: varchar({ length: 255 }),
	faaLicenseNumber: varchar({ length: 100 }),
	laancAuthNumber: varchar({ length: 100 }),
	organizationId: int(),
	deletedAt: timestamp({ mode: 'string' }),
	deletedBy: int(),
	isPinned: tinyint({ unsigned: false }).default(0).notNull(),
},
(table) => [
	index("idx_projects_deleted").on(table.deletedAt),
]);

export const referrals = mysqlTable("referrals", {
	id: int().autoincrement().notNull(),
	referrerId: int().notNull(),
	refereeName: varchar({ length: 255 }).notNull(),
	refereeEmail: varchar({ length: 255 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	emailSent: tinyint({ unsigned: false }).default(0).notNull(),
	refereeUserId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin','webmaster','client']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	logoUrl: varchar({ length: 500 }),
	logoKey: varchar({ length: 500 }),
	watermarkUrl: varchar({ length: 500 }),
	watermarkKey: varchar({ length: 500 }),
	defaultDronePilot: varchar({ length: 255 }),
	defaultFaaLicenseNumber: varchar({ length: 100 }),
	defaultLaancAuthNumber: varchar({ length: 100 }),
	stripeCustomerId: varchar({ length: 255 }),
	stripeSubscriptionId: varchar({ length: 255 }),
	subscriptionTier: mysqlEnum(['free','starter','professional','business','enterprise']).default('free').notNull(),
	subscriptionStatus: mysqlEnum(['active','canceled','past_due','trialing','incomplete']),
	billingPeriod: mysqlEnum(['monthly','annual']),
	currentPeriodStart: timestamp({ mode: 'string' }),
	currentPeriodEnd: timestamp({ mode: 'string' }),
	cancelAtPeriodEnd: mysqlEnum(['yes','no']).default('no'),
	organization: varchar({ length: 255 }),
	passwordHash: varchar({ length: 255 }),
	setupCompleted: tinyint().default(0).notNull(),
	companyName: varchar({ length: 255 }),
	department: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	organizationId: int(),
	orgRole: mysqlEnum(['PROVIDER','ORG_ADMIN','ORG_USER']).default('ORG_USER'),
	trialEndsAt: timestamp({ mode: 'string' }),
},
(table) => [
		index("users_openId_unique").on(table.openId),
		uniqueIndex("users_email_unique").on(table.email),
	]);

export const warrantyReminders = mysqlTable("warranty_reminders", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	userId: int().notNull(),
	reminderEmail: varchar({ length: 320 }).notNull(),
	intervals: varchar({ length: 100 }).notNull(),
	emailSubject: varchar({ length: 255 }),
	emailMessage: text(),
	enabled: mysqlEnum(['yes','no']).default('yes').notNull(),
	lastSentAt: timestamp({ mode: 'string' }),
	nextReminderDate: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const onboardingLeads = mysqlTable("onboarding_leads", {
	id: int().autoincrement().notNull(),
	email: varchar({ length: 320 }).notNull(),
	projectId: int().notNull(),
	projectName: varchar({ length: 255 }),
	// 'pending' = claimed but not signed up, 'converted' = completed /welcome signup, 'recovery_sent' = recovery email fired
	status: mysqlEnum(['pending', 'converted', 'recovery_sent']).default('pending').notNull(),
	recoveryScheduledAt: timestamp({ mode: 'string' }),
	recoverySentAt: timestamp({ mode: 'string' }),
	convertedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ─── Inferred Type Exports ───────────────────────────────────────────────────
// Allow components to import types: import type { Project } from '../../../drizzle/schema'
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

export type Media = InferSelectModel<typeof media>;
export type NewMedia = InferInsertModel<typeof media>;

export type Flight = InferSelectModel<typeof flights>;
export type NewFlight = InferInsertModel<typeof flights>;

export type ProjectOverlay = InferSelectModel<typeof projectOverlays>;
export type NewProjectOverlay = InferInsertModel<typeof projectOverlays>;

export type ProjectDocument = InferSelectModel<typeof projectDocuments>;
export type NewProjectDocument = InferInsertModel<typeof projectDocuments>;

export type ProjectTemplate = InferSelectModel<typeof projectTemplates>;
export type NewProjectTemplate = InferInsertModel<typeof projectTemplates>;

export type Client = InferSelectModel<typeof clients>;
export type NewClient = InferInsertModel<typeof clients>;

export type Organization = InferSelectModel<typeof organizations>;
export type NewOrganization = InferInsertModel<typeof organizations>;

export type Referral = InferSelectModel<typeof referrals>;
export type WarrantyReminder = InferSelectModel<typeof warrantyReminders>;

// Legacy Insert* aliases for backward compatibility with server/db.ts
export type InsertFlight = InferInsertModel<typeof flights>;
export type InsertMedia = InferInsertModel<typeof media>;
export type InsertProject = InferInsertModel<typeof projects>;
export type InsertProjectCollaborator = InferInsertModel<typeof projectCollaborators>;
export type InsertProjectInvitation = InferInsertModel<typeof projectInvitations>;
export type InsertUser = InferInsertModel<typeof users>;
export type InsertWarrantyReminder = InferInsertModel<typeof warrantyReminders>;
export type InsertClient = InferInsertModel<typeof clients>;
export type InsertClientUser = InferInsertModel<typeof clientUsers>;
export type InsertClientInvitation = InferInsertModel<typeof clientInvitations>;
export type InsertClientProjectAssignment = InferInsertModel<typeof clientProjectAssignments>;
