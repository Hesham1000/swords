import 'dotenv/config';
import { db } from '../app/lib/db';
import { users } from '../app/lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function run() {
  const hashed = await bcrypt.hash('Swords@2024', 10);
  await db.insert(users).values({
    username: 'admin2',
    email: 'admin@swords.test',
    password: hashed,
    isActive: true,
    roles: ['admin'],
  }).onConflictDoNothing();
  await db.update(users).set({ password: hashed, isActive: true }).where(eq(users.email, 'testadmin@example.com'));
  console.log('done');
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });

