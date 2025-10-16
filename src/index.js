import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import "./index.css";

// ✅ (Optional) Initialize Firebase Cloud Messaging listener for in-app notifications
// import { onMessage } from "firebase/messaging";
// import { messaging } from "./firebase"; // make sure messaging is exported from firebase.js

// Listen for background push notifications
if (messaging) {
  onMessage(messaging, (payload) => {
    console.log("📩 Notification received:", payload);
    // You can later dispatch Redux action or show toast popup here
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
