![AnnotAISE logo](frontend/public/Full_Logo_DarkMode.svg)

# ANNOTAISE

The **AnnotAISE** platform enables the creation of research labeling forms based on **CSV files**, allowing users to map columns into *contexts*, define *questions* (various types), and generate **N** forms for **N** rows of data.

**Repository:** [https://github.com/aisepucrio/annotaise](https://github.com/aisepucrio/annotaise)

---

## Table of Contents

- [Project Description](#project-description)
- [Target Users](#target-users)
- [Project Dependencies](#project-dependencies)
- [Installation](#installation)
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
- **Docker and Docker Compose v2** *(recommended)* — to run all services easily in containers.  
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
POSTGRES_DB=annotaise
POSTGRES_USER=annotaise
POSTGRES_PASSWORD=annotaise
POSTGRES_PORT=5432

DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=admin

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
### Run AnnotAISE
- **With Docker**
```bash
docker compose up --build
```
- **Manual**
  - Backend
  ```bash
  cd backend
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  python manage.py migrate
  python manage.py runserver 0.0.0.0:8000
  ```
  - Frontend
  ```bash
  cd ../frontend
  npm install
  npm run dev

  ```
