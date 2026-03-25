# Firestore Security Rules

Вставить в **Firebase Console → Firestore Database → Rules**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isDocOwner() {
      return isAuthenticated() && request.auth.uid == resource.data.userId;
    }

    function isAdmin() {
      return isAuthenticated() &&
        ((exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') ||
         (request.auth.token.email == "ryvgrin@gmail.com" && request.auth.token.email_verified == true) ||
         (request.auth.token.email == "roman.grinberg.at@gmail.com" && request.auth.token.email_verified == true));
    }

    // Пользователи
    match /users/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) || isAdmin();
    }

    // Прогресс
    match /progress/{progressId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && isDocOwner();
      allow delete: if isAuthenticated() && (isDocOwner() || isAdmin());
    }

    // Напоминания
    match /reminders/{uid} {
      allow read, write: if isOwner(uid) || isAdmin();
    }

    // Бейджи
    match /badges/{badgeId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if false;
      allow delete: if isAdmin();
    }

    // Кураторские уроки
    match /curated_lessons/{day} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Хаврута
    match /chavruta_requests/{requestId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && isDocOwner();
      allow delete: if isAuthenticated() && (isDocOwner() || isAdmin());
    }

    // Чаты
    match /chats/{chatId} {
      allow read: if isAuthenticated() && (request.auth.uid in resource.data.participants || isAdmin());
      allow create, update: if isAuthenticated() && request.auth.uid in resource.data.participants;

      match /messages/{messageId} {
        allow read: if isAuthenticated() &&
          request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        allow create: if isAuthenticated() &&
          request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants &&
          request.resource.data.senderId == request.auth.uid;
      }
    }

    // Избранное
    match /favorites/{favoriteId} {
      allow read: if isAuthenticated() && (isDocOwner() || isAdmin());
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && (isDocOwner() || isAdmin());
    }

    // История квизов
    match /quiz_attempts/{attemptId} {
      allow read: if isAuthenticated() && (isDocOwner() || isAdmin());
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }

    // Переводы (кэш)
    match /translations/{translationId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update: if isAdmin();
    }

    // Запрет всего остального
    match /{path=**} {
      allow read, write: if false;
    }
  }
}
```

## Коллекции и их назначение

| Коллекция | Кто читает | Кто пишет |
|---|---|---|
| `users` | Только владелец / админ | Только владелец / админ |
| `progress` | Только владелец / админ | Только владелец |
| `reminders` | Только владелец / админ | Только владелец / админ |
| `badges` | Только владелец / админ | Только владелец (create), immutable |
| `curated_lessons` | Все | Только админ |
| `chavruta_requests` | Авторизованные | Только владелец |
| `chats` + `messages` | Участники чата | Участники чата |
| `favorites` | Только владелец / админ | Только владелец |
| `quiz_attempts` | Только владелец / админ | Только владелец |
| `translations` | Все | Авторизованные (create), админ (update) |

## Админы

Права админа имеют:
- `ryvgrin@gmail.com`
- `roman.grinberg.at@gmail.com`
- Любой пользователь с полем `role: "admin"` в документе `/users/{uid}`
