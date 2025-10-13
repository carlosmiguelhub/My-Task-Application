

import React, { useEffect, useState } from "react";
import { gapi } from "gapi-script";

const GoogleCalendarTest = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
  function start() {

    const CLIENT_ID = "117240353621-3k3kcvpfj42he8qtp76nfo0dp2u1ftr5.apps.googleusercontent.com";
    const API_KEY = "AIzaSyAa5iK_TyMaJ2YN9ZEVGCpjteCVLzhM4XY";
    const SCOPES = "https://www.googleapis.com/auth/calendar.events";

    gapi.client
      .init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: [
          "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
        ],
        scope: SCOPES,
      })
      .then(() => {
        const auth = gapi.auth2.getAuthInstance();
        setIsSignedIn(auth.isSignedIn.get());
        auth.isSignedIn.listen(setIsSignedIn);
      });
  }
  gapi.load("client:auth2", start);
}, []);

  const handleSignIn = () => gapi.auth2.getAuthInstance().signIn();
  const handleSignOut = () => gapi.auth2.getAuthInstance().signOut();

  const fetchEvents = async () => {
    const response = await gapi.client.calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 10,
      orderBy: "startTime",
    });
    setEvents(response.result.items);
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
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Fetch Events
            </button>
          </div>

          <h2 className="text-lg font-semibold mb-3">Upcoming Events</h2>
          <ul className="space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-sm"
              >
                <strong>{event.summary}</strong>
                <p className="text-sm text-slate-500">
                  {new Date(event.start.dateTime || event.start.date).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default GoogleCalendarTest;
