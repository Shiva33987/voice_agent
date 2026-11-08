# 🌐 Frontend (Next.js 15) — Vercel Deployment

This is the production frontend for the **Inbound Voice AI Agent Platform**.

## 🚀 1-Click Deploy on Vercel

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your repository (`inbound_agent`).
4. Set the **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
   BACKEND_URL=https://your-backend.onrender.com
   NEXT_PUBLIC_NODE_ENV=production
   ```
6. Click **Deploy**!

---

## 💻 Local Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`.
