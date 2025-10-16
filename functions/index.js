/* ==========================================================
   ✅ FIREBASE CLOUD FUNCTION — DEADLINE REMINDER SYSTEM
   ========================================================== */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

// --- Initialize Firebase Admin
admin.initializeApp();

// --- Load SendGrid key safely
const SENDGRID_API_KEY = functions.config().sendgrid?.key;
if (!SENDGRID_API_KEY) {
  logger.error("❌ Missing SendGrid API key in Firebase config!");
  throw new Error("Missing SendGrid API key");
}
sgMail.setApiKey(SENDGRID_API_KEY);

// --- Constants
const APP_NAME = "WorkLoon Planner";
const SENDER_EMAIL = "noreply@yourapp.com";

// --- Scheduled Function
export const sendDeadlineReminders = onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "Asia/Manila",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async () => {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const db = admin.firestore();

      const tasksSnap = await db
        .collectionGroup("tasks")
        .where("status", "!=", "Done")
        .where("dueDate", ">", now)
        .where("dueDate", "<=", oneHourLater)
        .get();

      if (tasksSnap.empty) {
        logger.info("✅ No tasks due within the next hour.");
        return null;
      }

      const reminders = [];

      for (const doc of tasksSnap.docs) {
        const task = doc.data();
        if (!task.userEmail) continue;

        const dueDate = task.dueDate.toDate();
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
            <p>Priority: <strong>${task.priority}</strong></p>
            <p>Please make sure to complete it on time!</p>
            <hr/>
            <p style="font-size:12px;color:#777;">This is an automated reminder from ${APP_NAME}.</p>
          `,
        };

        const emailPromise = sgMail.send(msg);
        const userId = doc.ref.path.split("/")[1];

        const notifPromise = db
          .collection("users")
          .doc(userId)
          .collection("notifications")
          .add({
            title: "Task Due Soon",
            message: `"${task.title}" is due at ${formattedTime}.`,
            type: "warning",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        reminders.push(Promise.all([emailPromise, notifPromise]));
      }

      await Promise.all(reminders);
      logger.info("✅ All reminders processed successfully.");
      return null;
    } catch (err) {
      logger.error("❌ sendDeadlineReminders failed:", err);
      throw err;
    }
  }
);
