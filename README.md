# Nihongo Learning System

> A Japanese-learning platform for Vietnamese learners that turns vocabulary study, Kana practice, learning paths, and JLPT preparation into a structured, measurable experience—backed by practical content-management tools.

**Nihongo Learning System** is a full-stack product built around a straightforward learner need: one place to learn, review at the right time, and see meaningful progress. It also gives operators the tools to manage content, users, and learning data safely.

## Highlights

- **Purposeful vocabulary practice** — flashcards, meaning selection, typing, sentence creation, and learning/review/mastery states.
- **Structured learning paths** — courses, lessons, personal notes, and progress stored per learner.
- **JLPT preparation** — level-based test catalogues, test-taking, grading, and a review workflow for highlighted questions.
- **Designed for Vietnamese learners** — dictionary support, Furigana, Romaji/Kana input, Kana quizzes, and multilingual UI support.
- **AI-assisted learning** — sentence grading, example suggestions, and vocabulary enrichment through configurable AI APIs.
- **Built for real operation** — email/password and Google sign-in, role-based access control, audit logs, feedback, coin top-ups, and an admin workspace.
- **Mobile-ready** — PWA manifest, service worker, and app icons are included.

## Technical overview

| Area | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js Route Handlers, REST APIs, Zod validation |
| Data | MongoDB + Mongoose |
| State & forms | TanStack React Query, Zustand, React Hook Form |
| Content authoring | Tiptap rich-text editor, vocabulary/course/JLPT data |
| Security | JWT in HTTP-only cookies, bcrypt, RBAC, rate limiting, audit logs |
| Integrations | Google OAuth, SMTP email, Cloudinary uploads, SePay webhooks, AI providers |

## Product problems addressed

### 1. Progress-aware learning

Every vocabulary item has learner-specific progress, including status, right/wrong answers, notes, bookmarks, and spaced-repetition (SRS) data. This keeps a learner’s study history separate from the source content of a course.

### 2. Content and user operations in one system

The `/admin` area provides a dashboard plus CRUD workflows for master data, courses, JLPT tests, example suggestions, feedback, users, roles/permissions, and payment reviews. Administrative actions are protected by RBAC and recorded in audit logs.

### 3. Fast public content with personalized experiences

The course library fetches and caches public course data on the server, while rich learning interactions are organized into dedicated client-side study screens. This keeps discovery fast without sacrificing signed-in personalization.

## Project structure

```text
app/                    # UI, routes, and APIs (Next.js App Router)
├── (auth)/             # Registration, login, password reset
├── admin/              # Dashboard and administrative workspace
├── api/                # Route Handlers for product workflows and integrations
└── flashcards/         # Vocabulary, Kana, roadmaps, JLPT, and study experience
lib/                    # Database, authentication, RBAC, cache, email, rate limiting
models/                 # Mongoose models and data relationships
scripts/                # Data import, synchronization, and enrichment jobs
tests/                  # i18n tests
docs/                   # Database design, JLPT data safety, production operations
public/                 # PWA assets and static files
```

## Run locally

### Requirements

- Node.js 20+
- MongoDB (local or MongoDB Atlas)
- npm 10+

### 1. Install

```bash
git clone https://github.com/ndhung23/nihongo-learning-system.git
cd nihongo-learning-system
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root. MongoDB and a JWT secret are the minimum requirements:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
MONGODB_DB=nihongo_learning_system
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Configure these additional values when enabling their corresponding features:

```env
# Google sign-in
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_URL=http://localhost:3000

# Password reset and notifications
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
ADMIN_NOTIFICATION_EMAIL=

# Media, payments, and AI (optional for the core learning flow)
CLOUDINARY_URL=
SEPAY_WEBHOOK_SECRET=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_CLOUD_TRANSLATION_API_KEY=
```

> Never commit `.env*` files, private exam content/answer keys, or API keys. These are excluded from Git by design.

### 3. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Check database connectivity at `/api/db/health`.

## Testing and quality checks

```bash
npm test            # Run tests
npm run lint        # Check code style
npm run build       # Create a production build
npm run check:i18n  # i18n test + lint + production build
```

## Data import and synchronization

Data workflows are separated into repeatable scripts for operation and content enrichment:

```bash
npm run db:import-jlpt-tests
npm run db:sync-jlpt-courses
npm run db:seed-course-learners
npm run security:check-data
```

Run data-import scripts only after configuring MongoDB and confirming that you are authorized to use the relevant source material.

## Operations and security

- Learning, payment, and audit data are intentionally not placed behind TTL indexes; the target retention period is at least three years.
- The production runbook recommends recurring backups, restore testing, latency/error monitoring, and multi-instance deployment.
- Sensitive JLPT material is kept out of the public codebase. See the [JLPT data-security guide](docs/jlpt-data-security.md) and [production operations notes](docs/production-operations.md).

## Technical documentation

- [Database design](docs/database-design.md)
- [Production operations](docs/production-operations.md)
- [JLPT data security](docs/jlpt-data-security.md)

## Author

**Nguyen Duy Hung** · [GitHub](https://github.com/ndhung23)

If you are a recruiter or engineer interested in discussing the product, architecture, or engineering decisions behind this project, I would be happy to connect.
