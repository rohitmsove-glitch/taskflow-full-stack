# Python analytics service

A small Flask service for computing task totals, completion rate, and priority distribution.

```bash
python -m venv .venv
# Activate the virtual environment for your OS, then:
pip install -r requirements.txt
python app.py
```

Default URL: `http://localhost:5000`. Endpoints: `GET /health` and `POST /api/analytics` with JSON shaped as `{ "tasks": [...] }`.
