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

        const msg = {
          to: task.userEmail,
          from: { email: SENDER_EMAIL, name: APP_NAME },
          subject: `⏰ Reminder: "${task.title}" is due soon`,
          html: `
            <h2 style="color:#4f46e5;">${APP_NAME}</h2>
            <p>Hi there,</p>
            <p>Your task <strong>"${task.title}"</strong> is due at <strong>${formattedTime}</strong>.</p>
            ${
              task.priority
                ? `<p>Priority: <strong>${task.priority}</strong></p>`
                : ""
            }
            <p>Status: <strong>${task.status}</strong></p>
            <p>Please make sure to complete it on time!</p>
            <hr/>
            <p style="font-size:12px;color:#777;">This is an automated reminder from ${APP_NAME}.</p>
          `,
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
        const htmlLines = [
          `<h2 style="color:#4f46e5;">${APP_NAME}</h2>`,
          `<p>Hi there,</p>`,
          `<p>This is a reminder that you have an upcoming plan:</p>`,
          `<p><strong>${title}</strong></p>`,
          agenda ? `<p><strong>Agenda:</strong> ${agenda}</p>` : "",
          where ? `<p><strong>Where:</strong> ${where}</p>` : "",
          `<p><strong>When:</strong> ${formattedStart}</p>`,
          `<p>Good luck, and stay productive! 🚀</p>`,
          `<hr/>`,
          `<p style="font-size:12px;color:#777;">This is an automated planner reminder from ${APP_NAME}.</p>`,
        ].filter(Boolean);

        const msg = {
          to: userEmail,
          from: { email: SENDER_EMAIL, name: APP_NAME },
          subject,
          html: htmlLines.join(""),
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
