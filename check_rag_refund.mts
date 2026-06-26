import { db } from './server/db';
import { ragDocuments } from './drizzle/schema';
import { inArray } from 'drizzle-orm';

const docs = await db.select().from(ragDocuments).where(inArray(ragDocuments.id, [30002, 60001]));
for (const doc of docs) {
  console.log('=== ID:', doc.id, '===');
  const lines = doc.content.split('\n');
  let inRefund = false;
  for (const line of lines) {
    if (line.match(/refund|return|cancel|返金|キャンセル/i)) inRefund = true;
    if (inRefund) console.log(line);
    if (inRefund && line.startsWith('---')) { inRefund = false; break; }
  }
}
process.exit(0);
