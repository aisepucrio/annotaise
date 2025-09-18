# syntax=docker/dockerfile:1
FROM python:3.13-slim
ENV PYTHONUNBUFFERED=1

WORKDIR /src
COPY requirements.txt /src/
RUN pip install -r requirements.txt
COPY --chmod=755 . /src/

RUN chmod +x ./run.sh
CMD ["/bin/bash", "./run.sh"]