/* ==========================================================
   ✅ FIREBASE CLOUD FUNCTION — DEADLINE REMINDER SYSTEM (v2, env vars)
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

const APP_NAME = "WorkLoon Planner";

/* ==========================================================
   ⏰ Scheduled reminder function
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

      logger.info(`📊 Query returned ${tasksSnap.size} docs`);

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
            logger.error(
              "❌ SendGrid email failed:",
              body || err.toString()
            );
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
      logger.info(`✅ All reminders processed. Count = ${reminders.length}`);
      return null;
    } catch (err) {
      logger.error("❌ sendDeadlineReminders failed (outer catch):", err);
      throw err;
    }
  }
);

/* ==========================================================
   🧪 Debug endpoint – inspect window and tasks from server side
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
