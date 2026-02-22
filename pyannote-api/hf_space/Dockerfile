FROM python:3.10-slim

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

COPY app.py .

ENV HF_TOKEN=${HF_TOKEN}

EXPOSE 7860

CMD ["python", "app.py"]
