# syntax=docker/dockerfile:1
FROM python:3.13-slim
ENV PYTHONUNBUFFERED=1
ENV UV_LINK_MODE=copy

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates netcat-traditional

ADD https://astral.sh/uv/0.8.22/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin/:$PATH"

WORKDIR /app
COPY --chmod=755 . /app/
RUN uv sync --locked

RUN chmod +x ./run.sh
CMD ["/bin/bash", "./run.sh"]