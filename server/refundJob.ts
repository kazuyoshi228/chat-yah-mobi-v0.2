/**
 * OMAX eSIM Provisioning Monitor & Auto-Refund Job
 * Heartbeat handler: POST /api/scheduled/esim-monitor
 *
 * Flow:
 * 1. Scan esim_statuses for recently synced eSIMs (last 48h, status != 'active')
 * 2. Check each ICCID against OMAX API
 * 3. If provisioning_failed or activation_timeout → create esim_incident
 * 4. For each pending incident → Stripe refund → Resend email → mark resolved
 */

import type { Request, Response } from "express";
import { eq, and, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "./db";

import { esimStatuses, esimIncidents, purchases } from "../drizzle/schema";
import { getLinkStatus, isProvisioningFailed } from "./omax";
import { ENV } from "./_core/env";
import { Resend } from "resend";

// Lazy Stripe import to avoid startup errors when key is missing
async function getStripe() {
  const Stripe = (await import("stripe")).default;
  return new Stripe(ENV.stripeSecretKey, { apiVersion: "2026-06-24.dahlia" });
}

const resend = new Resend(ENV.resendApiKey);

// ──────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────
export async function esimMonitorHandler(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB not available" });
    const results = {
      checked: 0,
      incidentsCreated: 0,
      refundsProcessed: 0,
      errors: [] as string[],
    };

    // ── Step 1: Find eSIMs that might need attention ──
    // Look for esim_statuses where status is not 'active' and syncedAt is recent (48h)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const candidates = await db
      .select()
      .from(esimStatuses)
      .where(
        and(
          sql`${esimStatuses.syncedAt} > ${cutoff}`,
          sql`${esimStatuses.status} != 'active'`
        )
      )
      .limit(50);

    results.checked = candidates.length;

    // ── Step 2: Check each ICCID against OMAX API ──
    for (const esim of candidates) {
      if (!esim.iccid) continue;

      try {
        // Skip if incident already exists for this ICCID
        const existing = await db
          .select({ id: esimIncidents.id })
          .from(esimIncidents)
          .where(eq(esimIncidents.iccid, esim.iccid))
          .limit(1);
        if (existing.length > 0) continue;

        const omaxData = await getLinkStatus(esim.iccid);
        if (!omaxData) continue;

        const failed = isProvisioningFailed(omaxData.status);
        const activationTimeout =
          omaxData.status === "not_installed" &&
          new Date(omaxData.created_at).getTime() < Date.now() - 60 * 60 * 1000; // 1h timeout

        if (!failed && !activationTimeout) continue;

        // Find matching purchase for email + Stripe payment intent
        const purchase = esim.externalOrderId
          ? (
              await db
                .select()
                .from(purchases)
                .where(eq(purchases.externalOrderId, esim.externalOrderId))
                .limit(1)
            )[0]
          : null;

        // Create incident record
        await db.insert(esimIncidents).values({
          iccid: esim.iccid,
          externalOrderId: esim.externalOrderId ?? null,
          externalUserId: esim.externalUserId ?? null,
          email: purchase?.email ?? null,
          incidentType: activationTimeout ? "activation_timeout" : "provisioning_failed",
          omaxStatus: omaxData.status,
          stripePaymentIntentId: purchase?.stripePaymentIntentId ?? null,
          refundAmountYen: purchase?.priceYen ?? null,
          refundStatus: "pending",
          notes: `OMAX status: ${omaxData.status} | Detected by monitor job`,
        });

        results.incidentsCreated++;
      } catch (err) {
        results.errors.push(`ICCID ${esim.iccid}: ${String(err)}`);
      }
    }

    // ── Step 3: Process pending refunds ──
    const pendingIncidents = await db
      .select()
      .from(esimIncidents)
      .where(
        and(
          eq(esimIncidents.refundStatus, "pending"),
          isNull(esimIncidents.resolvedAt)
        )
      )
      .limit(20);

    for (const incident of pendingIncidents) {
      try {
        await processRefund(incident, db, results);
      } catch (err) {
        results.errors.push(`Incident #${incident.id}: ${String(err)}`);
        await db
          .update(esimIncidents)
          .set({ refundStatus: "failed", notes: `${incident.notes ?? ""}\nError: ${String(err)}` })
          .where(eq(esimIncidents.id, incident.id));
      }
    }

    res.json({ ok: true, ...results });
  } catch (err) {
    console.error("[esimMonitor] Fatal error:", err);
    res.status(500).json({
      error: String(err),
      timestamp: new Date().toISOString(),
      context: { url: req.url },
    });
  }
}

// ──────────────────────────────────────────────
// Process a single refund
// ──────────────────────────────────────────────
type DbType = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function processRefund(
  incident: typeof esimIncidents.$inferSelect,
  db: DbType,
  results: { refundsProcessed: number }
) {
  // Mark as processing
  await db
    .update(esimIncidents)
    .set({ refundStatus: "processing" })
    .where(eq(esimIncidents.id, incident.id));

  let stripeRefundId: string | null = null;

  // ── Stripe refund ──
  if (incident.stripePaymentIntentId && ENV.stripeSecretKey) {
    const stripe = await getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: incident.stripePaymentIntentId,
      reason: "fraudulent", // closest to "service not provided"
      metadata: {
        incident_id: String(incident.id),
        iccid: incident.iccid ?? "",
        reason: incident.incidentType,
      },
    });
    stripeRefundId = refund.id;
  }

  // ── Resend email notification ──
  let notifiedAt: Date | null = null;
  if (incident.email) {
    const emailResult = await sendRefundEmail({
      email: incident.email,
      iccid: incident.iccid ?? "N/A",
      orderId: incident.externalOrderId ?? "N/A",
      amountYen: incident.refundAmountYen ?? 0,
      incidentType: incident.incidentType,
    });
    if (emailResult.success) notifiedAt = new Date();
  }

  // ── Mark resolved ──
  await db
    .update(esimIncidents)
    .set({
      refundStatus: "refunded",
      stripeRefundId: stripeRefundId ?? undefined,
      resolvedAt: new Date(),
      notifiedAt: notifiedAt ?? undefined,
      notes: `${incident.notes ?? ""}\nRefund processed: ${stripeRefundId ?? "no Stripe (no payment intent)"}`,
    })
    .where(eq(esimIncidents.id, incident.id));

  results.refundsProcessed++;
}

// ──────────────────────────────────────────────
// Refund email (Japanese + English)
// ──────────────────────────────────────────────
async function sendRefundEmail(params: {
  email: string;
  iccid: string;
  orderId: string;
  amountYen: number;
  incidentType: string;
}) {
  const { email, iccid, orderId, amountYen, incidentType } = params;

  const reasonJa =
    incidentType === "activation_timeout"
      ? "eSIMのアクティベーションがタイムアウトしました"
      : "eSIMのプロビジョニングに失敗しました";

  const reasonEn =
    incidentType === "activation_timeout"
      ? "eSIM activation timed out"
      : "eSIM provisioning failed";

  try {
    await resend.emails.send({
      from: ENV.resendFromEmail || "support@yah.mobi",
      to: email,
      subject: "【yah.mobile】eSIM返金のご案内 / Refund Notice",
      html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a2e;">yah.mobile eSIM 返金のご案内</h2>
  <p>いつもyah.mobileをご利用いただきありがとうございます。</p>
  <p>以下のeSIMについて、<strong>${reasonJa}</strong>ため、ご購入金額の全額を返金いたします。</p>
  
  <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
    <tr style="background: #f5f5f5;">
      <td style="padding: 8px 12px; border: 1px solid #ddd;"><strong>注文番号</strong></td>
      <td style="padding: 8px 12px; border: 1px solid #ddd;">${orderId}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #ddd;"><strong>ICCID</strong></td>
      <td style="padding: 8px 12px; border: 1px solid #ddd;">${iccid}</td>
    </tr>
    <tr style="background: #f5f5f5;">
      <td style="padding: 8px 12px; border: 1px solid #ddd;"><strong>返金金額</strong></td>
      <td style="padding: 8px 12px; border: 1px solid #ddd;">¥${amountYen.toLocaleString()}</td>
    </tr>
  </table>
  
  <p>返金はご購入時のお支払い方法に3〜5営業日以内に反映されます。</p>
  <p>ご不明な点がございましたら、チャットサポートよりお問い合わせください。</p>
  
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
  
  <h3 style="color: #1a1a2e;">Refund Notice (English)</h3>
  <p>Thank you for using yah.mobile.</p>
  <p>We are issuing a full refund for your eSIM purchase due to: <strong>${reasonEn}</strong>.</p>
  <p>Order ID: ${orderId} | ICCID: ${iccid} | Amount: ¥${amountYen.toLocaleString()}</p>
  <p>The refund will appear on your original payment method within 3–5 business days.</p>
  <p>If you have any questions, please contact us via chat support.</p>
</div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error("[refundJob] Email send error:", err);
    return { success: false, error: String(err) };
  }
}
