# syntax=docker/dockerfile:1
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast, reliable, conflict-free dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

ENV VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    SETUPTOOLS_SCM_PRETEND_VERSION="1.0.1"

RUN python -m venv "$VIRTUAL_ENV"

# Install API requirements
COPY backend/api/requirements.txt /tmp/requirements.txt
RUN uv pip install --no-cache -r /tmp/requirements.txt

# Install self-contained Pipecat voice framework
COPY backend/pipecat /tmp/pipecat
RUN uv pip install --no-cache '/tmp/pipecat[cartesia,deepgram,openai,elevenlabs,groq,google,azure,sarvam,soundfile,silero,webrtc,speechmatics,openrouter,camb,mcp,inworld,smallest,aws-nova-sonic]' \
 && uv pip uninstall opencv-python 2>/dev/null || true \
 && uv pip install --no-cache opencv-python-headless

# Final Runtime Image
FROM python:3.12-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv

ENV VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    PYTHONPATH=/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    LOG_TO_FILE=false \
    PORT=8000

# Copy application code
COPY ./backend/api ./api
COPY ./backend/docs ./docs
COPY ./backend/scripts ./scripts
COPY ./backend/start.sh ./start.sh

RUN chmod +x ./start.sh ./scripts/*.sh 2>/dev/null || true

EXPOSE 8000

CMD ["./start.sh"]
