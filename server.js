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
// Token und Host MÜSSEN in .env gesetzt sein
const NANOLEAF_TOKEN = process.env.NANOLEAF_TOKEN; 
const DEVICE_HOST_PORT = process.env.NANOLEAF_HOST_PORT; 

// Prüfen der Konfiguration beim Start
if (!NANOLEAF_TOKEN || !DEVICE_HOST_PORT) {
    console.error("❌ KRITISCHER FEHLER: NANOLEAF_TOKEN oder NANOLEAF_HOST_PORT fehlt in .env!");
    console.error("❌ Bitte die Datei .env im Hauptverzeichnis prüfen und den Server neu starten.");
    process.exit(1);
}

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
// ** API HELFER & FUNKTIONEN (AGRESSIVES LOGGING) **
// **********************************************

function getFullApiUrl(endpoint = '') {
    return `http://${DEVICE_HOST_PORT}/api/v1/${NANOLEAF_TOKEN}${endpoint}`;
}


// --- RESTLICHE API FUNKTIONEN (Nutzen getFullApiUrl) ---

async function handleApiCall(url, method, requestBody = null) {
    console.log(`\n--- API CALL START ---`);
    console.log(`[REQUEST] URL: ${url}`);
    console.log(`[REQUEST] Methode: ${method}`);
    if (requestBody) {
        console.log(`[REQUEST] Body: ${JSON.stringify(requestBody)}`);
    }

    try {
        const fetchOptions = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (requestBody) {
            fetchOptions.body = JSON.stringify(requestBody);
        }

        const response = await fetch(url, fetchOptions);
        
        console.log(`[RESPONSE] Status: ${response.status} ${response.statusText}`);

        // Nanoleaf gibt oft 204 No Content zurück, aber bei Fehlern gibt es einen Body.
        if (!response.ok && response.status !== 204) {
             const errorText = await response.text();
             console.error(`[RESPONSE ERROR] Detaillierter Body: ${errorText}`);
             // Wir werfen einen Fehler, der den Statuscode und den Body enthält
             throw new Error(`API Error ${response.status} (${response.statusText}): ${errorText}`);
        }

        // Bei GET-Anfragen oder wenn ein Body erwartet wird
        if (response.status !== 204 && response.headers.get('content-type')?.includes('application/json')) {
            const data = await response.json();
            console.log(`[RESPONSE SUCCESS] Daten (Ausschnitt): ${JSON.stringify(data).substring(0, 80)}...`);
            return data;
        }

        return { status: response.status, message: 'Call successful.' };

    } catch (error) {
        console.error(`❌ KRITISCHER FEHLER (Netzwerk/Fetch): ${error.message}`);
        throw error;
    } finally {
        console.log(`--- API CALL END ---`);
    }
}


async function setColourTemperature(ctValue) {
    const url = getFullApiUrl('/state');
    const requestBody = { "ct": { "value": ctValue } };
    await handleApiCall(url, 'PUT', requestBody);
    return { status: 204, message: 'Colour temperature updated successfully.' };
}

async function setBrightness(brightnessValue) {
    const url = getFullApiUrl('/state');
    const requestBody = { "brightness": { "value": brightnessValue } };
    await handleApiCall(url, 'PUT', requestBody);
    return { status: 204, message: 'Brightness updated successfully.' };
}


async function setOnState(onState) {
    const url = getFullApiUrl('/state');
    const requestBody = { "on": { "value": onState } };
    await handleApiCall(url, 'PUT', requestBody);
    return { status: 204, message: `On state set to ${onState}.` };
}


async function setHue(hueValue) {
    const url = getFullApiUrl('/state');
    const requestBody = { "hue": { "value": hueValue } };
    await handleApiCall(url, 'PUT', requestBody);
    return { status: 204, message: `Hue set to ${hueValue}.` };
}

async function setSaturation(satValue) {
    const url = getFullApiUrl('/state');
    const requestBody = { "sat": { "value": satValue } };
    await handleApiCall(url, 'PUT', requestBody);
    return { status: 204, message: `Saturation set to ${satValue}.` };
}

async function getEffectsList() {
    const url = getFullApiUrl('/effects/effectsList'); 
    return handleApiCall(url, 'GET');
}

async function selectEffect(effectName) {
    const url = getFullApiUrl('/effects');
    const requestBody = { "select": effectName }; 
    await handleApiCall(url, 'PUT', requestBody);
    return { status: 204, message: `Effect ${effectName} activated.` };
}

async function getDeviceState() {
    const url = getFullApiUrl('/'); 
    return handleApiCall(url, 'GET');
}


// **********************************************
// ** ROUTEN **
// **********************************************

// --- RESTLICHE ROUTEN (Nutzen die vereinfachten API-Funktionen) ---

app.post('/api/set-ct', async (req, res) => {
    const { ct } = req.body; 
    const ctValue = parseInt(ct);
    if (isNaN(ctValue) || ctValue < CT_MIN || ctValue > CT_MAX) { return res.status(400).json({ success: false, error: `Ungültiger CT-Wert. Erlaubt: ${CT_MIN}-${CT_MAX}.` }); }
    try {
        const apiResponse = await setColourTemperature(ctValue);
        res.status(200).json({ success: true, ct: ctValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim CT-Aufruf.', details: error.message }); }
});

app.post('/api/set-brightness', async (req, res) => {
    const { brightness } = req.body; 
    const brightnessValue = parseInt(brightness);
    if (isNaN(brightnessValue) || brightnessValue < BRIGHTNESS_MIN || brightnessValue > BRIGHTNESS_MAX) { return res.status(400).json({ success: false, error: `Ungültiger Helligkeitswert. Erlaubt: ${BRIGHTNESS_MIN}-${BRIGHTNESS_MAX}.` }); }
    try {
        const apiResponse = await setBrightness(brightnessValue);
        res.status(200).json({ success: true, brightness: brightnessValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Helligkeits-Aufruf.', details: error.message }); }
});

app.post('/api/set-on-state', async (req, res) => {
    const { onState } = req.body; 
    if (typeof onState !== 'boolean') { return res.status(400).json({ success: false, error: 'Ungültiger On/Off-Wert. Erwartet wird true oder false.' }); }
    try {
        const apiResponse = await setOnState(onState);
        res.status(200).json({ success: true, onState: onState, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim On/Off-Aufruf.', details: error.message }); }
});

app.post('/api/set-hue', async (req, res) => {
    const { hue } = req.body; 
    const hueValue = parseInt(hue);
    if (isNaN(hueValue) || hueValue < HUE_MIN || hueValue > HUE_MAX) { return res.status(400).json({ success: false, error: `Ungültiger Hue-Wert. Erlaubt: ${HUE_MIN}-${HUE_MAX}.` }); }
    try {
        const apiResponse = await setHue(hueValue);
        res.status(200).json({ success: true, hue: hueValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Hue-Aufruf.', details: error.message }); }
});

app.post('/api/set-sat', async (req, res) => {
    const { sat } = req.body; 
    const satValue = parseInt(sat);
    if (isNaN(satValue) || satValue < SAT_MIN || satValue > SAT_MAX) { return res.status(400).json({ success: false, error: `Ungültiger Saturation-Wert. Erlaubt: ${SAT_MIN}-${SAT_MAX}.` }); }
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
    if (typeof effectName !== 'string' || effectName.trim().length === 0) { return res.status(400).json({ success: false, error: 'Ungültiger Effektname.' }); }
    try {
        const apiResponse = await selectEffect(effectName);
        res.status(200).json({ success: true, effectName: effectName, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Effekt-Aufruf.', details: error.message }); }
});

app.get('/api/get-state', async (req, res) => {
    try {
        const stateData = await getDeviceState();
        // HINWEIS: Bei GET-Anfragen geben wir die Daten direkt zurück
        res.status(200).json(stateData);
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Abruf des Gerätezustands.', details: error.message }); }
});


// **********************************************
// ** SERVER START **
// **********************************************

app.listen(port, () => {
    console.log(`✅ Server läuft auf http://localhost:${port}`);
    console.log(`Verbindet zu Nanoleaf-Gerät: http://${DEVICE_HOST_PORT}`);
    console.log('---');
});