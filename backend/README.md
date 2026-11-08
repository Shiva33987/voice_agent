# ⚙️ Backend (FastAPI + Pipecat) — Render Deployment

This is the self-contained backend for the **Inbound Voice AI Agent Platform**.

## 🚀 1-Click Deploy on Render

### Method 1: Using Render Blueprint (`render.yaml`)
1. In the [Render Dashboard](https://dashboard.render.com), click **Blueprints > New Blueprint Instance**.
2. Connect your GitHub repository (`inbound_agent`).
3. Set Blueprint Path: `backend/render.yaml`.
4. Render will automatically spin up:
   - **Web Service** (Docker)
   - **PostgreSQL Database**
   - **Redis Instance**

### Method 2: Manual Web Service
1. In Render, create:
   - A **PostgreSQL Database**
   - A **Redis Instance**
   - A **Web Service**:
     - Root Directory: `backend`
     - Runtime: **Docker**
     - DockerfilePath: `Dockerfile`
2. Add Environment Variables:
   - `DATABASE_URL`: (Your Render Postgres connection string)
   - `REDIS_URL`: (Your Render Redis connection string)
   - `CORS_ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`
   - `DEPLOYMENT_MODE`: `oss`
   - `OPENAI_API_KEY`, `GROQ_API_KEY`, etc. (your voice/LLM provider keys)
3. Deploy!

