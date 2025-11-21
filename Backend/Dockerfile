# Multi-stage build for production
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY Backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY Backend/ /app/
COPY accounts/ /app/../accounts/
COPY audit/ /app/../audit/
COPY classifications/ /app/../classifications/
COPY core/ /app/../core/
COPY org/ /app/../org/
COPY periods/ /app/../periods/
COPY reports/ /app/../reports/
COPY submissions/ /app/../submissions/

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Collect static files (will be run during deployment)
# Run migrations and start server
EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn cfowise.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120"]
