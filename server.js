// server.js

const express = require('express');
// Importiere dotenv, um Umgebungsvariablen aus der .env zu laden (für Token bei Serverstart)
require('dotenv').config(); 
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');
const mdns = require('mdns-js');

const app = express();
const port = 8778;

// **********************************************
// ** SICHERE KONFIGURATION & DISCOVERY-VARS **
// **********************************************
// 1. Lade Token aus .env (wird nur beim Serverstart verwendet)
let NANOLEAF_TOKEN = process.env.NANOLEAF_TOKEN; 

// 2. Host/Port wird durch mDNS gesetzt
let DEVICE_HOST_PORT = null; 

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
// ** DISCOVERY FUNKTION **
// **********************************************

function discoverNanoleafDevice() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Starte mDNS Discovery für Nanoleaf-Gerät...');
        
        const browser = mdns.createBrowser(mdns.tcp('_nanoleafapi'));

        browser.on('ready', () => {
            browser.discover();
        });

        browser.on('update', (data) => {
            if (data.addresses.length > 0 && data.port) {
                const ipAddress = data.addresses[0];
                const port = data.port;
                browser.stop(); 
                resolve(`${ipAddress}:${port}`);
            }
        });

        setTimeout(() => {
            browser.stop();
            reject(new Error('Discovery Timeout: Nanoleaf-Gerät nicht über mDNS gefunden.'));
        }, 10000); 
    });
}


// **********************************************
// ** API HELFER & FUNKTIONEN **
// **********************************************

/**
 * @function getFullApiUrl
 * @description Gibt die vollständige URL mit dynamischem Token zurück.
 */
function getFullApiUrl(endpoint = '') {
    if (!NANOLEAF_TOKEN) {
        throw new Error('Konfigurationsfehler: NANOLEAF_TOKEN fehlt. Bitte generiere es über die UI.');
    }
    if (!DEVICE_HOST_PORT) {
        throw new Error('Discovery-Fehler: Geräteziel (IP:Port) noch nicht gefunden.');
    }
    return `http://${DEVICE_HOST_PORT}/api/v1/${NANOLEAF_TOKEN}${endpoint}`;
}


/**
 * @function getNewAuthTokenUrl
 * @description Gibt die URL für den Token-Generierungs-Call zurück (ohne Token).
 */
function getNewAuthTokenUrl() {
    if (!DEVICE_HOST_PORT) {
        throw new Error('Discovery-Fehler: Geräteziel (IP:Port) noch nicht gefunden.');
    }
    return `http://${DEVICE_HOST_PORT}/api/v1/new`;
}


/**
 * @function addNanoleafUser
 * @description Sendet POST-Request zur Generierung eines neuen Auth-Tokens.
 * Aktualisiert NANOLEAF_TOKEN im Backend-Speicher.
 */
async function addNanoleafUser() {
    const url = getNewAuthTokenUrl();
    
    console.log(`[AUTH POST] Sende Token-Request an URL: ${url}`);
    
    try {
        const response = await fetch(url, { method: 'POST' });

        console.log(`[AUTH POST Response] Status: ${response.status} ${response.statusText}`);

        if (response.status === 403) {
            throw new Error('403 Forbidden: Das Pairing-Fenster (30s) ist abgelaufen oder nicht offen.');
        }
        if (!response.ok) {
             const errorText = await response.text();
             console.error(`[AUTH POST ERROR] Detaillierter Response Body: ${errorText}`);
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        const newToken = data.auth_token;

        if (!newToken) {
            throw new Error('Antwort enthielt keinen auth_token.');
        }

        // 🟢 WICHTIG: Token im Arbeitsspeicher aktualisieren
        NANOLEAF_TOKEN = newToken;
        console.log("✅ Neuer Token im Backend gespeichert und einsatzbereit.");

        return newToken;

    } catch (error) {
        console.error('❌ KRITISCHER FEHLER beim Generieren des Tokens:', error.message);
        throw new Error(`Failed to generate new token: ${error.message}`);
    }
}


// --- RESTLICHE API FUNKTIONEN (unverändert) ---

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
    console.log('--- NEUE ANFRAGE ---');
    console.log('[Frontend POST] Empfangen für Auth-Token Generierung.');
    
    try {
        const newToken = await addNanoleafUser();
        res.status(200).json({ 
            success: true, 
            message: 'Neuer Token erfolgreich generiert.', 
            auth_token: newToken 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Fehler bei der Token-Generierung.', 
            details: error.message 
        });
    }
});


// --- RESTLICHE ROUTEN (Validation & Aufruf) ---

app.post('/api/set-ct', async (req, res) => {
    console.log('--- NEUE ANFRAGE ---');
    const { ct } = req.body; 
    const ctValue = parseInt(ct);
    if (isNaN(ctValue) || ctValue < CT_MIN || ctValue > CT_MAX) {
        return res.status(400).json({ error: `Ungültiger CT-Wert. Erlaubt: ${CT_MIN}-${CT_MAX}.` });
    }
    try {
        const apiResponse = await setColourTemperature(ctValue);
        res.status(200).json({ success: true, ct: ctValue, apiStatus: apiResponse.status });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Backend-Fehler beim CT-Aufruf.', details: error.message });
    }
});

app.post('/api/set-brightness', async (req, res) => {
    console.log('--- NEUE ANFRAGE ---');
    const { brightness } = req.body; 
    const brightnessValue = parseInt(brightness);
    if (isNaN(brightnessValue) || brightnessValue < BRIGHTNESS_MIN || brightnessValue > BRIGHTNESS_MAX) {
        return res.status(400).json({ error: `Ungültiger Helligkeitswert. Erlaubt: ${BRIGHTNESS_MIN}-${BRIGHTNESS_MAX}.` });
    }
    try {
        const apiResponse = await setBrightness(brightnessValue);
        res.status(200).json({ success: true, brightness: brightnessValue, apiStatus: apiResponse.status });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Backend-Fehler beim Helligkeits-Aufruf.', details: error.message });
    }
});

app.post('/api/set-on-state', async (req, res) => {
    console.log('--- NEUE ANFRAGE ---');
    const { onState } = req.body; 
    if (typeof onState !== 'boolean') {
        return res.status(400).json({ error: 'Ungültiger On/Off-Wert. Erwartet wird true oder false.' });
    }
    try {
        const apiResponse = await setOnState(onState);
        res.status(200).json({ success: true, onState: onState, apiStatus: apiResponse.status });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Backend-Fehler beim On/Off-Aufruf.', details: error.message });
    }
});

app.post('/api/set-hue', async (req, res) => {
    console.log('--- NEUE ANFRAGE ---');
    const { hue } = req.body; 
    const hueValue = parseInt(hue);
    if (isNaN(hueValue) || hueValue < HUE_MIN || hueValue > HUE_MAX) {
        return res.status(400).json({ error: `Ungültiger Hue-Wert. Erlaubt: ${HUE_MIN}-${HUE_MAX}.` });
    }
    try {
        const apiResponse = await setHue(hueValue);
        res.status(200).json({ success: true, hue: hueValue, apiStatus: apiResponse.status });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Backend-Fehler beim Hue-Aufruf.', details: error.message });
    }
});

app.post('/api/set-sat', async (req, res) => {
    console.log('--- NEUE ANFRAGE ---');
    const { sat } = req.body; 
    const satValue = parseInt(sat);
    if (isNaN(satValue) || satValue < SAT_MIN || satValue > SAT_MAX) {
        return res.status(400).json({ error: `Ungültiger Saturation-Wert. Erlaubt: ${SAT_MIN}-${SAT_MAX}.` });
    }
    try {
        const apiResponse = await setSaturation(satValue);
        res.status(200).json({ success: true, sat: satValue, apiStatus: apiResponse.status });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Backend-Fehler beim Saturation-Aufruf.', details: error.message });
    }
});

app.get('/api/get-effects-list', async (req, res) => {
    console.log('--- NEUE ANFRAGE ---');
    try {
        const effectsList = await getEffectsList();
        res.status(200).json(effectsList);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Backend-Fehler beim Abruf der Effektliste.', details: error.message });
    }
});

app.post('/api/select-effect', async (req, res) => {
    console.log('--- NEUE ANFRAGE ---');
    const { effectName } = req.body; 
    if (typeof effectName !== 'string' || effectName.trim().length === 0) {
        return res.status(400).json({ error: 'Ungültiger Effektname.' });
    }
    try {
        const apiResponse = await selectEffect(effectName);
        res.status(200).json({ success: true, effectName: effectName, apiStatus: apiResponse.status });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Backend-Fehler beim Effekt-Aufruf.', details: error.message });
    }
});

app.get('/api/get-state', async (req, res) => {
    console.log('--- NEUE ANFRAGE ---');
    try {
        const stateData = await getDeviceState();
        res.status(200).json(stateData);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Backend-Fehler beim Abruf des Gerätestatus.', details: error.message });
    }
});


// **********************************************
// ** SERVER START: Discovery und Start **
// **********************************************

async function startServer() {
    if (NANOLEAF_TOKEN) {
        console.log("ℹ️ Info: Token aus der .env-Datei geladen.");
    } else {
        console.warn("⚠️ WARNUNG: Token fehlt. Bitte über die UI generieren.");
    }
    
    try {
        // 1. Starte Discovery
        DEVICE_HOST_PORT = await discoverNanoleafDevice();
        console.log(`✅ Discovery erfolgreich: Nanoleaf-Gerät gefunden unter: ${DEVICE_HOST_PORT}`);

        // 2. Starte Express Server, nachdem die IP bekannt ist
        app.listen(port, () => {
            console.log(`✅ Server läuft auf http://localhost:${port}`);
            console.log(`Verbindet zu Nanoleaf-Gerät: http://${DEVICE_HOST_PORT}`);
            console.log('---');
        });
    } catch (err) {
        console.error(`❌ Server konnte nicht gestartet werden: ${err.message}`);
        console.warn('Bitte überprüfe die Verfügbarkeit des Nanoleaf-Geräts.');
    }
}

// Starte den Prozess
startServer();