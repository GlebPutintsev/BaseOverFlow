FROM python:3.12-slim

WORKDIR /app

copy backend/requirements.txt .

RUN pip install -r requirements.txt

copy backend/ .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]