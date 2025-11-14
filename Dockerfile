# Dockerfile

# Stage 1: Build-Umgebung (um Git und die Abhängigkeiten zu installieren)
FROM node:20 AS builder

# Setze Umgebungsvariablen
ENV NODE_ENV production
ENV PORT 8667

# Setze das Arbeitsverzeichnis
WORKDIR /app

# Installiere Git und build-essential (für das Kompilieren von mdns-js und nativen Modulen)
RUN apt-get update && \
    apt-get install -y git build-essential && \
    rm -rf /var/lib/apt/lists/*

# 1. Klonen des öffentlichen Repositorys
# Dies lädt den Code von GitHub
RUN git clone https://github.com/bausi2k/nanoleaf_server.git .

# 2. Installiere die Produktionsabhängigkeiten
# npm install liest jetzt package.json aus dem geklonten Repo
RUN npm install --omit=dev

# Phase 2: Starten des Containers (Optional, aber sauberer: nutzt das build-Artefakt)
# Wir verwenden hier Stage 1, um die Sache einfach zu halten, da build-essential nicht riesig ist.

# Expose Port
EXPOSE ${PORT}

# Befehl zum Starten der Anwendung
CMD [ "npm", "start" ]