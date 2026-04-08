# InternshipMatch Backend

FastAPI backend for InternshipMatch. Python 3.12, Pydantic v2, Supabase.

## Setup (Windows PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env with real credentials
```

## Seed the database

Run the Supabase migration first (`infra/supabase/migrations/0001_initial_schema.sql`), then:

```powershell
python seed/load_seed.py
```

## Run tests

```powershell
pytest
```

## Start the dev server

```powershell
uvicorn app.main:app --reload --port 8000
```
