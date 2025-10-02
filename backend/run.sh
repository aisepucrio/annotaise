#!/bin/bash

uv run manage.py makemigrations
uv run manage.py migrate --noinput

uv run manage.py runserver 0.0.0.0:8000