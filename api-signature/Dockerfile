# Servicio interno de firma de PDF (pyHanko). No publica puertos: solo la API lo alcanza por la red de Docker.
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FIRMA_FUENTE=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY firmador.py crear_certificado.py matchoncard-isotipo.png ./
RUN groupadd -g 10001 firma && useradd -u 10001 -g firma -M -s /usr/sbin/nologin firma
USER firma
EXPOSE 4563
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:4563/salud || exit 1
CMD ["uvicorn", "firmador:app", "--host", "0.0.0.0", "--port", "4563", "--workers", "2", "--no-server-header"]
