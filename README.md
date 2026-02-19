![AnnotAISE logo](frontend/public/Full_Logo_Dark.svg)

# ANNOTAISE

**Repository:** [https://github.com/aisepucrio/annotaise](https://github.com/aisepucrio/annotaise)

---

## Table of Contents

- [Project Description](#project-description)
- [Target Users](#target-users)
- [Project Dependencies](#project-dependencies)
- [Installation](#installation)
- [Seed ReSellia QA](#seed-resellia-qa)
- [Run AnnotAISE](#run-annotaise)

---

## Project Description

**AnnotAISE** is a CSV-driven labeling platform with two user profiles:

- **Researcher:** creates **labeling models** from a CSV file. Each **column** becomes a **context**; in the **builder**, the user adds **sections** and **questions** (e.g., text, number, range, multiple choice, boolean) and can mark them as **required**. Once finished, the system generates **N forms** for **N rows** of the CSV file.
- **Regular user (annotator):** accesses the assigned labelings, **answers the forms**, and **submits** the responses.

## Target Users

This project is intended for:

- **Researchers / data teams** who want to quickly create CSV-driven labeling templates (map columns to contexts, add questions, generate one form per row) and manage progress/export results.
- **Annotators (end users)** who need a simple interface to access assigned labelings, answer forms, and submit responses.

## Project dependencies

Before using **AnnotAISE**, ensure you have the following prerequisites installed:

- **Python 3.12+** — required for running the Django backend.
- **Node.js 20+** — required for the Next.js frontend.
- **PostgreSQL 14+** — database used by the backend.
- **Docker and Docker Compose v2** _(recommended)_ — to run all services easily in containers.
- **Git** — to clone and manage the project repository.

---

## Installation

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

- **Step 2 - Create the .env file**
  Create a file named .env in the project root with:

```bash
DJANGO_DB_NAME=postgres
DJANGO_DB_USER=postgres
DJANGO_DB_PASS=postgres
DJANGO_SUPERUSER_USER=admin
DJANGO_SUPERUSER_PASSWORD=123
DJANGO_SUPERUSER_EMAIL=a@g.com
EMAIL_HOST_PASSWORD= my-password
EMAIL_PORT= my-email-port
EMAIL_HOST= my-email-host
EMAIL_HOST_USER= my-email-adress
DEFAULT_FROM_EMAIL=my-name my-email-adress
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
DEBUG=true
DEBUG_NEXT=true

```

- **Step 3 - Start containers(recomended)**

```bash
docker compose up --build
```

- **Step 4 - Apply migrations and create a superuser**

```bash
docker compose exec api python manage.py migrate
docker compose exec api python manage.py createsuperuser
```

## Seed ReSellia QA

Use este seed para criar o caso de uso real de marketplace (**ReSellia QA**) no backend.

- O comando pede no terminal: **email do administrador** para atribuir a criação do projeto/rotulação.
- O usuário informado precisa existir e ter perfil de admin.

- **Com Docker (rodar na raiz do repositório):**

```bash
docker compose exec api uv run manage.py seed_resellia_qa
```

### Run AnnotAISE

- **With Docker**

```bash
docker compose start
```

- **Manual**
  - Backend

  ```bash
  python -m venv .venv && source .venv/bin/activate
  uv sync
  python manage.py migrate
  python manage.py runserver 0.0.0.0:8000
  ```

  - Frontend

  ```bash
  npm install
  npm run dev

  ```
