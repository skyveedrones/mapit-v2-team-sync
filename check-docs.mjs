import { createRequire } from 'module';
import { config } from 'dotenv';
config();

// Load env
const { getDb } = await import('./server/db.ts');
const { projectDocuments } = await import('./drizzle/schema.ts');
const { eq } = await import('drizzle-orm');

const db = await getDb();
const docs = await db.select().from(projectDocuments).where(eq(projectDocuments.projectId, 30001));
console.log(JSON.stringify(docs.map(d => ({id: d.id, name: d.name, fileKey: d.fileKey, fileUrl: d.fileUrl})), null, 2));
process.exit(0);
