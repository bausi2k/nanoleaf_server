# 💡 Nanoleaf Controller (Node.js & Docker)

[![GitHub license](https://img.shields.io/github/license/bausi2k/nanoleaf_server)](https://github.com/bausi2k/nanoleaf_server/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/bausi2k/nanoleaf_server)](https://github.com/bausi2k/nanoleaf_server/stargazers)
[![Docker Pulls](https://img.shields.io/docker/pulls/bausi2k/nanoleaf_server)](https://hub.docker.com/r/bausi2k/nanoleaf_server)

Ein einfacher, selbst gehosteter Web-Controller zur Steuerung von Nanoleaf Light Panels und Canvas über die lokale REST API. Dieses Projekt verwendet eine **stabile Konfiguration** über die `.env`-Datei und ist optimiert für Docker-Deployment.

---

## ✨ Features

* **Stabile Konfiguration:** Nanoleaf Host (IP:Port) und API-Token werden zentral über die `.env`-Datei verwaltet (keine anfällige Netzwerk-Discovery).
* **Persistente Authentifizierung:** Das API-Token wird über die UI generiert und lokal im Browser (`localStorage`) gespeichert. Die Steuerung ist erst nach erfolgreicher Authentifizierung sichtbar und bleibt bei Neuladen aktiv.
* **Volle Zustandssteuerung:** Ein/Aus, Helligkeit, Farbtemperatur, Hue/Saturation und Szenen-Auswahl.
* **Visuelle Indikatoren:** Live-Updates der Schieberegler spiegeln den aktuellen Zustand des Lichts wider.
* **Containerisiert:** Einfaches Deployment über Docker und `docker-compose` auf dem stabilen **Port 8667**.

---

## 🚀 Installation & Start (Version 1.0)

Der Docker Container muss im **Host Network Mode** ausgeführt werden, damit er die API des Nanoleaf-Geräts erreichen kann. Der Controller läuft auf Port **8667**.

### 1. Repository klonen und Abhängigkeiten installieren

```bash
git clone [https://github.com/bausi2k/nanoleaf_server.git](https://github.com/bausi2k/nanoleaf_server.git)
cd nanoleaf_server
npm install
````

### 2\. API Konfiguration über `.env`

Dieses Projekt benötigt die IP-Adresse:Port des Nanoleaf-Geräts **und** den API-Token.

Erstelle im Hauptverzeichnis eine Datei namens **`.env`** und trage die statische IP deines Geräts und deinen (optionalen) Token ein:

```ini
# .env
# Die IP-Adresse deines Nanoleaf-Controllers (z.B. 192.168.1.50:16021)
NANOLEAF_HOST_PORT=IP_DEINES_NANOLEAF:16021

# Das Token wird optional hier eingetragen. Wenn es fehlt, muss es über die UI generiert werden.
NANOLEAF_TOKEN=DEIN_SICHERER_AUTHTOKEN_HIER
```

### 3\. Docker Container starten

Wir nutzen `docker-compose` zum Bauen und Starten:

```bash
docker-compose up --build -d
```

### 4\. Controller öffnen

Der Controller ist verfügbar unter:

➡️ **http://localhost:8667**

-----

## 🔑 Verwendung und Authentifizierung

1.  **Host-Verfügbarkeit:** Der Server liest den Host (IP:Port) beim Start aus der `.env`.
2.  **Token Generierung:** Beim ersten Aufruf des Web-UIs, falls der Token nicht in der `.env` hinterlegt ist:
      * Halte den **ON/OFF-Knopf** am Controller 5–7 Sekunden gedrückt.
      * Klicke **"Token generieren / API aktivieren"**.
      * Der neue Token wird generiert, im Browser gespeichert, und die Steuerung wird freigeschaltet.

-----

## 🌐 API Endpunkte (Backend)

| Methode | Endpunkt | Beschreibung |
| :--- | :--- | :--- |
| `GET` | `/api/get-state` | Ruft den vollständigen Zustand des Nanoleaf-Geräts ab. |
| `GET` | `/api/get-effects-list`| Ruft die Liste der verfügbaren Szenen ab. |
| `POST` | `/api/add-user` | Generiert einen neuen API-Token (`/api/v1/new`). |
| `POST` | `/api/set-ct` | Setzt die Farbtemperatur (CT). |
| `POST` | `/api/set-brightness` | Setzt die Helligkeit. |
| `POST` | `/api/set-hue` | Setzt den Hue (Farbton). |
| `POST` | `/api/set-sat` | Setzt die Sättigung (Saturation). |
| `POST` | `/api/set-on-state` | Schaltet das Gerät ein oder aus. |
| `POST` | `/api/select-effect`| Aktiviert eine Szene. |