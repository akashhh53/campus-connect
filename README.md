# Campus Connect

Campus Connect is a role-aware campus platform with a realtime feed, direct messages, profiles, notifications, and lost-and-found workflows.

## Project structure

- `frontend/` React and Vite web application
- `backend/` Express, MongoDB, Socket.IO, Redis cache, and Cloudinary uploads

## Run locally

1. Create `backend/.env` with MongoDB, JWT, Cloudinary, Redis, and frontend URL values.
2. Create `frontend/.env` with the API base URL, for example `VITE_API_BASE_URL=http://localhost:5000` or `VITE_API_URL=http://localhost:5000`.
3. In `backend/`, install dependencies and start the server with `npm install` then `npm start`.
4. In `frontend/`, install dependencies and start the app with `npm install` then `npm run dev`.

The frontend falls back to the current site in production and to `http://localhost:4000` in local development. Make sure the frontend URL is included in `FRONTEND_URL` or `FRONTEND_URLS` in the backend environment so cookies and Socket.IO can connect.

## Key capabilities

- Feed posts with image and MP4, WEBM, or MOV attachments
- Realtime one-to-one chat with presence, typing, read state, reactions, replies, attachments, delete, and clear-for-me actions
- User-specific notification read status, including campus-wide notifications
- Cookie-backed access-token refresh and limited active refresh sessions
- Light and dark themes with responsive dashboard layouts

## Mobile notifications

The Capacitor app can use the same API and realtime message state. True background phone notifications require Firebase Cloud Messaging for Android and APNs for iOS, plus each platform's credentials and native configuration. Those credentials are intentionally not included in this repository.

## Voice and video calls

Calls use WebRTC for peer-to-peer media and Socket.IO only for signaling. The app includes a public STUN server for development. For dependable calls across mobile networks and strict NATs, configure a TURN relay in the frontend environment:

`VITE_TURN_URL`, `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL`.

## Publish to GitHub

1. Create a new empty repository on GitHub.
2. From this project folder, run `git init` if Git is not already initialized.
3. Run `git add .` and review the staged files. The `.gitignore` keeps secrets, generated builds, Android build output, and signing keys out of Git.
4. Run `git commit -m "Initial Campus Connect release"`.
5. Add the GitHub repository as `origin`, then push your main branch.

Before publishing, confirm that no `.env` file, Cloudinary key, JWT secret, database URL, Firebase file, or Android signing key appears in the staged changes.
