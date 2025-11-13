# Dockerfile

# PHASE 1: Build-Umgebung
# Wir verwenden das offizielle Node.js 20 LTS Image als Basis.
FROM node:20-alpine AS builder

# Setze das Arbeitsverzeichnis im Container
WORKDIR /app

# Kopiere die Abhängigkeitsdateien (package.json, package-lock.json), um den Cache optimal zu nutzen.
COPY package*.json ./

# Installiere die Produktionsabhängigkeiten.
# --omit=dev entfernt Entwicklungspakete, um die Image-Größe zu reduzieren.
RUN npm install --omit=dev

# Kopiere den Rest der Anwendungsdateien in das Arbeitsverzeichnis
COPY . .

# Wir müssen den Port, auf dem die App läuft, im Container freigeben.
EXPOSE 3000

# PHASE 2: Starten des Containers
# Der Container wird direkt aus Phase 1 gestartet.

# Der Befehl, der beim Start des Containers ausgeführt wird.
# Führt den im package.json definierten "start"-Skript aus: 'node server.js'
CMD [ "npm", "start" ]