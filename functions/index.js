/* ==========================================================
   ✅ FIREBASE CLOUD FUNCTION — DEADLINE & PLANNER REMINDERS (v2, env vars)
   ========================================================== */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import sgMail from "@sendgrid/mail";

// --- Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

// --- Load SendGrid config from environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_KEY || null;
const SENDER_EMAIL = process.env.SENDGRID_FROM || null; // MUST be your verified sender

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  logger.info("✅ SendGrid API key loaded from environment.");
} else {
  logger.warn(
    "⚠️ SENDGRID_KEY is not set in environment. Emails will NOT be sent."
  );
}

if (!SENDER_EMAIL) {
  logger.warn(
    "⚠️ SENDGRID_FROM is not set in environment. Emails will NOT be sent."
  );
}

const APP_NAME = "Task Master";

/* ==========================================================
   🎨 EMAIL TEMPLATE HELPERS (shared by tasks & planner)
   ========================================================== */

const EMAIL_PRIMARY_COLOR = "#4f46e5";

const emailBaseStyles = {
  body: `
    margin: 0;
    padding: 0;
    background-color: #f3f4f6;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  `,
  container: `
    max-width: 600px;
    margin: 24px auto;
    padding: 0 16px;
  `,
  card: `
    background-color: #ffffff;
    border-radius: 16px;
    padding: 24px 20px;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
    border: 1px solid #e5e7eb;
  `,
  headerTitle: `
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 4px 0;
  `,
  headerSubtitle: `
    font-size: 13px;
    color: #6b7280;
    margin: 0 0 16px 0;
  `,
  pill: `
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    background-color: rgba(79, 70, 229, 0.08);
    color: ${EMAIL_PRIMARY_COLOR};
  `,
  sectionTitle: `
    font-size: 13px;
    font-weight: 600;
    color: #4b5563;
    margin: 16px 0 8px 0;
  `,
  detailRowLabel: `
    font-size: 12px;
    color: #6b7280;
    width: 110px;
    vertical-align: top;
    padding: 2px 0;
  `,
  detailRowValue: `
    font-size: 13px;
    color: #111827;
    padding: 2px 0;
  `,
  footer: `
    font-size: 11px;
    color: #9ca3af;
    text-align: center;
    margin-top: 18px;
  `,
};

function wrapEmailLayout(content, { title = "", preheader = "" } = {}) {
  // Preheader is placed first in body so inbox preview looks nice
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="${emailBaseStyles.body}">
      <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">
        ${preheader}
      </span>
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <div style="${emailBaseStyles.container}">
              ${content}
              <p style="${emailBaseStyles.footer}">
                You’re receiving this email because you enabled notifications in ${APP_NAME}.<br/>
                If you’d like to stop these, you can adjust your notification settings inside the app.
              </p>
            </div>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

/** Task deadline reminder template */
function buildTaskReminderHtml({
  taskTitle,
  formattedTime,
  priority,
  status,
}) {
  const content = `
    <div style="${emailBaseStyles.card}">
      <div style="margin-bottom: 16px;">
        <span style="${emailBaseStyles.pill}">Task Due</span>
      </div>

      <h1 style="${emailBaseStyles.headerTitle}">
        Reminder: “${taskTitle}”
      </h1>
      <p style="${emailBaseStyles.headerSubtitle}">
        Hi there, this is a friendly reminder from ${APP_NAME}. You have a task that is due soon. Review the details below and update your progress when you’re done.
      </p>

      <h2 style="${emailBaseStyles.sectionTitle}">
        Task details
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="${emailBaseStyles.detailRowLabel}">Task</td>
          <td style="${emailBaseStyles.detailRowValue}">
            <strong>${taskTitle}</strong>
          </td>
        </tr>
        <tr>
          <td style="${emailBaseStyles.detailRowLabel}">Due</td>
          <td style="${emailBaseStyles.detailRowValue}">
            ${formattedTime}
          </td>
        </tr>
        ${
          priority
            ? `
        <tr>
          <td style="${emailBaseStyles.detailRowLabel}">Priority</td>
          <td style="${emailBaseStyles.detailRowValue}">
            ${priority}
          </td>
        </tr>`
            : ""
        }
        <tr>
          <td style="${emailBaseStyles.detailRowLabel}">Status</td>
          <td style="${emailBaseStyles.detailRowValue}">
            ${status || "Not set"}
          </td>
        </tr>
      </table>

      <p style="font-size:13px;color:#4b5563;margin-top:18px;">
        Open <strong>${APP_NAME}</strong> to check this task off once you’re done ✅
      </p>
    </div>
  `;

  return wrapEmailLayout(content, {
    title: `${APP_NAME} · Task due reminder`,
    preheader: `“${taskTitle}” is due at ${formattedTime}.`,
  });
}

/** Planner upcoming plan reminder template */
function buildPlannerReminderHtml({
  title,
  agenda,
  where,
  formattedStart,
}) {
  const content = `
    <div style="${emailBaseStyles.card}">
      <div style="margin-bottom: 16px;">
        <span style="${emailBaseStyles.pill}">Planner</span>
      </div>

      <h1 style="${emailBaseStyles.headerTitle}">
        Upcoming: “${title}”
      </h1>
      <p style="${emailBaseStyles.headerSubtitle}">
        Hi there, this is a reminder from ${APP_NAME}. You have something scheduled in your planner. Here are the details:
      </p>

      <h2 style="${emailBaseStyles.sectionTitle}">
        Event details
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="${emailBaseStyles.detailRowLabel}">Title</td>
          <td style="${emailBaseStyles.detailRowValue}">
            <strong>${title}</strong>
          </td>
        </tr>
        <tr>
          <td style="${emailBaseStyles.detailRowLabel}">When</td>
          <td style="${emailBaseStyles.detailRowValue}">
            ${formattedStart}
          </td>
        </tr>
        ${
          agenda
            ? `
        <tr>
          <td style="${emailBaseStyles.detailRowLabel}">Agenda</td>
          <td style="${emailBaseStyles.detailRowValue}">
            ${agenda}
          </td>
        </tr>`
            : ""
        }
        ${
          where
            ? `
        <tr>
          <td style="${emailBaseStyles.detailRowLabel}">Where</td>
          <td style="${emailBaseStyles.detailRowValue}">
            ${where}
          </td>
        </tr>`
            : ""
        }
      </table>

      <p style="font-size:13px;color:#4b5563;margin-top:18px;">
        Stay on top of your schedule with <strong>${APP_NAME}</strong> 🚀
      </p>
    </div>
  `;

  return wrapEmailLayout(content, {
    title: `${APP_NAME} · Planner reminder`,
    preheader: `“${title}” is scheduled at ${formattedStart}.`,
  });
}

/* ==========================================================
   ⏰ Scheduled reminder function — TASK DEADLINES
   ========================================================== */
export const sendDeadlineReminders = onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "Asia/Manila",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async () => {
    try {
      if (!SENDGRID_API_KEY || !SENDER_EMAIL) {
        logger.error(
          "❌ SENDGRID_KEY or SENDGRID_FROM missing. Skipping email sending for this run."
        );
        return null;
      }

      const now = new Date();
      const REMINDER_WINDOW_MINUTES = 60;
      const windowEnd = new Date(
        now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000
      );

      logger.info(
        `🔍 Checking tasks due between now and +${REMINDER_WINDOW_MINUTES} minutes`,
        {
          nowIso: now.toISOString(),
          windowEndIso: windowEnd.toISOString(),
        }
      );

      const tasksSnap = await db
        .collectionGroup("tasks")
        .where("dueDate", ">", now)
        .where("dueDate", "<=", windowEnd)
        .get();

      logger.info(`📊 Task query returned ${tasksSnap.size} docs`);

      if (tasksSnap.empty) {
        logger.info("✅ No tasks due within the reminder window.");
        return null;
      }

      const reminders = [];

      for (const docSnap of tasksSnap.docs) {
        const task = docSnap.data();

        // log each candidate task for sanity
        logger.info("🔎 Candidate task", {
          id: docSnap.id,
          title: task.title,
          status: task.status,
          userEmail: task.userEmail,
          emailReminderSent: task.emailReminderSent || false,
          dueDateIso: task.dueDate?.toDate
            ? task.dueDate.toDate().toISOString()
            : String(task.dueDate),
        });

        if (task.status === "Done") continue;
        if (task.emailReminderSent) continue;
        if (!task.userEmail) {
          logger.warn(
            `⚠️ Task ${docSnap.id} has no userEmail, skipping reminder.`
          );
          continue;
        }

        const dueDate = task.dueDate?.toDate
          ? task.dueDate.toDate()
          : new Date(task.dueDate);

        const formattedTime = dueDate.toLocaleString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "short",
        });

        // 🔁 NEW: use nicer HTML template, same data
        const html = buildTaskReminderHtml({
          taskTitle: task.title || "Task",
          formattedTime,
          priority: task.priority || "",
          status: task.status || "",
        });

        const msg = {
          to: task.userEmail,
          from: { email: SENDER_EMAIL, name: APP_NAME },
          subject: `⏰ Reminder: "${task.title}" is due soon`,
          html,
        };

        const emailPromise = sgMail
          .send(msg)
          .then(() => {
            logger.info(
              `📧 Reminder email sent to ${task.userEmail} for task "${task.title}".`
            );
          })
          .catch((err) => {
            const body = err?.response?.body;
            logger.error("❌ SendGrid email failed:", body || String(err));
          });

        const pathParts = docSnap.ref.path.split("/"); // users/{uid}/boards/{bid}/tasks/{tid}
        const userId = pathParts[1];

        const notifPromise = db
          .collection("users")
          .doc(userId)
          .collection("notifications")
          .add({
            title: "Task Due Soon",
            message: `"${task.title}" is due at ${formattedTime}.`,
            type: "warning",
            createdAt: FieldValue.serverTimestamp(),
          });

        const markSentPromise = docSnap.ref.update({
          emailReminderSent: true,
        });

        reminders.push(
          Promise.all([emailPromise, notifPromise, markSentPromise])
        );
      }

      await Promise.all(reminders);
      logger.info(`✅ All task reminders processed. Count = ${reminders.length}`);
      return null;
    } catch (err) {
      logger.error("❌ sendDeadlineReminders failed (outer catch):", err);
      throw err;
    }
  }
);

/* ==========================================================
   🧪 Debug endpoint – inspect TASK window and tasks
   ========================================================== */

export const debugDeadlineWindow = onRequest(async (req, res) => {
  try {
    const now = new Date();
    const REMINDER_WINDOW_MINUTES = 60;
    const windowEnd = new Date(
      now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000
    );

    const allTasksSnap = await db.collectionGroup("tasks").get();

    const rows = [];
    allTasksSnap.forEach((docSnap) => {
      const t = docSnap.data();
      if (!t.dueDate) return;

      const due = t.dueDate?.toDate
        ? t.dueDate.toDate()
        : new Date(t.dueDate);

      const inWindow = due > now && due <= windowEnd;

      rows.push({
        id: docSnap.id,
        path: docSnap.ref.path,
        title: t.title,
        status: t.status,
        userEmail: t.userEmail,
        emailReminderSent: t.emailReminderSent || false,
        dueIso: due.toISOString(),
        inWindow,
      });
    });

    res.status(200).json({
      nowIso: now.toISOString(),
      windowEndIso: windowEnd.toISOString(),
      totalTasks: rows.length,
      tasks: rows,
    });
  } catch (err) {
    logger.error("❌ debugDeadlineWindow failed:", err);
    res.status(500).send(String(err));
  }
});

/* ==========================================================
   📅 Scheduled reminder function — UPCOMING PLANS (Planner)
   🚀 PRODUCTION: runs hourly, checks next 24 hours
   ========================================================== */

export const sendUpcomingPlanReminders = onSchedule(
  {
    schedule: "every 60 minutes", // production: hourly
    timeZone: "Asia/Manila",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async () => {
    try {
      if (!SENDGRID_API_KEY || !SENDER_EMAIL) {
        logger.error(
          "❌ SENDGRID_KEY or SENDGRID_FROM missing. Skipping upcoming plan emails for this run."
        );
        return null;
      }

      const now = new Date();
      const REMINDER_WINDOW_HOURS = 24; // 🔥 send reminders for plans within the next day
      const windowEnd = new Date(
        now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000
      );

      logger.info(
        `🔍 Checking planner events starting between now and +${REMINDER_WINDOW_HOURS} hours`,
        {
          nowIso: now.toISOString(),
          windowEndIso: windowEnd.toISOString(),
        }
      );

      const plansSnap = await db
        .collectionGroup("plannerEvents")
        .where("start", ">", now)
        .where("start", "<=", windowEnd)
        .where("upcomingEmailSent", "==", false)
        .get();

      logger.info(`📊 Planner query returned ${plansSnap.size} docs`);

      if (plansSnap.empty) {
        logger.info("✅ No upcoming plans within the reminder window.");
        return null;
      }

      const jobs = [];

      for (const docSnap of plansSnap.docs) {
        const plan = docSnap.data();

        logger.info("🔎 Candidate plan", {
          id: docSnap.id,
          title: plan.title,
          agenda: plan.agenda,
          where: plan.where,
          upcomingEmailSent: plan.upcomingEmailSent || false,
          startIso: plan.start?.toDate
            ? plan.start.toDate().toISOString()
            : String(plan.start),
        });

        const startDate = plan.start?.toDate
          ? plan.start.toDate()
          : new Date(plan.start);

        if (isNaN(startDate.getTime())) {
          logger.warn(
            `⚠️ Plan ${docSnap.id} has invalid start date, skipping.`
          );
          continue;
        }

        // Derive user id from path: users/{uid}/plannerEvents/{eventId}
        const pathParts = docSnap.ref.path.split("/");
        const usersIndex = pathParts.indexOf("users");
        const userId =
          usersIndex >= 0 && pathParts.length > usersIndex + 1
            ? pathParts[usersIndex + 1]
            : null;

        if (!userId) {
          logger.warn(
            `⚠️ Could not determine userId from path ${docSnap.ref.path}, skipping.`
          );
          continue;
        }

        // Get user email from /users/{uid}
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data();
        const userEmail = userData?.email;

        if (!userEmail) {
          logger.warn(
            `⚠️ User ${userId} has no email in /users/{uid}, skipping plan ${docSnap.id}.`
          );
          continue;
        }

        const title = plan.title || "Upcoming plan";
        const agenda = plan.agenda || "";
        const where = plan.where || "";

        const formattedStart = startDate.toLocaleString("en-PH", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const subject = `📅 Reminder: "${title}" is coming up`;

        // 🔁 NEW: use shared planner email template
        const html = buildPlannerReminderHtml({
          title,
          agenda,
          where,
          formattedStart,
        });

        const msg = {
          to: userEmail,
          from: { email: SENDER_EMAIL, name: APP_NAME },
          subject,
          html,
        };

        const emailPromise = sgMail
          .send(msg)
          .then(() => {
            logger.info(
              `📧 Upcoming plan email sent to ${userEmail} for plan "${title}".`
            );
          })
          .catch((err) => {
            const body = err?.response?.body;
            logger.error(
              "❌ SendGrid upcoming plan email failed:",
              body || String(err)
            );
          });

        const notifPromise = db
          .collection("users")
          .doc(userId)
          .collection("notifications")
          .add({
            title: "Upcoming Plan",
            message: `"${title}" is scheduled at ${formattedStart}.`,
            type: "info",
            createdAt: FieldValue.serverTimestamp(),
          });

        const markSentPromise = docSnap.ref.update({
          upcomingEmailSent: true,
        });

        jobs.push(Promise.all([emailPromise, notifPromise, markSentPromise]));
      }

      await Promise.all(jobs);
      logger.info(
        `✅ All upcoming plan reminders processed. Count = ${jobs.length}`
      );
      return null;
    } catch (err) {
      logger.error("❌ sendUpcomingPlanReminders failed (outer catch):", err);
      throw err;
    }
  }
);

/* ==========================================================
   🧪 Debug endpoint – inspect PLANNER window and plans (24h)
   ========================================================== */

export const debugUpcomingPlansWindow = onRequest(async (req, res) => {
  try {
    const now = new Date();
    const REMINDER_WINDOW_HOURS = 24;
    const windowEnd = new Date(
      now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000
    );

    const snap = await db.collectionGroup("plannerEvents").get();

    const rows = [];
    snap.forEach((docSnap) => {
      const p = docSnap.data();
      if (!p.start) return;

      const start = p.start?.toDate ? p.start.toDate() : new Date(p.start);
      if (isNaN(start.getTime())) return;

      const inWindow = start > now && start <= windowEnd;

      rows.push({
        id: docSnap.id,
        path: docSnap.ref.path,
        title: p.title,
        agenda: p.agenda,
        where: p.where,
        upcomingEmailSent: p.upcomingEmailSent || false,
        startIso: start.toISOString(),
        inWindow,
      });
    });

    res.status(200).json({
      nowIso: now.toISOString(),
      windowEndIso: windowEnd.toISOString(),
      totalPlans: rows.length,
      plans: rows,
    });
  } catch (err) {
    logger.error("❌ debugUpcomingPlansWindow failed:", err);
    res.status(500).send(String(err));
  }
});
