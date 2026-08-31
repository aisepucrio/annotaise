![AnnotAISE logo](frontend/public/Full_Logo_Dark.svg)

# ANNOTAISE

**Repository:** [https://github.com/aisepucrio/annotaise](https://github.com/aisepucrio/annotaise)

**Accepted article:** _AnnotAISE: Web-Based Data Annotation Platform For Software Engineering Research_ — SBES-Tools 2026. DOI: [https://zenodo.org/records/21462965](https://doi.org/10.5281/zenodo.20388574)

---

## Table of Contents

- [Project Description](#project-description)
- [Target Users](#target-users)
- [Repository Structure](#repository-structure)
- [Project Requirements](#project-requirements)
- [Hardware Requirements](#hardware-requirements)
- [Installation](#installation)
- [Run AnnotAISE](#run-annotaise)
- [Verify the Installation](#verify-the-installation)
- [Basic Usage Example](#basic-usage-example)
- [Seed](#seed)
- [Uninstalling](#uninstalling)
- [Ethical and Legal Statements](#ethical-and-legal-statements)

---

## Project Description

**AnnotAISE** is a CSV-driven annotation platform with two user profiles:

- **Researcher:** creates **annotation tasks** from a CSV file. Each **column** becomes a **data field**; in the **builder**, the user adds **sections** and **questions** (e.g., text, number, range, multiple choice, boolean) and can mark them as **required**. Once finished, the system generates **N forms** for **N rows** of the CSV file.
- **Regular user (annotator):** accesses the assigned annotation tasks, **answers the forms**, and **submits** the responses.

## Target Users

This project is intended for:

- **Researchers / data teams** who want to quickly create CSV-driven annotation templates (map columns to data fields, add questions, generate one form per row) and manage progress/export results.
- **Annotators (end users)** who need a simple interface to access assigned annotations, answer forms, and submit responses.

## Repository Structure

```
annotaise/
├─ backend/                 # Django REST API
│  ├─ annotaise/            # Django project config (settings, URLs, ASGI/WSGI)
│  ├─ authentication/       # Login, registration, and JWT authentication
│  ├─ user/                 # User accounts, profiles, and user groups
│  ├─ project/              # Research projects and member management
│  ├─ labeling/             # Annotation tasks: builder, CSV import, and seed commands
│  ├─ item/                 # Items to annotate (one per CSV row) and assignments
│  ├─ answer/               # Submitted form answers
│  ├─ static/               # Static files served by Django/nginx
│  ├─ manage.py             # Django management entry point
│  ├─ pyproject.toml        # Python dependencies (managed with uv)
│  ├─ uv.lock               # Locked dependency versions
│  ├─ Dockerfile            # Backend container image
│  └─ run.sh                # Backend container startup script
├─ frontend/                # Next.js web application
│  ├─ src/                  # Application source code (pages, components, modules)
│  ├─ public/               # Static assets (logos, images)
│  ├─ content/              # In-app user guide (English and Portuguese)
│  ├─ .storybook/           # Storybook configuration for component development
│  ├─ package.json          # Node.js dependencies and scripts
│  ├─ next.config.ts        # Next.js configuration
│  ├─ vitest.config.ts      # Frontend test configuration
│  ├─ Dockerfile            # Frontend container image
│  └─ run.sh                # Frontend container startup script
├─ .github/                 # CI workflows (GitHub Actions)
├─ docker-compose.yaml      # Orchestrates the api, frontend, db, and nginx services
├─ nginx.conf               # Nginx configuration (production profile)
├─ .env                     # Environment variables (created by you — see Installation, Step 2)
├─ LICENSE                  # MIT License
└─ README.md                # This file
```

> Generated/local folders (`.venv/`, `node_modules/`, `.next/`) are omitted; they are created automatically during installation.

## Project requirements

Before using **AnnotAISE**, ensure you have the following prerequisites installed:

- **Python 3.13+** — required for running the Django backend.
- **Node.js 20+** — required for the Next.js frontend.
- **PostgreSQL 14+** — database used by the backend.
- **Docker and Docker Compose v2** _(recommended)_ — to run all services easily in containers.
- **Git** — to clone and manage the project repository.

### Hardware requirements

AnnotAISE runs on commodity hardware. The minimum recommended configuration is:

- **CPU:** 2 cores (4 recommended)
- **RAM:** 4 GB (8 GB recommended when building the containers)
- **Disk:** ~5 GB of free space (Docker images, dependencies, and PostgreSQL volume)
- **OS:** Linux, macOS, or Windows 10+ (with WSL 2 for Docker Desktop)
- **Network:** internet access is required for the first build (downloading images and packages); after that, the platform runs locally

> **Note:** the optional AI-assisted features use a local [Ollama](https://ollama.com) server (`OLLAMA_BASE_URL`). Running the default `llava:7b` model requires an additional ~8 GB of RAM; a GPU is optional but improves inference speed. All core annotation features work without Ollama.

---

## Installation
> **Reproducibility note:** the steps below use the GitHub repository for convenience. To reproduce the exact artifact evaluated for this paper, download and extract the archived source from the Zenodo record instead of cloning GitHub, then follow the same steps starting from Step 2 inside the extracted folder.
### 1. Docker Desktop

- **Windows**:
  1. Download [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
  2. Run the installer
  3. If prompted, enable WSL 2 (Windows Subsystem for Linux)
  4. Restart your computer after installation
  5. Verify the installation by opening terminal and typing: `docker --version`

- **macOS**:
  1. Download [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
  2. Drag Docker to Applications folder
  3. Open Docker and allow installation of additional components
  4. Verify the installation by opening terminal and typing: `docker --version`

- **Linux (Ubuntu)**:
  ```bash
  sudo apt update
  sudo apt install docker.io
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker $USER
  # Logout and login again
  docker --version
  ```

### 2. Docker Compose

- **Windows/macOS**:
  - Already included in Docker Desktop

- **Linux**:
  ```bash
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  docker-compose --version
  ```

### 3. Git

- **Windows**:
  1. Download [Git for Windows](https://git-scm.com/download/win)
  2. Run the installer
  3. Keep default options during installation
  4. Verify installation: `git --version`

- **macOS**:

  ```bash
  brew install git
  git --version
  ```

- **Linux (Ubuntu)**:
  ```bash
  sudo apt update
  sudo apt install git
  git --version
  ```

## Instructions for using AnnotAISE

Get started with **AnnotAISE** by following the steps below.

---

### Install AnnotAISE

- **Step 1 — Clone the repository**

```bash
git clone https://github.com/aisepucrio/annotaise.git
cd annotaise
```

- **Step 2 — Configure environment variables**

```bash
cp .env.example .env
```

Open `.env` and adjust the values if needed. This file defines the database credentials and the **superuser account** (`DJANGO_SUPERUSER_EMAIL` / `DJANGO_SUPERUSER_PASSWORD`) that will be created automatically the first time the containers start. Keep note of the superuser email — you will use it to log in and in the [Basic Usage Example](#basic-usage-example).

- **Step 3 — Build and start containers**

```bash
docker compose up --build
```

On first startup, the `api` service automatically applies database migrations and creates the superuser defined in `.env` (you'll see both actions in the startup logs). No manual `migrate` or `createsuperuser` step is needed.

### Run AnnotAISE

- **With Docker**

```bash
docker compose start
```

- **Manual**
  - Backend

  ```bash
  python -m venv .venv && source .venv/bin/activate
  pip install uv (if uv is not already installed)
  uv sync
  python manage.py migrate
  python manage.py runserver 0.0.0.0:8000
  ```

  - Frontend

  ```bash
  npm install
  npm run dev

  ```

## Verify the Installation

After starting the containers, confirm that all services are up and healthy:

```bash
docker compose ps
```

**Expected output** — the three services report `Up` (names may vary slightly with your Docker version):

```
NAME                  IMAGE                COMMAND                  SERVICE    STATUS         PORTS
annotaise-api-1       annotaise-api        "…"                      api        Up             0.0.0.0:8000->8000/tcp
annotaise-db-1        postgres:17-alpine   "docker-entrypoint.s…"   db         Up             0.0.0.0:5432->5432/tcp
annotaise-frontend-1  annotaise-frontend   "…"                      frontend   Up             0.0.0.0:3000->3000/tcp
```

Then check that the backend and frontend respond:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/admin/login/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```

**Expected output:**

```
200
200
```

Finally, open [http://localhost:3000](http://localhost:3000) in your browser — the **AnnotAISE login page** should be displayed. If all three checks pass, the installation was successful.

## Basic Usage Example

This smoke test exercises the full researcher → annotator flow and takes about 5 minutes:

1. **Load the demo use case** (ReSellia QA, a mock marketplace annotation scenario):

   ```bash
   docker compose exec api uv run manage.py seed_resellia_qa
   ```

   When prompted, enter the **superuser email** created in Step 4 of the installation (e.g., `a@g.com`). The command finishes by printing a confirmation that the ReSellia QA project, annotation task, and forms were created.

2. **Log in as the researcher:** open [http://localhost:3000](http://localhost:3000) and sign in with your superuser credentials. The dashboard should list the **ReSellia QA** project.

3. **Open the annotation task:** inside manage annotation tasks tab, open the seeded annotation task (Multimodal Listing Verification (v1)). You should see the forms generated from the CSV rows, with their data fields (columns) and questions.

4. **Add yourself as a user:** go to assign annotators inside of the manage annotation tasks tab and add yourself as a collaborator to the annotation task.

5. **Annotate:** go to Annotate page, open the first form, fill in the questions (text, multiple choice, etc.), and **submit**. The form status should change to answered and the annotation progress indicator should increase in manage annotation tasks tab.

**Expected result:** the project appears on the dashboard, forms open with the seeded data fields/questions, and a submitted answer is persisted (it remains after refreshing the page). This confirms the backend, database, and frontend are working together correctly.

## Seed

- The command prompts in the terminal for the **administrator email** to assign project/annotation task creation.
- The provided user must exist and have an admin profile.

### ReSellia QA

Use this seed to create a mock marketplace use case (**ReSellia QA**) in the backend.

- **With Docker (run from the repository root):**

```bash
docker compose exec api uv run manage.py seed_resellia_qa
```

### Context Question Test

Use this seed to create an extensive test case for frontend modules.

- **With Docker (run from the repository root):**

```bash
docker compose exec api uv run manage.py seed_context_question_test
```
## Uninstalling

To stop AnnotAISE and remove the Docker resources created during installation:

```bash
docker compose down            # stop and remove containers and the default network
docker compose down -v         # also remove the PostgreSQL data volume (destroys all data)
docker image rm annotaise-api annotaise-frontend   # optional: remove the built images
```
## Ethical and Legal Statements

- **Questionnaire data is anonymized.** The responses from the questionnaire applied during the evaluation of the article were anonymized. No personally identifiable information of the participants are stored or distributed with this artifact.
