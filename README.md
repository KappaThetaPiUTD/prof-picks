# ProfPicks live UTD chatbot — V1 starter

A runnable, read-only UTD data assistant: **React → FastAPI → Nebula API**. When you later add a separate Claude API key, the same endpoint upgrades to **Claude tool calling → Nebula API**.

No mock grades or sections are generated in the backend. This V1 does **not** write to schedules, show verified live seats, or enroll users. It also does not fine-tune any AI model.

## Prerequisites

- Python 3.11+ and Node 20+
- Your existing **Nebula API key**
- **Optional later:** a separate **Anthropic API key** with access to your chosen Claude model and available credit

**Do not paste keys into chat, React files, Figma Make prompts, or GitHub.** Keep the `.env` local to the backend.

## 1. Start backend

Open terminal 1:

```bash
cd backend
python -m venv .venv
# macOS / Linux:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
# On Windows PowerShell: Copy-Item .env.example .env
```

Edit `backend/.env` and replace placeholder values with your private keys.

```bash
uvicorn main:app --reload --port 8000
```

Visit http://127.0.0.1:8000/health — `nebula_key_configured` should be `true` and `mode` should be `nebula_only` (until you add Claude). Presence does not verify that a key works.

Open http://127.0.0.1:8000/docs to test POST `/api/chat`.

Test request body:

```json
{"message":"Which sections exist for CS 1337?","history":[]}
```

## 2. Start React chatbot

Open terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173 and ask **"sections for CS 1337"**, **"professors for MATH 2415"**, or **"grades for PHYS 2325"**. Vite proxies `/api` to the Python backend, so neither key reaches your browser.

## How Nebula-only mode works

Before Claude is configured, the chat is a **search-oriented interface**, not a generative AI. It recognizes explicit UTD course codes, picks the matching lookup, and displays the raw returned Nebula fields without fabricating stats. It does not reason over multiple questions, interpret unlabeled grade bins, or swap schedule sections. Some Nebula endpoints and response shapes can change; verify using actual authenticated requests.

To enable natural-language responses later, set `ANTHROPIC_API_KEY` in `backend/.env` (and a model available to your account), then restart FastAPI. The existing React chat component continues using the same `/api/chat` endpoint.

## 3. Connect to your existing Figma Make React app

Copy these two files into your existing `src/` directory:

- `frontend/src/ProfPicksChat.tsx`
- `frontend/src/ProfPicksChat.css`

Render it in the chatbot panel:

```tsx
import ProfPicksChat from './ProfPicksChat';

export default function ChatPanel() {
  return <ProfPicksChat />;
}
```

If you have an active schedule in React state, you may pass it using this shape:

```tsx
<ProfPicksChat activeSchedule={{
  name: 'My Ideal Schedule',
  term: 'Spring 2027',
  sections: [
    { course_code: 'CS 1337', section_number: '001', meeting_times: 'MW 11:00-12:15' }
  ]
}} />
```

This is **unverified student-provided schedule context** and it is strictly read-only. Do not have the model mutate your calendar. When moving to actual schedule edits, build server-side validation, a proposal preview, and user confirmation.

For an existing Vite dev server, add the proxy to its `vite.config.ts`, or explicitly configure same-origin reverse proxy when deployed:

```ts
server: { proxy: { '/api': 'http://127.0.0.1:8000' } }
```

If your Figma prototype does not expose code deployment to a backend, export/copy the React code into your own app/repo first.

## Nebula endpoints used

- `GET /course?subject_prefix=CS&course_number=1337`
- `GET /course/sections?subject_prefix=CS&course_number=1337`
- `GET /course/professors?subject_prefix=CS&course_number=1337`
- `GET /grades/semester?prefix=CS&number=1337`

The backend uses `x-api-key` on each Nebula request. See https://api.utdnebula.com/swagger/index.html and https://github.com/UTDNebula/nebula-api for current schemas. Response data is wrapped under `data` by Nebula.

**Data safety and bias:** No interpretation of undocumented grade array positions; no invented professor ratings, seat availability, or schedule availability; historical grades never treated as proof of teaching quality. Nebula data may include historical sections. Verify current-term section coverage with actual responses before launching.

## Production notes

This is a local MVP starter, **not a production backend**. Before opening to student traffic: add user authentication, per-user rate limits, budget/cost caps, appropriate data retention/privacy policy, backend-origin restrictions, request tracing without key logging, caching, and tests against real Nebula responses. Do not enable `allow_origins=['*']` for a public deployment. Keep all keys on the server and rotate any compromised keys.

## Troubleshooting

- HTTP 503 from `/api/chat`: `NEBULA_API_KEY` is missing from `backend/.env`.
- HTTP 502: Claude provider error; verify key, plan access, account billing, and model name. Optionally change `ANTHROPIC_MODEL` to an available model in your account.
- Nebula lookup failed: check key permissions, endpoint shape, rate limits, and Nebula status; errors are intentionally sanitized.
- Missing grades: the API may not contain matching records, and response bucket labels must be verified before computing A/B percentages.
