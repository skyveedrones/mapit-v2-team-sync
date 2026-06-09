import { getDb } from './server/db.ts';
import { users, clientUsers } from './drizzle/schema.ts';
import bcryptjs from 'bcryptjs';
import { nanoid } from 'nanoid';

const email = 'cmcquiston@forneytx.gov';
const plan = 'professional';
const clientId = 4560005;

const temporaryPassword = Math.random().toString(36).slice(-12);
const passwordHash = await bcryptjs.hash(temporaryPassword, 10);
const openId = nanoid(32);

console.log('Creating user...');
console.log('Email:', email);
console.log('Plan:', plan);
console.log('Temporary Password:', temporaryPassword);
console.log('OpenId:', openId);

const db = await getDb();
if (!db) throw new Error('Database not initialized');

// Insert user
const result = await db.insert(users).values({
  openId,
  email,
  name: 'cmcquiston',
  passwordHash,
  loginMethod: 'password',
  subscriptionTier: plan,
  setupCompleted: 0,
});

console.log('User created successfully');

// Get the user ID
const user = await db.select().from(users).where(users.email === email).limit(1);
if (user.length === 0) throw new Error('User not found after creation');

const userId = user[0].id;
console.log('User ID:', userId);

// Assign to client
const clientResult = await db.insert(clientUsers).values({
  clientId,
  userId,
  role: 'user',
});

console.log('User assigned to client successfully');
console.log('\nUser created and assigned!');
console.log('Email:', email);
console.log('Temporary Password:', temporaryPassword);
console.log('Client ID:', clientId);
