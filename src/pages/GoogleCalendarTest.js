import React, { useEffect, useState } from "react";
import { gapi } from "gapi-script";

const GoogleCalendarTest = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const CLIENT_ID = "117240353621-3k3kcvpfj42he8qtp76nfo0dp2u1ftr5.apps.googleusercontent.com";
  const API_KEY = "AIzaSyAa5iK_TyMaJ2YN9ZEVGCpjteCVLzhM4XY";
  const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

  useEffect(() => {
    // 🧠 Catch hidden script errors
    window.onerror = function (msg, url, line, col, error) {
      console.error("Global error:", msg, "at", url, "line:", line, "col:", col, "error:", error);
    };

    const initClient = async () => {
      try {
        await gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
          ],
          scope: SCOPES,
        });

        const auth = gapi.auth2.getAuthInstance();
        setIsSignedIn(auth.isSignedIn.get());
        auth.isSignedIn.listen(setIsSignedIn);

        console.log("✅ GAPI initialized successfully");
      } catch (err) {
        console.error("❌ GAPI initialization error:", err);
      }
    };

    // Load client & auth2 modules before init
    gapi.load("client:auth2", initClient);
  }, []);

  const handleSignIn = async () => {
    try {
      await gapi.auth2.getAuthInstance().signIn();
      console.log("🔓 Signed in successfully");
    } catch (err) {
      console.error("Sign-in error:", err);
    }
  };

  const handleSignOut = async () => {
    try {
      await gapi.auth2.getAuthInstance().signOut();
      console.log("🔒 Signed out successfully");
      setEvents([]);
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await gapi.client.calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: "startTime",
      });

      setEvents(response.result.items || []);
      console.log("📅 Events fetched:", response.result.items);
    } catch (err) {
      console.error("❌ Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100">
      {!isSignedIn ? (
        <button
          onClick={handleSignIn}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Connect Google Calendar
        </button>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Sign Out
            </button>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
            >
              {loading ? "Loading..." : "Fetch Events"}
            </button>
          </div>

          <h2 className="text-lg font-semibold mb-3">Upcoming Events</h2>
          <ul className="space-y-2">
            {events.length > 0 ? (
              events.map((event) => (
                <li
                  key={event.id}
                  className="border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-sm"
                >
                  <strong>{event.summary || "(No title)"}</strong>
                  <p className="text-sm text-slate-500">
                    {event.start?.dateTime
                      ? new Date(event.start.dateTime).toLocaleString()
                      : new Date(event.start?.date).toLocaleDateString()}
                  </p>
                </li>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No upcoming events found.</p>
            )}
          </ul>
        </>
      )}
    </div>
  );
};

export default GoogleCalendarTest;
