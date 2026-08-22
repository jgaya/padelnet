importScripts(
    "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js",
);
importScripts(
    "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
    apiKey: "AIzaSyA1j_aC1a5FwkP3HBVnc77RbtsEr_nYYO4",
    authDomain: "padel-dc6f7.firebaseapp.com",
    projectId: "padel-dc6f7",
    messagingSenderId: "550505077465",
    appId: "1:550505077465:web:e50641377ddd2c4eb1fcc8",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: "/icon.png",
    });
});