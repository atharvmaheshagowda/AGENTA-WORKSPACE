FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY database.py models.py schemas.py main.py ./

# Copy frontend static files
COPY static/ ./static/

# The SQLite database will be created in /app. 
# For a production deployment, this should be a mounted volume.

# Expose port 8000
EXPOSE 8000

# Run FastAPI using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
