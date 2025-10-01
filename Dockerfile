# Simple static site server
FROM python:3.12-slim

# Create non-root user (safer)
RUN useradd -m appuser

WORKDIR /site
COPY . /site

# If your site lives in a subfolder (e.g., /site/citizenship-tracker-app),
# you can either COPY that folder only, or set --directory below.

EXPOSE 8000

USER appuser
# Serve everything in /site at 0.0.0.0:8000
CMD ["python", "-m", "http.server", "8000", "--bind", "0.0.0.0"]
