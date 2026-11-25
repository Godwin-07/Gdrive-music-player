# Gdrive Music

Gdrive Music is a mobile music player built with Expo and React Native. Connect a Google Drive account to browse and stream audio files, or import audio stored on your device. The library also supports playlists, search, metadata and artwork, and downloading Drive tracks for offline playback.

## Requirements

- Node.js and npm
- Android Studio and an Android device or emulator for native playback
- A Google Cloud project with the Google Drive API enabled

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. In Google Cloud Console, enable the Google Drive API and configure the OAuth consent screen. Create OAuth client IDs for Android and Web, and add the Drive scopes used by the app:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`

3. Add the client IDs to a local `.env` file in the project root:

   ```dotenv
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
   ```

   `.env` is ignored by Git. Do not commit local environment files.

4. Start the Expo development server:

   ```sh
   npm start
   ```

   For native Android playback, use a development build rather than Expo Go. To build and launch the Android app locally:

   ```sh
   npm run android
   ```

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo development server |
| `npm run android` | Build and run the native Android app |
| `npm run ios` | Build and run the native iOS app |
| `npm run web` | Start the web version |
| `npm test` | Run Jest in watch mode |
