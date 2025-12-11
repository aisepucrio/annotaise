#!/bin/bash

# Wait for the database
echo "Waiting for database to be ready..."
until nc -z db 5432; do
    echo "Database not ready yet. Retrying in 2 seconds..."
    sleep 2
done
echo "Database is ready."

echo "Applying migrations..."
uv run manage.py makemigrations
uv run manage.py migrate --noinput
if [ $? -ne 0 ]; then
    echo "Error: Failed to apply migrations."
    exit 1
fi
echo "Migrations applied successfully."

# Create superuser
echo "Creating superuser..."
uv run manage.py createsuperuser --noinput --username "${DJANGO_SUPERUSER_USERNAME}" --email "${DJANGO_SUPERUSER_EMAIL}"
echo "Superuser created or already exists."

# Start the server
if [ "$DEBUG" = "false" ]; then
    echo "Collecting static files..."
    uv run manage.py collectstatic --no-input
    echo "Static files collected successfully."
    echo "Starting Django production server with gunicorn (DEBUG=False)..."
    uv run gunicorn annotaise.wsgi:application --bind 0.0.0.0:8000
else
    echo "Starting Django development server (DEBUG=True)..."
    uv run manage.py runserver 0.0.0.0:8000
fi