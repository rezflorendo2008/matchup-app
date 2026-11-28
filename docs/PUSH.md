# Push notifications: setup

The app and the server are ready for push. Two things have to be supplied once per app, because they
belong to your Google and Apple developer accounts.

## What already works

- The app asks for permission, registers the phone (`POST /devices`) and shows the state on
  **Account → App → Notifications on this device**.
- The server sends every notification (match open, starting soon, result, diamonds added, verified,
  referral bonus, …) through Expo's push service to all of a user's phones, and through Web Push to
  their browsers / installed web app.
- Tapping a notification opens the right screen (`src/pushNav.ts`), also when the tap starts the app.
- Phones that uninstalled the app are removed automatically.

## Android: Firebase (required)

Without this file an Android build cannot get a push token, so the phone is never registered.

1. Open <https://console.firebase.google.com>, create (or open) a project and **Add app → Android**.
2. Package name: `com.pickarena.app` (must match `android.package` in `app.json`).
3. Download **`google-services.json`** and put it in the app's root folder (next to `app.json`).
   It is picked up automatically by `app.config.js` (or set `GOOGLE_SERVICES_JSON=/path/to/file`).
4. In the Firebase project: **Project settings → Service accounts → Generate new private key**.
   Upload that JSON to Expo: `eas credentials` → Android → *Google Service Account Key for Push
   Notifications (FCM V1)*. Expo uses it to deliver to Android.
5. Rebuild the app (`eas build -p android`, or the local Gradle build).

`google-services.json` is not a secret, but the **service account key is**: never commit it.

## iOS: Apple push key (required)

1. Run `eas credentials` → iOS → **Push Notifications: Set up a new key** (Expo creates the APNs key
   in your Apple Developer account), or upload an existing `.p8` key.
2. Rebuild with `eas build -p ios`. Push does not work in the iOS Simulator; test on a real iPhone.

## Server

- Optional but recommended: create an **Expo access token** (expo.dev → Account settings → Access
  tokens) and enable *Enhanced Security for Push Notifications* for the project. Save the token in
  **Admin → Platform settings → Expo access token** (or `EXPO_ACCESS_TOKEN` in `.env`).
- Notifications are sent by a queued job. The queue worker must be running
  (`php artisan queue:work`), which the deploy script already takes care of.

## Testing

- Server: `php artisan push:test player@example.com` sends a test notification to that user's
  phones and browsers and prints how many devices it reached.
- Admin: **Users → (a user) → Send test notification**.
- A real phone is needed: emulators and simulators cannot receive push, and Expo Go on Android
  cannot either. In those cases the Account row is hidden.
