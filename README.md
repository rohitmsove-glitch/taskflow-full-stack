# TaskFlow — Full-Stack Task Management Platform

A portfolio-ready full-stack application built with **Angular, Node.js/Express, Python/Flask, and AWS-ready Docker configuration**. It includes task CRUD, search and status filters, dashboard statistics, and a Python-powered analytics endpoint.

> **Portfolio note:** The app is configured for local development and container deployment. It is not automatically deployed to AWS; follow `infra/aws/README.md` to deploy it in your own AWS account.

## Features

- Create, view, edit, and delete tasks.
- Track task status (`Todo`, `In Progress`, `Done`) and priority (`Low`, `Medium`, `High`).
- Search tasks and filter by status.
- Dashboard summary for total tasks, open work, completed work, and completion rate.
- Node.js REST API with request validation and JSON-file persistence for an easy local demo.
- Python analytics microservice that computes status and priority breakdowns.
- Docker Compose setup for all three services.
- Nginx configuration for serving the Angular production build and proxying `/api` requests.
- AWS ECS/Fargate deployment notes and a resume-ready project entry.

## Architecture

```text
Browser
  │
  ▼
Angular SPA (Nginx, port 4200)
  │  /api/*
  ▼
Node.js + Express REST API (port 3000)
  │  POST /api/analytics
  ▼
Python + Flask analytics service (port 5000)
```

Tasks are stored in `backend-node/data/tasks.json` for demo purposes. For a production deployment, replace this file store with a managed database such as Amazon RDS or Amazon DocumentDB and add authentication/authorization before exposing user data.

## Run with Docker (recommended)

Prerequisite: install Docker Desktop or Docker Engine with the Compose plugin.

From the project root:

```bash
docker compose up --build
```

Open **http://localhost:4200** in your browser.

Useful endpoints:

- `http://localhost:4200` — Angular application
- `http://localhost:3000/api/health` — Node API health check
- `http://localhost:5000/health` — Python service health check
- `http://localhost:3000/api/tasks` — task list (JSON)
- `http://localhost:3000/api/analytics` — analytics (JSON)

Stop the services with `Ctrl+C`, then run `docker compose down`. Task data is persisted in the local `backend-node/data` folder.

## Run locally without Docker

Use Node.js 20+ and Python 3.10+.

### 1. Start the Python analytics service

**Windows PowerShell**

```powershell
cd analytics-python
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

**macOS/Linux**

```bash
cd analytics-python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The service listens on `http://localhost:5000`.

### 2. Start the Node.js API

Open a second terminal at the project root:

```bash
cd backend-node
npm install
npm start
```

The API listens on `http://localhost:3000`. By default, it calls the Python analytics service at `http://localhost:5000/api/analytics`. If that service is temporarily unavailable, the API returns a JavaScript-computed fallback summary.

### 3. Start the Angular frontend

Open a third terminal at the project root:

```bash
cd frontend-angular
npm install
npm start
```

Open **http://localhost:4200**. The Angular development server proxies `/api` requests to port 3000 using `proxy.conf.json`.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | API health status |
| `GET` | `/api/tasks` | List all tasks |
| `GET` | `/api/tasks/:id` | Get one task |
| `POST` | `/api/tasks` | Create a task |
| `PUT` | `/api/tasks/:id` | Update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/analytics` | Get analytics from Python, with an API fallback |
| `GET` | `/health` (Python service) | Analytics-service health status |
| `POST` | `/api/analytics` (Python service) | Calculate status and priority metrics |

### Example task payload

```json
{
  "title": "Build an Angular dashboard",
  "description": "Create responsive task cards and filters",
  "status": "In Progress",
  "priority": "High",
  "dueDate": "2026-11-05"
}
```

## Project structure

```text
taskflow-full-stack/
├── frontend-angular/     # Angular SPA, styles, dev proxy, Nginx and Dockerfile
├── backend-node/         # Express REST API and demo task data
├── analytics-python/    # Flask analytics microservice
├── infra/aws/            # AWS ECS/Fargate deployment guide
├── .github/workflows/    # Lightweight CI checks
├── docker-compose.yml
├── .gitignore
└── RESUME_PROJECT_ENTRY.md
```

## Suggested next steps for a production version

1. Replace the JSON data file with a managed database and migrations.
2. Add authentication, authorization, and per-user task access.
3. Store secrets in AWS Secrets Manager or SSM Parameter Store.
4. Add automated API/integration tests, structured logging, and monitoring.
5. Deploy with HTTPS, least-privilege IAM roles, and separate dev/prod environments.
