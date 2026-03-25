importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// This will be replaced by the build system or you can hardcode if you have the config
// For AIS, we can try to fetch the config or just use the one from the app
// However, service workers are tricky with relative paths.
// A better way is to initialize with the config directly.

firebase.initializeApp({
  apiKey: "AIzaSyCYQ1VySaSi5CYXPgvnbygzi26lIv-9BB4",
  authDomain: "gen-lang-client-0563099656.firebaseapp.com",
  projectId: "gen-lang-client-0563099656",
  storageBucket: "gen-lang-client-0563099656.firebasestorage.app",
  messagingSenderId: "133580551458",
  appId: "1:133580551458:web:b2cb4b50591946e7d7e17b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
