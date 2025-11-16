Absolut\! Wir räumen auf und vereinfachen die Architektur auf den **zuverlässigsten Ansatz**: feste Host-Konfiguration über die `.env`-Datei. Dadurch entfallen die anfällige mDNS-Logik und die komplexen UI-Elemente für die Discovery. 👍

Hier ist der komplette, finale Code für diese Version.

-----

## 1\. ⚙️ Projektbereinigung & Abhängigkeiten

Zuerst musst du dein Projekt bereinigen, um die unnötigen Discovery-Pakete und Logiken zu entfernen.

1.  **Deinstalliere `mdns-js`:**
    ```bash
    npm uninstall mdns-js
    ```
2.  **Lösche `build-essential`:** (Wir brauchen es nicht mehr, da wir keine C-Bindings kompilieren.)
      * **Im `Dockerfile`:** Entferne die Zeile `RUN apt-get install -y build-essential` und die Zeile `RUN apt-get update`.

-----

## 2\. 💻 Vollständiger Code: `server.js` (Final, .env-basiert)

Alle API-Funktionen verwenden jetzt wieder die globale Variable `DEVICE_HOST_PORT`, die direkt aus der `.env`-Datei beim Start geladen wird.

```javascript
// server.js

const express = require('express');
require('dotenv').config(); 
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');

const app = express();
const port = 8667; 

// **********************************************
// ** SICHERE KONFIGURATION & STATISCHE HOST **
// **********************************************
// Lade Token und Host direkt aus .env
let NANOLEAF_TOKEN = process.env.NANOLEAF_TOKEN; 
const NANOLEAF_HOST_PORT_ENV = process.env.NANOLEAF_HOST_PORT; // IP:Port

// Globale Variablen für den Server
let DEVICE_HOST_PORT = NANOLEAF_HOST_PORT_ENV; 

// Nanoleaf Bereiche (unverändert)
const CT_MIN = 1200; 
const CT_MAX = 6500;
const BRIGHTNESS_MIN = 0;
const BRIGHTNESS_MAX = 100;
const HUE_MIN = 0;
const HUE_MAX = 360;
const SAT_MIN = 0;
const SAT_MAX = 100;
// **********************************************

app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public'))); 

// **********************************************
// ** API HELFER (BASIERT AUF GLOBALEN VARS) **
// **********************************************

/**
 * @function getFullApiUrl
 * @description Gibt die vollständige URL mit Token und Host (aus .env) zurück.
 */
function getFullApiUrl(endpoint = '') {
    if (!NANOLEAF_TOKEN) {
        throw new Error('Konfigurationsfehler: NANOLEAF_TOKEN fehlt. Bitte in .env setzen.');
    }
    if (!DEVICE_HOST_PORT) {
        throw new Error('Konfigurationsfehler: NANOLEAF_HOST_PORT fehlt. Bitte in .env setzen.');
    }
    return `http://${DEVICE_HOST_PORT}/api/v1/${NANOLEAF_TOKEN}${endpoint}`;
}


function getNewAuthTokenUrl() {
    if (!DEVICE_HOST_PORT) {
        throw new Error('Konfigurationsfehler: NANOLEAF_HOST_PORT fehlt. Bitte in .env setzen.');
    }
    return `http://${DEVICE_HOST_PORT}/api/v1/new`;
}


async function addNanoleafUser() {
    const url = getNewAuthTokenUrl();
    
    console.log(`[AUTH POST] Sende Token-Request an URL: ${url}`);
    
    try {
        const response = await fetch(url, { method: 'POST' });

        if (response.status === 403) {
            throw new Error('403 Forbidden: Das Pairing-Fenster (30s) ist abgelaufen oder nicht offen.');
        }
        if (!response.ok) {
             const errorText = await response.text();
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        const newToken = data.auth_token;

        if (!newToken) {
            throw new Error('Antwort enthielt keinen auth_token.');
        }

        // Token im Arbeitsspeicher aktualisieren (für die aktuelle Sitzung)
        NANOLEAF_TOKEN = newToken;
        console.log("✅ Neuer Token im Backend gespeichert und einsatzbereit.");

        return newToken;

    } catch (error) {
        console.error('❌ KRITISCHER FEHLER beim Generieren des Tokens:', error.message);
        throw new Error(`Failed to generate new token: ${error.message}`);
    }
}


// --- RESTLICHE API FUNKTIONEN (Nutzen getFullApiUrl ohne req-Parameter) ---

async function setColourTemperature(ctValue) {
    const url = getFullApiUrl('/state');
    const requestBody = { "ct": { "value": ctValue } };
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) {
             const errorText = await response.text();
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        return { status: response.status, message: 'Colour temperature updated successfully.' };
    } catch (error) {
        throw new Error(`Failed to update colour temperature: ${error.message}`);
    }
}

async function setBrightness(brightnessValue) {
    const url = getFullApiUrl('/state');
    const requestBody = { "brightness": { "value": brightnessValue } };
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) {
             const errorText = await response.text();
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        return { status: response.status, message: 'Brightness updated successfully.' };
    } catch (error) {
        throw new Error(`Failed to update brightness: ${error.message}`);
    }
}


async function setOnState(onState) {
    const url = getFullApiUrl('/state');
    const requestBody = { "on": { "value": onState } };
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) {
             const errorText = await response.text();
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        return { status: response.status, message: `On state set to ${onState}.` };
    } catch (error) {
        throw new Error(`Failed to update on state: ${error.message}`);
    }
}


async function setHue(hueValue) {
    const url = getFullApiUrl('/state');
    const requestBody = { "hue": { "value": hueValue } };
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) {
             const errorText = await response.text();
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        return { status: response.status, message: `Hue set to ${hueValue}.` };
    } catch (error) {
        throw new Error(`Failed to update Hue: ${error.message}`);
    }
}

async function setSaturation(satValue) {
    const url = getFullApiUrl('/state');
    const requestBody = { "sat": { "value": satValue } };
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) {
             const errorText = await response.text();
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        return { status: response.status, message: `Saturation set to ${satValue}.` };
    } catch (error) {
        throw new Error(`Failed to update Saturation: ${error.message}`);
    }
}

async function getEffectsList() {
    const url = getFullApiUrl('/effects/effectsList'); 
    try {
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) {
             const errorText = await response.text();
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        const data = await response.json(); 
        return data;
    } catch (error) {
        throw new Error(`Failed to retrieve effects list: ${error.message}`);
    }
}

async function selectEffect(effectName) {
    const url = getFullApiUrl('/effects');
    const requestBody = { "select": effectName }; 
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) {
             const errorText = await response.text();
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        return { status: response.status, message: `Effect ${effectName} activated.` };
    } catch (error) {
        throw new Error(`Failed to select effect: ${error.message}`);
    }
}

async function getDeviceState() {
    const url = getFullApiUrl('/'); 
    try {
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) {
             const errorText = await response.text();
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Failed to retrieve device state: ${error.message}`);
    }
}


// **********************************************
// ** ROUTEN **
// **********************************************

// Route zur Auth-Token Generierung
app.post('/api/add-user', async (req, res) => {
    try {
        // Prüfe, ob Host konfiguriert ist, bevor wir versuchen, den Token zu generieren
        if (!DEVICE_HOST_PORT) {
             return res.status(500).json({ success: false, error: 'Konfigurationsfehler.', details: 'NANOLEAF_HOST_PORT fehlt im Server.' });
        }
        const newToken = await addNanoleafUser();
        res.status(200).json({ success: true, auth_token: newToken });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Fehler bei der Token-Generierung.', details: error.message });
    }
});


// --- RESTLICHE ROUTEN (Nutzen die vereinfachten API-Funktionen) ---

app.post('/api/set-ct', async (req, res) => {
    const { ct } = req.body; 
    const ctValue = parseInt(ct);
    if (isNaN(ctValue) || ctValue < CT_MIN || ctValue > CT_MAX) { return res.status(400).json({ error: `Ungültiger CT-Wert. Erlaubt: ${CT_MIN}-${CT_MAX}.` }); }
    try {
        const apiResponse = await setColourTemperature(ctValue);
        res.status(200).json({ success: true, ct: ctValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim CT-Aufruf.', details: error.message }); }
});

app.post('/api/set-brightness', async (req, res) => {
    const { brightness } = req.body; 
    const brightnessValue = parseInt(brightness);
    if (isNaN(brightnessValue) || brightnessValue < BRIGHTNESS_MIN || brightnessValue > BRIGHTNESS_MAX) { return res.status(400).json({ error: `Ungültiger Helligkeitswert. Erlaubt: ${BRIGHTNESS_MIN}-${BRIGHTNESS_MAX}.` }); }
    try {
        const apiResponse = await setBrightness(brightnessValue);
        res.status(200).json({ success: true, brightness: brightnessValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Helligkeits-Aufruf.', details: error.message }); }
});

app.post('/api/set-on-state', async (req, res) => {
    const { onState } = req.body; 
    if (typeof onState !== 'boolean') { return res.status(400).json({ error: 'Ungültiger On/Off-Wert. Erwartet wird true oder false.' }); }
    try {
        const apiResponse = await setOnState(onState);
        res.status(200).json({ success: true, onState: onState, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim On/Off-Aufruf.', details: error.message }); }
});

app.post('/api/set-hue', async (req, res) => {
    const { hue } = req.body; 
    const hueValue = parseInt(hue);
    if (isNaN(hueValue) || hueValue < HUE_MIN || hueValue > HUE_MAX) { return res.status(400).json({ error: `Ungültiger Hue-Wert. Erlaubt: ${HUE_MIN}-${HUE_MAX}.` }); }
    try {
        const apiResponse = await setHue(hueValue);
        res.status(200).json({ success: true, hue: hueValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Hue-Aufruf.', details: error.message }); }
});

app.post('/api/set-sat', async (req, res) => {
    const { sat } = req.body; 
    const satValue = parseInt(sat);
    if (isNaN(satValue) || satValue < SAT_MIN || satValue > SAT_MAX) { return res.status(400).json({ error: `Ungültiger Saturation-Wert. Erlaubt: ${SAT_MIN}-${SAT_MAX}.` }); }
    try {
        const apiResponse = await setSaturation(satValue);
        res.status(200).json({ success: true, sat: satValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Saturation-Aufruf.', details: error.message }); }
});

app.get('/api/get-effects-list', async (req, res) => {
    try {
        const effectsList = await getEffectsList();
        res.status(200).json(effectsList);
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Abruf der Effektliste.', details: error.message }); }
});

app.post('/api/select-effect', async (req, res) => {
    const { effectName } = req.body; 
    if (typeof effectName !== 'string' || effectName.trim().length === 0) { return res.status(400).json({ error: 'Ungültiger Effektname.' }); }
    try {
        const apiResponse = await selectEffect(effectName);
        res.status(200).json({ success: true, effectName: effectName, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Effekt-Aufruf.', details: error.message }); }
});

app.get('/api/get-state', async (req, res) => {
    try {
        const stateData = await getDeviceState();
        res.status(200).json(stateData);
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Abruf des Gerätezustands.', details: error.message }); }
});


// **********************************************
// ** SERVER START **
// **********************************************

app.listen(port, () => {
    if (!NANOLEAF_HOST_PORT_ENV) {
        console.error("❌ KRITISCHER FEHLER: NANOLEAF_HOST_PORT fehlt in der .env-Datei. Bitte korrigieren!");
        return;
    }
    console.log(`✅ Server läuft auf http://localhost:${port}`);
    console.log(`Verbindet zu Nanoleaf-Gerät: http://${NANOLEAF_HOST_PORT_ENV}`);
    console.log('---');
});
```

-----

## 3\. 💻 Vollständiger Code: `public/index.html` (Bereinigt)

Die Host-Konfigurationssektion wurde entfernt, da Host/Port nun statisch über die `.env` im Backend gesetzt werden.

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Nanoleaf Controller</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .container { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
        .hidden { display: none !important; }
        
        h1 { width: 100%; text-align: center; color: #333; margin-bottom: 20px; }
        h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; color: #555; }
        label { display: block; margin: 15px 0 5px; font-weight: bold; }
        input[type="range"] { width: 100%; height: 25px; } 
        #ctValue, #brightnessValue, #hueValue, #satValue { display: inline-block; margin-left: 10px; font-weight: bold; }
        #statusMessage { margin-top: 20px; padding: 10px; border-radius: 4px; width: 100%; }
        .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        #refreshButton { display: block; margin-top: 15px; padding: 10px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        #refreshButton:hover { background-color: #0056b3; }
        hr { border: 0; height: 1px; background: #ccc; margin: 20px 0; width: 100%; }
        #setCtButton, #setBrightnessButton, #setHueButton, #setSatButton { display: none; } 
        
        /* On/Off Switch Styling */
        .toggle-switch { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
        .toggle-switch label { margin: 0; }
        .switch { position: relative; display: inline-block; width: 60px; height: 34px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #2196F3; }
        input:checked + .slider:before { transform: translateX(26px); }

        /* Visuelle Indikatoren */
        .indicator-label { display: flex; justify-content: space-between; align-items: center; }
        .indicator-bar { height: 20px; border-radius: 4px; margin-top: 5px; border: 1px solid #ccc; overflow: hidden;}
        
        /* Vordefinierte CSS für Slider-Hintergrundfarben */
        #hueRange { 
            background: linear-gradient(to right, 
                #FF0000 0%, #FFFF00 17%, #00FF00 33%, 
                #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%); 
        }
        #ctRange {
            background: linear-gradient(to right, #FFC966, #FFFFF0, #D6F0FF);
        }
        
        /* AUTH Bereich (jetzt auch für Host-Eingabe) */
        #authSection {
            background-color: #fff3cd;
            border: 1px solid #ffeeba;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            width: 100%;
        }
        #generateTokenButton {
            background-color: #ffc107;
            color: #343a40;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 10px;
        }
        #generatedToken {
            word-break: break-all;
            background-color: #e9ecef;
            padding: 8px;
            border-radius: 3px;
            margin-top: 10px;
            font-size: 0.9em;
        }
        /* Steuerung Sektion */
        #controlContent {
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💡 Nanoleaf Controller Dashboard</h1>
        
        <div id="authSection">
            <h2>API Authentifizierung benötigt</h2>
            <p>1. Halten Sie den ON/OFF-Knopf 5-7s gedrückt.</p>
            <p>2. Klicken Sie auf den Button.</p>
            <button id="generateTokenButton">Token generieren / API aktivieren</button>
            <p id="generatedTokenMessage" style="margin-top: 10px;"></p>
            <div id="generatedToken" style="display: none;"></div>
        </div>

        <hr id="authHr" class="hidden">

        <div id="controlContent" class="hidden"> 
            <div id="deviceState">
                <h2>Aktueller Gerätestatus</h2>
                <p><strong>Status:</strong> <span id="display-on-state">--</span></p>
                <p><strong>Aktueller Effekt:</strong> <span id="display-effect-name">--</span></p>
                <p><strong>Helligkeit:</strong> <span id="display-brightness">--</span> %</p>
                <p><strong>Farbtemperatur:</strong> <span id="display-ct-value">--</span> K</p>
                <p><strong>Farbton (Hue):</strong> <span id="display-hue-value">--</span> °</p>
                <p><strong>Sättigung (Sat):</strong> <span id="display-sat-value">--</span> %</p>
                <p><strong>Farbmodus:</strong> <span id="display-color-mode">--</span></p>
                <button id="refreshButton">Status aktualisieren</button>
            </div>

            <hr>
            
            <div class="toggle-switch">
                <label for="onOffSwitch"><h2>Gerät AN/AUS</h2></label>
                <label class="switch">
                    <input type="checkbox" id="onOffSwitch">
                    <span class="slider"></span>
                </label>
            </div>
            
            <hr>

            <h2>Effekt auswählen</h2>
            <label for="effectSelect">Verfügbare Szenen:</label>
            <select id="effectSelect">
                <option value="">-- Lade Effekte... --</option>
            </select>
            
            <hr>
            
            <h2>Farbe steuern (Hue/Saturation)</h2>
            
            <div class="indicator-label">
                <label for="hueRange">Farbton (Hue):</label>
                <span id="hueValue">0 °</span>
            </div>
            <input type="range" id="hueRange" min="0" max="360" value="0" step="1">
            <div class="indicator-bar" id="hueIndicator"></div>

            <div class="indicator-label">
                <label for="satRange">Sättigung (Saturation):</label>
                <span id="satValue">100 %</span>
            </div>
            <input type="range" id="satRange" min="0" max="100" value="100" step="1">
            <div class="indicator-bar" id="satIndicator"></div>
            
            <hr>
            
            <h2>Helligkeit steuern</h2>
            <div class="indicator-label">
                <label for="brightnessRange">Helligkeit (Prozent):</label>
                <span id="brightnessValue">50 %</span>
            </div>
            <input type="range" id="brightnessRange" min="0" max="100" value="50" step="1">
            <div class="indicator-bar" id="brightnessIndicator"></div>
            
            <hr>
            
            <h2>Farbtemperatur steuern</h2>
            <div class="indicator-label">
                <label for="ctRange">Farbtemperatur (Kelvin):</label>
                <span id="ctValue">4000 K</span>
            </div>
            <input type="range" id="ctRange" min="1200" max="6500" value="4000" step="100">
            <div class="indicator-bar" id="ctIndicator"></div>
        </div>
        
        <div id="statusMessage"></div>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

-----

## 4\. 💻 Vollständiger Code: `public/script.js` (Bereinigt und lokalisiert)

Die Host-Discovery-Logik wurde entfernt. Die UI-Steuerung basiert nur noch auf dem Token im Local Storage.

```javascript
// public/script.js

// Konstanten für Local Storage Keys
const NANOLEAF_TOKEN_KEY = 'nanoleaf_auth_token';

// Konstanten für die HTML-Elemente
const ctRange = document.getElementById('ctRange');
const ctValueDisplay = document.getElementById('ctValue');
const brightnessRange = document.getElementById('brightnessRange');
const brightnessValueDisplay = document.getElementById('brightnessValue');
const onOffSwitch = document.getElementById('onOffSwitch'); 
const hueRange = document.getElementById('hueRange'); 
const hueValueDisplay = document.getElementById('hueValue'); 
const satRange = document.getElementById('satRange'); 
const satValueDisplay = document.getElementById('satValue'); 
const effectSelect = document.getElementById('effectSelect'); 
const statusMessage = document.getElementById('statusMessage');

// AUTH Elemente
const authSection = document.getElementById('authSection');
const authHr = document.getElementById('authHr');
const controlContent = document.getElementById('controlContent');
const generateTokenButton = document.getElementById('generateTokenButton');
const generatedTokenDiv = document.getElementById('generatedToken');
const generatedTokenMsg = document.getElementById('generatedTokenMessage');

// Konstanten für die Statusanzeige
const refreshButton = document.getElementById('refreshButton');
const displayOnState = document.getElementById('display-on-state');
const displayEffectName = document.getElementById('display-effect-name'); 
const displayBrightness = document.getElementById('display-brightness');
const displayCTValue = document.getElementById('display-ct-value');
const displayHueValue = document.getElementById('display-hue-value'); 
const displaySatValue = document.getElementById('display-sat-value'); 
const displayColorMode = document.getElementById('display-color-mode');

// Konstanten für die Indikatoren
const hueIndicator = document.getElementById('hueIndicator');
const satIndicator = document.getElementById('satIndicator');
const brightnessIndicator = document.getElementById('brightnessIndicator');
const ctIndicator = document.getElementById('ctIndicator');

// Variablen für Debouncing
const DEBOUNCE_DELAY_MS = 150; 

// Initialisierung und Event Listener
document.addEventListener('DOMContentLoaded', () => {
    // Token prüfen und UI initialisieren
    checkAndSetupToken();

    refreshButton.addEventListener('click', getAndVisualizeState);

    // Steuerung Events
    ctRange.addEventListener('input', handleCtSliderInput);
    brightnessRange.addEventListener('input', handleBrightnessSliderInput);
    onOffSwitch.addEventListener('change', handleOnOffSwitchChange);
    hueRange.addEventListener('input', handleHueSliderInput);
    satRange.addEventListener('input', handleSatSliderInput);
    effectSelect.addEventListener('change', handleEffectSelectChange);
    
    // AUTH Event
    generateTokenButton.addEventListener('click', generateToken);

    // Initialen Status und Effektliste beim Laden abrufen
    loadEffects();
    getAndVisualizeState();
});

// **********************************************
// ** AUTH & PERSISTENCE FUNKTIONEN **
// **********************************************

/**
 * @function checkAndSetupToken
 * @description Lädt Token aus Local Storage und initialisiert die UI.
 */
function checkAndSetupToken() {
    const storedToken = localStorage.getItem(NANOLEAF_TOKEN_KEY);
    
    // UI basierend auf Token steuern
    if (storedToken) {
        showControlUI(true);
    } else {
        showControlUI(false);
    }
}


/**
 * @function showControlUI
 * @description Steuert die Sichtbarkeit der Control-Sektion.
 */
function showControlUI(isTokenValid) {
    if (isTokenValid) {
        authSection.classList.add('hidden');
        authHr.classList.add('hidden');
        controlContent.classList.remove('hidden');
    } else {
        authSection.classList.remove('hidden');
        authHr.classList.remove('hidden');
        controlContent.classList.add('hidden');
    }
}


// **********************************************
// ** AUTH GENERIERUNG **
// **********************************************

async function generateToken() {
    generatedTokenMsg.textContent = 'Sende Anfrage... Gerät muss blinken.';
    generatedTokenDiv.style.display = 'none';
    generateTokenButton.disabled = true;

    try {
        // Backend fragt die im Server definierte IP ab
        const response = await fetch('/api/add-user', {
            method: 'POST'
        });
        
        const result = await response.json();

        if (response.ok) {
            const newToken = result.auth_token;
            
            // 1. Token im Local Storage speichern (Persistenz)
            localStorage.setItem(NANOLEAF_TOKEN_KEY, newToken);

            // 2. UI Status aktualisieren
            generatedTokenMsg.textContent = '✅ Token erfolgreich generiert und gespeichert!';
            generatedTokenMsg.style.color = 'green';
            generatedTokenDiv.textContent = `Neuer Token: ${newToken}`;
            generatedTokenDiv.style.display = 'block';
            
            // 3. Auf Steuerung umschalten und Daten neu laden
            showControlUI(true);
            loadEffects();
            getAndVisualizeState();
            
        } else {
            generatedTokenMsg.textContent = `❌ Fehler: ${result.details || result.error || 'Unbekannter Fehler'}. Ist das Pairing-Fenster offen?`;
            generatedTokenMsg.style.color = 'red';
            showControlUI(false); 
        }
    } catch (error) {
        generatedTokenMsg.textContent = `🚨 Kommunikationsfehler zum Server: ${error.message}`;
        generatedTokenMsg.style.color = 'red';
        showControlUI(false);
    } finally {
        generateTokenButton.disabled = false;
    }
}


// **********************************************
// ** API CALLS (KONTROLLE & FEHLERBEHANDLUNG) **
// **********************************************

async function handleApiError(response, errorMessage) {
    if (response && response.status === 401) {
        // Token ist ungültig oder abgelaufen -> Token im LS löschen und Auth UI zeigen
        localStorage.removeItem(NANOLEAF_TOKEN_KEY);
        showControlUI(false);
        statusMessage.textContent = '🚨 Token ungültig (401). Bitte neuen Token generieren.';
        statusMessage.className = 'error';
        return true; 
    }
    // Konfigurationsfehler vom Backend (z.B. Host/Token fehlt)
    if (errorMessage && errorMessage.includes('Konfigurationsfehler')) {
        statusMessage.textContent = '🚨 Server-Konfiguration unvollständig (.env prüfen).';
        statusMessage.className = 'error';
        showControlUI(false);
        return true;
    }
    return false;
}

// Hilfsfunktion zum Senden von Daten an das Backend
async function sendDataToBackend(endpoint, data, successMsg) {
    const token = localStorage.getItem(NANOLEAF_TOKEN_KEY);
    
    if (!token) {
        showControlUI(false);
        return false;
    }
    
    statusMessage.textContent = `Sende Anfrage an ${endpoint}...`;
    statusMessage.className = '';

    try {
        // Füge Token Header hinzu, der im Backend verwendet wird, um den Aufruf zu autorisieren
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Nanoleaf-Token-Client': token // 🚨 Füge Token hinzu
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();

        if (await handleApiError(response, result.details)) {
            return false;
        }

        if (response.ok) {
            statusMessage.textContent = `✅ ${successMsg}`;
            statusMessage.className = 'success';
            return true;
        } else {
            statusMessage.textContent = `❌ Fehler: ${result.error || result.details}`;
            statusMessage.className = 'error';
            return false;
        }
    } catch (error) {
        statusMessage.textContent = `🚨 Kommunikationsfehler: ${error.message}. Ist der Server (Node/Docker) gestartet?`;
        statusMessage.className = 'error';
        return false;
    }
}

// **********************************************
// ** GET AND VISUALIZE STATE **
// **********************************************

async function getAndVisualizeState() {
    const token = localStorage.getItem(NANOLEAF_TOKEN_KEY);
    
    if (!token) {
        showControlUI(false);
        return;
    }
    
    // Ladezustand anzeigen
    displayOnState.textContent = 'Lade...'; 
    displayEffectName.textContent = 'Lade...'; 
    statusMessage.textContent = ''; 

    try {
        const response = await fetch('/api/get-state', {
             headers: { 'X-Nanoleaf-Token-Client': token } // Sende Token
        });
        const data = await response.json();
        
        if (await handleApiError(response, data.details)) {
            return;
        }

        if (!response.ok) {
            throw new Error(`Backend-Fehler: ${data.error || data.details || 'Unbekannter Fehler'}`);
        }
        
        const state = data.state;
        
        // 1. On/Off
        const isOn = state.on.value;
        displayOnState.textContent = isOn ? 'AN' : 'AUS';
        displayOnState.style.color = isOn ? 'green' : 'red';
        onOffSwitch.checked = isOn;

        // 2. Effektname
        const currentEffect = data.effects ? data.effects.select : 'N/A';
        displayEffectName.textContent = currentEffect;
        effectSelect.value = currentEffect;

        // 3. Werte für Indikatoren sammeln & UI synchronisieren
        const currentValues = {
            brightness: state.brightness.value,
            ct: state.ct.value,
            hue: state.hue.value,
            sat: state.sat.value
        };
        displayBrightness.textContent = currentValues.brightness;
        brightnessRange.value = currentValues.brightness;
        brightnessValueDisplay.textContent = `${currentValues.brightness} %`;
        
        displayCTValue.textContent = currentValues.ct;
        ctRange.value = Math.round(currentValues.ct / 100) * 100;
        ctValueDisplay.textContent = `${currentValues.ct} K`;

        displayHueValue.textContent = currentValues.hue;
        hueRange.value = currentValues.hue;
        hueValueDisplay.textContent = `${currentValues.hue} °`;

        displaySatValue.textContent = currentValues.sat;
        satRange.value = currentValues.sat;
        satValueDisplay.textContent = `${currentValues.sat} %`;
        
        displayColorMode.textContent = state.colorMode;

        // 4. VISUELLE UPDATES
        updateVisualIndicators(currentValues);

        statusMessage.textContent = '✅ Status erfolgreich aktualisiert.';
        statusMessage.className = 'success';
        showControlUI(true); // Bestätige, dass der Token noch gültig ist
    } catch (error) {
        statusMessage.textContent = `🚨 Fehler beim Abrufen des Gerätestatus: ${error.message}`;
        statusMessage.className = 'error';
    }
}

// --- Restliche Funktionen verwenden jetzt sendDataToBackend ---

async function setColourTemperature(ctValue) {
    const success = await sendDataToBackend('/api/set-ct', { ct: ctValue }, `CT erfolgreich auf ${ctValue} K gesetzt.`);
    if (success) { updateVisualIndicators(getVisualStateFromSliders()); }
}

async function setBrightness(brightnessValue) {
    const success = await sendDataToBackend('/api/set-brightness', { brightness: brightnessValue }, `Helligkeit erfolgreich auf ${brightnessValue} % gesetzt.`);
    if (success) { updateVisualIndicators(getVisualStateFromSliders()); }
}

async function setOnState(onState) {
    const success = await sendDataToBackend('/api/set-on-state', { onState: onState }, `Gerät erfolgreich ${onState ? 'EINGESCHALTET' : 'AUSGESCHALTET'}.`);
    if (success) { getAndVisualizeState(); }
}

async function setHue(hueValue) {
    const success = await sendDataToBackend('/api/set-hue', { hue: hueValue }, `Hue erfolgreich auf ${hueValue} ° gesetzt.`);
    if (success) { updateVisualIndicators(getVisualStateFromSliders()); }
}

async function setSaturation(satValue) {
    const success = await sendDataToBackend('/api/set-sat', { sat: satValue }, `Saturation erfolgreich auf ${satValue} % gesetzt.`);
    if (success) { updateVisualIndicators(getVisualStateFromSliders()); }
}

async function selectEffect(effectName) {
    const success = await sendDataToBackend('/api/select-effect', { effectName: effectName }, `Effekt "${effectName}" erfolgreich aktiviert.`);
    if (success) { getAndVisualizeState(); }
}

async function loadEffects() {
    const token = localStorage.getItem(NANOLEAF_TOKEN_KEY);
    
    if (!token) {
        effectSelect.innerHTML = '<option value="">-- Token fehlt --</option>';
        return;
    }
    
    effectSelect.innerHTML = '<option value="">-- Lade Effekte... --</option>';

    try {
        const response = await fetch('/api/get-effects-list', { headers: { 'X-Nanoleaf-Token-Client': token } });
        const effectsList = await response.json();
        
        if (await handleApiError(response, effectsList)) { return; }

        if (!response.ok) {
            throw new Error(`Backend-Fehler beim Laden der Effekte: ${effectsList.error}`);
        }
        
        effectSelect.innerHTML = '<option value="">-- Effekt auswählen --</option>';

        effectsList.forEach(effectName => {
            const option = document.createElement('option');
            option.value = effectName;
            option.textContent = effectName;
            effectSelect.appendChild(option);
        });
        
        statusMessage.textContent = `✅ Effektliste geladen (${effectsList.length} Effekte).`;
        statusMessage.className = 'success';

    } catch (error) {
        statusMessage.textContent = `🚨 Fehler beim Laden der Effektliste: ${error.message}`;
        statusMessage.className = 'error';
        effectSelect.innerHTML = '<option value="">-- Fehler beim Laden --</option>';
    }
}

// --- VISUALISIERUNG UND HELFER ---
function hsbToRgb(h, s, v) {
    s /= 100; v /= 100; let r, g, b;
    if (s === 0) { r = g = b = v; } else {
        h /= 60; const i = Math.floor(h); const f = h - i; const p = v * (1 - s); const q = v * (1 - s * f); const t = v * (1 - s * (1 - f));
        switch (i) {
            case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break; case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break; case 4: r = t; g = p; b = v; break; case 5: r = v; g = p; b = q; break;
        }
    }
    const to255 = (c) => Math.round(c * 255); return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
}

function updateVisualIndicators(currentValues) {
    const h = parseInt(currentValues.hue); const s = parseInt(currentValues.sat); const b = parseInt(currentValues.brightness); const isOn = onOffSwitch.checked;
    const opacity = isOn ? 1 : 0.3;
    const color = hsbToRgb(h, s, b);
    satIndicator.style.background = `linear-gradient(to right, rgb(128,128,128), ${hsbToRgb(h, 100, 100)})`;
    satIndicator.style.opacity = opacity; hueIndicator.style.background = color; hueIndicator.style.opacity = opacity;
    const colorLow = hsbToRgb(h, s, 10); const colorHigh = hsbToRgb(h, s, 100);
    brightnessIndicator.style.background = `linear-gradient(to right, ${colorLow}, ${colorHigh})`; brightnessIndicator.style.opacity = opacity;
    ctIndicator.style.opacity = opacity;
}

function getVisualStateFromSliders() {
    return {
        hue: parseInt(hueRange.value), sat: parseInt(satRange.value), brightness: parseInt(brightnessRange.value), ct: parseInt(ctRange.value)
    };
}
```

-----

## 5\. 📄 `Dockerfile` (Final und Stabil)

Wir verwenden den stabilsten Build-Ansatz ohne unnötige Discovery-Abhängigkeiten.

```dockerfile
# Dockerfile

FROM node:20-alpine

ENV NODE_ENV production
ENV PORT 8667

WORKDIR /app

COPY package*.json ./

# Installiere die Produktionsabhängigkeiten
# Wir brauchen kein mDNS mehr
RUN npm install --omit=dev

COPY . .

EXPOSE ${PORT}

CMD [ "npm", "start" ]
```

-----

## 6\. ℹ️ `README.md` (Version 1.0 Ready)

Hier ist die aktualisierte README.md, die die neue, stabile Architektur widerspiegelt.

````markdown
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

```
```