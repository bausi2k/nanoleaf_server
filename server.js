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