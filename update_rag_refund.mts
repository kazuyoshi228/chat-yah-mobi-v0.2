import { getDb } from './server/db';
import { ragDocuments } from './drizzle/schema';
import { eq } from 'drizzle-orm';

const db = await getDb();

// ---- English RAG (id: 30002) ----
const [enDoc] = await db.select({ content: ragDocuments.content })
  .from(ragDocuments)
  .where(eq(ragDocuments.id, 30002));

const newEnRefund = `## 9. Refund & Cancellation Policy
### Can I get a refund?
**No.** eSIM is a digital product (intangible content). Once your QR code is issued, cancellations and refunds are not available. This policy is in accordance with Japan's Act on Specified Commercial Transactions (Article 15-3).

At the final step of the purchase flow (Order Summary), you are required to check a consent box confirming that cancellations and refunds are not available after QR code issuance. The payment cannot proceed without this consent, so your agreement is confirmed at the time of purchase.

### What if I have a problem after purchase?
If you experience a technical issue, please contact our support team via chat before attempting any installation. We are available 24/7 and will do our best to assist you.

### Are there any exceptions?
The following cases are escalated individually to our operations team:

| Situation | Response |
|---|---|
| eSIM was not properly issued due to a yah.mobile system failure | Escalate to operations |
| Duplicate charge or payment error confirmed | Refund of duplicate amount only |
| Purchase by a minor without parental consent confirmed | Escalate to operations |
| Confirmed credit card fraud | Escalate to operations |

### Where can I find the full policy?
See the "Specified Commercial Transactions Act" page linked in the site footer. For any questions, please contact us via chat before purchasing.`;

// Use regex to replace the entire section 9
const updatedEnContent = enDoc.content.replace(
  /## 9\. Refund Policy[\s\S]*?(?=\n---\n)/,
  newEnRefund
);

if (updatedEnContent === enDoc.content) {
  console.log('ERROR: Regex did not match English refund section');
  const idx = enDoc.content.indexOf('## 9. Refund');
  if (idx >= 0) {
    console.log('Found at index', idx, ':', JSON.stringify(enDoc.content.substring(idx, idx+200)));
  }
} else {
  await db.update(ragDocuments).set({ content: updatedEnContent }).where(eq(ragDocuments.id, 30002));
  console.log('✅ English RAG (30002) updated');
}

// ---- Japanese RAG (id: 60001) ----
const [jaDoc] = await db.select({ content: ragDocuments.content })
  .from(ragDocuments)
  .where(eq(ragDocuments.id, 60001));

// Verify the update from previous run
const jaHasNewPolicy = jaDoc.content.includes('QRコード発行後の返金');
console.log('JA refund section:', jaHasNewPolicy ? '✅ Already updated' : '❌ Not updated');

// Also check other RAG docs for old refund policy
const allDocs = await db.select({ id: ragDocuments.id, title: ragDocuments.title, content: ragDocuments.content })
  .from(ragDocuments);

for (const doc of allDocs) {
  if (doc.id === 30002 || doc.id === 60001) continue;
  if (doc.content.match(/refund.*7 days|8 days.*refund|返金.*8日|8日.*返金/i)) {
    console.log(`⚠️  Found old refund policy in doc id=${doc.id} title="${doc.title}"`);
  }
  if (doc.content.match(/Full refunds are available/i)) {
    console.log(`⚠️  Found old refund text in doc id=${doc.id} title="${doc.title}"`);
  }
}

// Verify
const [verifyEn] = await db.select({ content: ragDocuments.content }).from(ragDocuments).where(eq(ragDocuments.id, 30002));
console.log('EN refund section:', verifyEn.content.includes('Once your QR code is issued') ? '✅ Updated' : '❌ Not updated');

process.exit(0);
