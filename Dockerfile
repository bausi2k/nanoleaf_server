# Dockerfile

# PHASE 1: Build-Umgebung
# 🟢 NEU: Verwende das Standard Node.js 20 LTS Image (Debian-basiert)
FROM node:20 AS builder

# Setze Umgebungsvariablen
ENV NODE_ENV production
ENV PORT 8667

# Setze das Arbeitsverzeichnis
WORKDIR /app

# Installiere Build-Abhängigkeiten und notwendige Tools (z.B. für mDNS C-Bindings)
# apt-get ist der Paketmanager in Debian
RUN apt-get update && \
    apt-get install -y build-essential && \
    rm -rf /var/lib/apt/lists/*

# Kopiere die Paketdateien
COPY package*.json ./

# Installiere die Produktionsabhängigkeiten
# npm install --omit=dev kümmert sich jetzt um mdns-js
RUN npm install --omit=dev

# Kopiere den Rest der Anwendungsdateien
COPY . .

# Phase 2: Starten des Containers
# EXPOSE ist dokumentarisch, da der Host Network Mode verwendet wird
EXPOSE ${PORT}

CMD [ "npm", "start" ]