# 🚀 Dograh Voice AI — Quick Start Guide

Welcome! This guide explains how to install, set up, and run the **Dograh Voice AI platform** on your machine using Docker.

---

## 📋 System Requirements

* **Docker Desktop**: [Download and install Docker Desktop](https://www.docker.com/products/docker-desktop/) (ensure it is running).
* **RAM**: At least 8 GB RAM on your computer (allocate at least 4 GB RAM to Docker in *Docker Desktop > Settings > Resources*).
* **OS**: Windows (with WSL2), macOS, or Linux.
* **Browser**: Google Chrome or Microsoft Edge (recommended for WebRTC audio & microphone support).

---

## ⚡ Quick Start (Recommended)

### 1. Open Terminal or PowerShell
Navigate to the project folder where Dograh is located:
```bash
cd dograh-main
```

### 2. Run the 1-Click Launch Script

* **On Windows (PowerShell):**
  ```powershell
  .\scripts\start_docker.ps1
  ```

* **On Mac / Linux (Terminal):**
  ```bash
  chmod +x scripts/start_docker.sh
  ./scripts/start_docker.sh
  ```

> **What this does:**
> * Automatically creates your `.env` file with secure random secrets.
> * Pulls all required Docker images (Postgres, Redis, MinIO, Backend API, Frontend UI).
> * Starts all containers in the background.

---

## 🛠️ Manual Launch (Using Docker Compose Directly)

If you prefer to start the containers using plain Docker commands:

### 1. Create your `.env` file
Ensure a `.env` file exists in the root folder with the following content:
```env
OSS_JWT_SECRET=your_32_character_random_secret_here
POSTGRES_PASSWORD=postgres
REDIS_PASSWORD=redissecret
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
API_IMAGE=dograhai/dograh-api:latest
```

### 2. Pull and start the Docker images
```bash
docker compose --profile tunnel up -d
```

---

## 🌐 Opening the Application

Once the containers are running:

1. Open your browser and visit:
   👉 **[http://localhost:3010](http://localhost:3010)**

2. **Create an Account:**
   * Click **Sign up**.
   * Enter your name, email, and password.

3. **Connect Your AI Voice Provider:**
   * Navigate to **AI Models** (or **Integrations**) in the left sidebar.
   * Under **Provider Connections**, click **Add Provider**.
   * Choose your provider:
     * **Sarvam AI**: Enter your Sarvam API Key.
     * **OpenAI / Cartesia / ElevenLabs / Deepgram**: Enter your API Key.
   * Under **Model Configurations**, choose your preferred voice model (e.g., Sarvam `bulbul:v3` with voice `shubh` or `kavya`, and STT `saaras:v4`).

4. **Create & Test Your Agent:**
   * Go to **Agents** $\rightarrow$ Click **Create Agent**.
   * Enter your prompt/persona (e.g. Hospital Receptionist, Customer Support).
   * Click **Test Agent** and speak into your microphone to talk to your voice AI in real-time!

---

## 📊 Useful Docker Commands

| Action | Command |
| :--- | :--- |
| **Check running status** | `docker ps` |
| **View Backend logs** | `docker logs dograh-main-api-1 -f` |
| **View Frontend logs** | `docker logs dograh-main-ui-1 -f` |
| **Stop all services** | `docker compose down` |
| **Restart all services** | `docker compose restart` |
| **Restart a single container** | `docker restart dograh-main-api-1` |

---

## 🛠️ Troubleshooting

### 1. "Docker daemon is not running"
* Ensure Docker Desktop is open and has a green indicator in the bottom-left corner.

### 2. Voice / Microphone audio not coming through
* Check that your browser has microphone permission enabled for `http://localhost:3010`.
* In Chrome, click the icon on the left of the address bar (`localhost:3010`) and ensure **Microphone** is set to **Allow**.

### 3. Port already in use
Dograh uses the following ports on your computer:
* `3010`: Frontend Web UI
* `8000`: Backend API
* `5432`: PostgreSQL
* `6379`: Redis
* `9000` / `9001`: MinIO Storage

If any port is already taken by another application, stop that application or change the port mapping in `docker-compose.yaml`.
