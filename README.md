# 💡 Nanoleaf Controller (Node.js & Docker)

[](https://www.google.com/search?q=https://github.com/bausi2k/nanoleaf_server/blob/main/LICENSE)
[](https://www.google.com/search?q=https://github.com/bausi2k/nanoleaf_server/stargazers)
[](https://www.google.com/search?q=https://hub.docker.com/r/bausi2k/nanoleaf_server)

A self-hosted web controller for Nanoleaf Light Panels and Canvas devices, utilizing the local REST API. The project features **mDNS Discovery** to automatically locate the device on the network and runs on **Node.js/Express**.

-----

## ✨ Features

  * **Automatic Discovery (mDNS):** Automatically finds the Nanoleaf device on your local network (no manual IP configuration needed).
  * **Secure Authentication:** The API token is generated via the UI and persisted locally in the browser's `localStorage` for convenience.
  * **Full State Control:** Includes On/Off, Brightness, Color Temperature (CT), Hue/Saturation, and Scene selection.
  * **Live Control:** Uses **debouncing** to allow real-time slider updates without overwhelming the Nanoleaf API with too many requests.
  * **Containerized:** Easy to deploy and run using **Docker** and `docker-compose`.

-----

## 🚀 Installation & Setup (Recommended: Docker)

Using Docker is the easiest way to run the controller, as it correctly handles the necessary **Host Network Mode** for mDNS discovery.

### 1\. Clone the Repository and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/bausi2k/nanoleaf_server.git
cd nanoleaf_server

# Install Node dependencies (used by Docker for the build phase)
npm install
```

### 2\. Provide the API Token

While the UI can generate the token, it's recommended to add it to a `.env` file so the server can restart without requiring manual re-authentication.

Create a file named **`.env`** in the project root and add your Nanoleaf **Auth Token**:

```ini
# .env
# Enter your token here once generated. 
# The server will load this token upon startup.
NANOLEAF_TOKEN=YOUR_SECURE_AUTHTOKEN_HERE
```

> ⚠️ **Note:** If you leave `NANOLEAF_TOKEN=` empty, you must generate the token using the button in the web UI after the server starts.

### 3\. Build and Start the Docker Container

The `docker-compose.yml` file is configured to use the `host` network, which is required for mDNS to work correctly.

```bash
# Build the image and start the container in detached mode
docker-compose up --build -d
```

### 4\. Access the Controller

The application should now be running and accessible via your browser:

➡️ **http://localhost:3000**

-----

## 🔑 Usage and Authentication

The first time you access the web UI, or if your token expires, you will need to authenticate:

1.  **Discovery:** The server automatically searches for and connects to your Nanoleaf device.
2.  **Auth Screen:** The **"API Authentication"** section will be visible, and the control panel will be hidden.
3.  **Token Generation:**
      * Press and hold the **ON/OFF button** on your Nanoleaf Controller for 5–7 seconds until the LEDs start flashing.
      * Click the **"Generate Token / Activate API"** button **within 30 seconds**.
      * The new token will be generated, stored locally, and the control panel will be automatically displayed.

-----

## 💻 API Endpoints (Backend)

The Node.js/Express server exposes the following endpoints for the frontend application:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/get-state` | Retrieves the full current state of the Nanoleaf device. |
| `GET` | `/api/get-effects-list`| Retrieves the list of available scenes/effects. |
| `POST` | `/api/add-user` | Generates a new API token by calling `/api/v1/new`. |
| `POST` | `/api/set-ct` | Sets the Color Temperature (CT). |
| `POST` | `/api/set-brightness` | Sets the device Brightness. |
| `POST` | `/api/set-hue` | Sets the Hue (Color Tone). |
| `POST` | `/api/set-sat` | Sets the Saturation. |
| `POST` | `/api/set-on-state` | Turns the device On or Off. |
| `POST` | `/api/select-effect`| Activates a saved scene/effect. |


----

# 💡 Nanoleaf Controller (Node.js & Docker)

[](https://www.google.com/search?q=https://github.com/bausi2k/nanoleaf_server/blob/main/LICENSE)
[](https://www.google.com/search?q=https://github.com/bausi2k/nanoleaf_server/stargazers)
[](https://www.google.com/search?q=https://hub.docker.com/r/bausi2k/nanoleaf_server)

Ein einfacher, selbst gehosteter Web-Controller zur Steuerung von Nanoleaf Light Panels und Canvas über die lokale REST API. Das Projekt nutzt **mDNS Discovery**, um das Gerät automatisch im Netzwerk zu finden, und **Node.js/Express** für das Backend.

-----

## ✨ Features

  * **Automatische Discovery (mDNS):** Findet das Nanoleaf-Gerät automatisch im lokalen Netzwerk (keine manuelle IP-Konfiguration erforderlich).
  * **Sichere Authentifizierung:** Das API-Token wird über die UI generiert und lokal im Browser (`localStorage`) gespeichert.
  * **Volle Zustandssteuerung:** Ein/Aus, Helligkeit, Farbtemperatur, Hue/Saturation und Szenen-Auswahl.
  * **Live-Steuerung:** Nutzt Debouncing, um Live-Updates der Werte beim Ziehen der Regler ohne übermäßige API-Last zu ermöglichen.
  * **Containerisiert:** Einfaches Deployment über Docker und `docker-compose`.

-----

## 🚀 Installation & Start (Empfohlen: Docker)

Der einfachste Weg, den Controller zu betreiben, ist mit Docker, da dies den notwendigen **Host Network Mode** für mDNS und die Isolation der Umgebungsvariablen gewährleistet.

### 1\. Repository klonen und Abhängigkeiten installieren

```bash
# Repository klonen
git clone https://github.com/bausi2k/nanoleaf_server.git
cd nanoleaf_server

# Node-Abhängigkeiten installieren (wird auch von Docker verwendet)
npm install
```

### 2\. API Token bereitstellen

Da der Server nach einem Neustart seinen Speicher verliert, sollte der Token persistent in einer `.env`-Datei gespeichert werden.

Erstelle im Hauptverzeichnis eine Datei namens **`.env`** und trage deinen Nanoleaf **Auth Token** ein:

```ini
# .env
# Das Token wird entweder manuell hier eingetragen ODER automatisch über den UI-Button generiert.
NANOLEAF_TOKEN=DEIN_SICHERER_AUTHTOKEN_HIER
```

> ⚠️ **Wichtig:** Wenn du den Token leer lässt (`NANOLEAF_TOKEN=`), musst du ihn nach dem Start des Servers über den Button im Web-UI generieren.

### 3\. Docker Container starten

Wir nutzen `docker-compose` mit dem **Host Network Mode**, um mDNS-Anfragen zu ermöglichen.

```bash
docker-compose up --build -d
```

### 4\. Controller öffnen

Nach dem Start ist der Controller verfügbar unter:

➡️ **http://localhost:3000**

-----

## 🔑 Verwendung und Authentifizierung

Beim ersten Aufruf des Web-UIs werden folgende Schritte ausgeführt:

1.  **Discovery:** Der Server sucht im Hintergrund nach deinem Nanoleaf-Gerät.
2.  **Auth-Check:** Wenn der Token in der `.env` ungültig oder nicht vorhanden ist, wird die **"API Authentifizierung"**-Sektion angezeigt.
3.  **Token Generierung:**
      * Halte den **ON/OFF-Knopf** an deinem Nanoleaf Controller 5–7 Sekunden gedrückt, bis die LEDs anfangen zu blinken.
      * Klicke **innerhalb von 30 Sekunden** auf den Button **"Token generieren / API aktivieren"**.
      * Der neue Token wird generiert, im Backend gespeichert und im Browser (`localStorage`) persistiert. Die Steuerung wird automatisch freigeschaltet.

-----

## 🛠 Entwicklung und Manuelles Starten

Wenn du den Server ohne Docker für die lokale Entwicklung starten möchtest:

1.  Führe `npm install` aus.
2.  Stelle sicher, dass deine `.env` existiert.
3.  Starte den Server:
    ```bash
    npm start
    ```

Der Server läuft dann unter `http://localhost:3000`.

-----

## 🌐 API Endpunkte (Backend)

Der Node.js/Express Server stellt die folgenden API-Endpunkte für das Frontend bereit:

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