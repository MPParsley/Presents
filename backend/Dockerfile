# Backend Dockerfile
# Uses Python 3.11 slim image for smaller size

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Note: Ontology files are mounted via docker-compose volume
# This ensures they can be updated without rebuilding the image

# Create ontology directory (will be mounted)
RUN mkdir -p /app/ontology

# Expose port
EXPOSE 5000

# Environment variables (can be overridden in docker-compose)
ENV FUSEKI_URL=http://fuseki:3030
ENV FUSEKI_DATASET=gifts
ENV ONTOLOGY_DIR=/app/ontology
ENV PORT=5000

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:app"]
