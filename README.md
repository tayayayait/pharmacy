<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1cWxbcIb1g5PscGnd1XU0zckZ6UB43dHZ

## Run Locally (Frontend)

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## Backend (Express + Prisma API)

The `server/` folder contains a Node.js + Express + TypeScript backend with a PostgreSQL database (via Prisma).

### Setup

1. Install dependencies:

   ```bash
   cd server
   npm install
   ```

2. Configure environment variables:

   - Copy `.env.example` to `.env` in `server/`
   - Set `DATABASE_URL`, `JWT_SECRET`, and `ENCRYPTION_KEY` (32‑byte key) appropriately.

3. Run Prisma generate and migrations:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```

4. Start the backend server:

   ```bash
   npm run dev
   ```

   The API will listen on `http://localhost:4000` by default.

### Auth API (for pharmacist login)

- `POST /api/v1/auth/login`

  - Body: `{ "email": string, "password": string }`
  - Returns: `{ token, user }` where `token` is a JWT to be used as `Authorization: Bearer <token>`.

- `GET /api/v1/auth/me`

  - Requires `Authorization: Bearer <token>` header.
  - Returns current pharmacist and pharmacy info.

### Core backend APIs

- `POST /api/v1/patients`
  - Create a new patient (AES-256 encrypted name/phone, stores phone last 4 digits for lookup).
  - Requires authenticated pharmacist.
- `GET /api/v1/patients`
  - Paginated patient search; filters by pharmacy / gender / display name / phone segment.
- `GET /api/v1/survey-templates`
  - Returns NRFT survey templates with questions + options.
- `POST /api/v1/survey-sessions`
  - Generates a one-time token link for a specific patient + survey template.
- `GET /api/v1/survey-sessions/:token`
  - Validates session token and returns template/session metadata.
- `POST /api/v1/survey-sessions/:token/answers`
  - Saves answers, runs NRFT analysis, creates assessment, and marks session complete.
- `GET /api/v1/assessments`
  - Lists assessments scoped to the pharmacist’s pharmacy.
- `GET /api/v1/assessments/:id`
  - Returns detailed assessment data (scores, clusters, recommendations).
- `PATCH /api/v1/assessments/:id/status`
  - Allows pharmacists to toggle between `PENDING` and `COMPLETED`.
- `POST /api/v1/assessments/:id/ai-script`
  - Triggers Gemini 기반 AI 상담 스크립트 생성 및 assessment에 저장.

### Dev seed for quick testing

In non‑production environments you can seed a demo pharmacy + pharmacist:

- `POST /api/v1/auth/seed-dev`

This creates:

- Pharmacy: `Demo Pharmacy`
- Pharmacist login: `pharmacist@example.com` / `demo1234`

### Survey & patient seed helper

After running `seed-dev`, you can populate a NRFT template, demo patient, and survey session by running:

```bash
cd server
npm run seed:survey
```

The script logs the template ID, demo patient, and session token so QA teams can hit `/api/v1/survey-sessions/:token` or `/api/v1/assessments` immediately.

### Gemini AI 설정

Set `GEMINI_API_KEY` in the backend `.env` file so that `/api/v1/assessments/:id/ai-script` can generate counseling scripts without exposing credentials to the frontend.
