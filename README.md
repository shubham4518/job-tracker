# Job Tracker

A full-stack app to track job applications: a kanban board by status, search, follow-up reminders, and stats. Built with **FastAPI + SQLAlchemy** (Python) and **React + Vite**.

## Features

- Register / login with JWT authentication (bcrypt password hashing)
- Add, edit, delete applications (company, role, status, link, notes, follow-up date)
- Kanban board: Wishlist, Applied, Interview, Offer, Rejected. Drag cards between columns
- Search by company or role
- Stats: totals, response rate, follow-ups due
- Each user only ever sees their own data (covered by tests)

## Project structure

```
job-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py        # routes
│   │   ├── models.py      # SQLAlchemy models
│   │   ├── schemas.py     # Pydantic request/response models
│   │   ├── security.py    # hashing + JWT + current-user dependency
│   │   └── database.py    # engine and session
│   ├── tests/test_api.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api.js          # fetch wrapper + token handling
    │   ├── App.jsx
    │   └── components/     # Auth, Dashboard, ApplicationForm, Stats
    └── package.json
```

## Run it

You need Python 3.10+ and Node 18+.

**Backend** (terminal 1):

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API runs on http://127.0.0.1:8000, with interactive docs at http://127.0.0.1:8000/docs.

**Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend, so no extra config is needed.

## Run the tests

```bash
cd backend
pytest
```

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `SECRET_KEY` | `dev-secret-change-me` | **Set this to a long random string in production** |
| `DATABASE_URL` | `sqlite:///./jobtracker.db` | Point at Postgres by changing this |

## API overview

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get a JWT (form fields `username`, `password`) |
| GET | `/api/auth/me` | Current user |
| GET | `/api/applications?status=&q=` | List, with optional filter and search |
| POST | `/api/applications` | Create |
| PATCH | `/api/applications/{id}` | Partial update |
| DELETE | `/api/applications/{id}` | Delete |
| GET | `/api/stats` | Counts per status, response rate, follow-ups due |

## Ideas to extend it

- Alembic migrations instead of `create_all`
- Docker Compose with Postgres
- Email reminders for follow-ups
- Refresh tokens, rate limiting on login
- Frontend tests with Vitest + React Testing Library
