importScripts(
    "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js",
);
importScripts(
    "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
    apiKey: "AIzaSyDaJ-SC1rw0ogZq1T0GmX7I7fSzm_KH54U",
    authDomain: "padelnet-f2b1f.firebaseapp.com",
    projectId: "padelnet-f2b1f",
    messagingSenderId: "705903188285",
    appId: "1:705903188285:web:ef1c1fa1a42ad8d3360d54",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: "/icon.png",
    });
});