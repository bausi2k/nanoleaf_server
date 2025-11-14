// server.js

const express = require('express');
require('dotenv').config(); 
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');
const mdns = require('mdns-js'); // ⬅️ mDNS-Paket reaktiviert!

const app = express();
const port = 8667; 

// **********************************************
// ** SICHERE KONFIGURATION & DYNAMISCHE HOST-VAR **
// **********************************************
let NANOLEAF_TOKEN = process.env.NANOLEAF_TOKEN; 

const NANOLEAF_DEFAULT_PORT = 16021; 

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

// Middleware zum Hinzufügen von Host und Token
app.use((req, res, next) => {
    req.nanoleafHost = req.headers['x-nanoleaf-host'];
    req.nanoleafToken = NANOLEAF_TOKEN;
    next();
});

// **********************************************
// ** DISCOVERY FUNKTION (REAKTIVIERT) **
// **********************************************

function discoverNanoleafDevice() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Starte mDNS Discovery für Nanoleaf-Gerät...');
        
        const browser = mdns.createBrowser(mdns.tcp('_nanoleafapi'));

        browser.on('ready', () => {
            browser.discover();
        });

        browser.on('update', (data) => {
            if (data.addresses.length > 0) {
                const ipAddress = data.addresses[0];
                const finalPort = data.port || NANOLEAF_DEFAULT_PORT;
                
                browser.stop(); 
                resolve(`${ipAddress}:${finalPort}`);
            }
        });

        setTimeout(() => {
            browser.stop();
            reject(new Error('Discovery Timeout (10s): Gerät nicht gefunden.'));
        }, 10000); 
    });
}


// **********************************************
// ** API HELFER & FUNKTIONEN (unverändert) **
// **********************************************

function getFullApiUrl(req, endpoint = '') {
    if (!req.nanoleafToken) {
        throw new Error('Konfigurationsfehler: NANOLEAF_TOKEN fehlt.');
    }
    if (!req.nanoleafHost) {
        throw new Error('Discovery-Fehler: Nanoleaf Host (IP:Port) fehlt.');
    }
    return `http://${req.nanoleafHost}/api/v1/${req.nanoleafToken}${endpoint}`;
}


function getNewAuthTokenUrl(req) {
    if (!req.nanoleafHost) {
        throw new Error('Discovery-Fehler: Nanoleaf Host (IP:Port) fehlt.');
    }
    return `http://${req.nanoleafHost}/api/v1/new`;
}


// ... (Alle API Funktionen wie addNanoleafUser, setColourTemperature, etc. bleiben unverändert) ...

async function addNanoleafUser(req) {
    const url = getNewAuthTokenUrl(req);
    try {
        const response = await fetch(url, { method: 'POST' });
        if (response.status === 403) { throw new Error('403 Forbidden: Das Pairing-Fenster (30s) ist abgelaufen oder nicht offen.'); }
        if (!response.ok) { const errorText = await response.text(); throw new Error(`API Error ${response.status}: ${errorText}`); }
        const data = await response.json();
        const newToken = data.auth_token;
        if (!newToken) { throw new Error('Antwort enthielt keinen auth_token.'); }
        NANOLEAF_TOKEN = newToken; 
        return newToken;
    } catch (error) { throw new Error(`Failed to generate new token: ${error.message}`); }
}


async function setColourTemperature(req, ctValue) {
    const url = getFullApiUrl(req, '/state'); const requestBody = { "ct": { "value": ctValue } };
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) { const errorText = await response.text(); throw new Error(`API Error ${response.status}: ${errorText}`); }
        return { status: response.status, message: 'Colour temperature updated successfully.' };
    } catch (error) { throw new Error(`Failed to update colour temperature: ${error.message}`); }
}

async function setBrightness(req, brightnessValue) {
    const url = getFullApiUrl(req, '/state'); const requestBody = { "brightness": { "value": brightnessValue } };
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) { const errorText = await response.text(); throw new Error(`API Error ${response.status}: ${errorText}`); }
        return { status: response.status, message: 'Brightness updated successfully.' };
    } catch (error) { throw new Error(`Failed to update brightness: ${error.message}`); }
}


async function setOnState(req, onState) {
    const url = getFullApiUrl(req, '/state'); const requestBody = { "on": { "value": onState } };
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) { const errorText = await response.text(); throw new Error(`API Error ${response.status}: ${errorText}`); }
        return { status: response.status, message: `On state set to ${onState}.` };
    } catch (error) { throw new Error(`Failed to update on state: ${error.message}`); }
}


async function setHue(req, hueValue) {
    const url = getFullApiUrl(req, '/state'); const requestBody = { "hue": { "value": hueValue } };
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) { const errorText = await response.text(); throw new Error(`API Error ${response.status}: ${errorText}`); }
        return { status: response.status, message: `Hue set to ${hueValue}.` };
    } catch (error) { throw new Error(`Failed to update Hue: ${error.message}`); }
}

async function setSaturation(req, satValue) {
    const url = getFullApiUrl(req, '/state'); const requestBody = { "sat": { "value": satValue } };
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) { const errorText = await response.text(); throw new Error(`API Error ${response.status}: ${errorText}`); }
        return { status: response.status, message: `Saturation set to ${satValue}.` };
    } catch (error) { throw new Error(`Failed to update Saturation: ${error.message}`); }
}

async function getEffectsList(req) {
    const url = getFullApiUrl(req, '/effects/effectsList'); 
    try {
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) { const errorText = await response.text(); throw new Error(`API Error ${response.status}: ${errorText}`); }
        const data = await response.json(); 
        return data;
    } catch (error) { throw new Error(`Failed to retrieve effects list: ${error.message}`); }
}

async function selectEffect(req, effectName) {
    const url = getFullApiUrl(req, '/effects'); const requestBody = { "select": effectName }; 
    try {
        const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok && response.status !== 204) { const errorText = await response.text(); throw new Error(`API Error ${response.status}: ${errorText}`); }
        return { status: response.status, message: `Effect ${effectName} activated.` };
    } catch (error) { throw new Error(`Failed to select effect: ${error.message}`); }
}

async function getDeviceState(req) {
    const url = getFullApiUrl(req, '/'); 
    try {
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) { const errorText = await response.text(); throw new Error(`API Error ${response.status}: ${errorText}`); }
        const data = await response.json();
        return data;
    } catch (error) { throw new Error(`Failed to retrieve device state: ${error.message}`); }
}


// **********************************************
// ** ROUTEN **
// **********************************************

// NEUE DISCOVERY ROUTE: Führt mDNS aus und gibt Host zurück
app.get('/api/discover-host', async (req, res) => {
    console.log('--- NEUE DISCOVERY ANFRAGE ---');
    try {
        const hostPort = await discoverNanoleafDevice();
        res.status(200).json({ success: true, host: hostPort });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Discovery fehlgeschlagen.', details: error.message });
    }
});


// Route zur Auth-Token Generierung
app.post('/api/add-user', async (req, res) => {
    try {
        const newToken = await addNanoleafUser(req);
        res.status(200).json({ success: true, auth_token: newToken });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Fehler bei der Token-Generierung.', details: error.message });
    }
});


// --- RESTLICHE ROUTEN (Validation & Aufruf mit req) ---

app.post('/api/set-ct', async (req, res) => {
    const { ct } = req.body; 
    const ctValue = parseInt(ct);
    if (isNaN(ctValue) || ctValue < CT_MIN || ctValue > CT_MAX) { return res.status(400).json({ error: `Ungültiger CT-Wert. Erlaubt: ${CT_MIN}-${CT_MAX}.` }); }
    try {
        const apiResponse = await setColourTemperature(req, ctValue);
        res.status(200).json({ success: true, ct: ctValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim CT-Aufruf.', details: error.message }); }
});

app.post('/api/set-brightness', async (req, res) => {
    const { brightness } = req.body; 
    const brightnessValue = parseInt(brightness);
    if (isNaN(brightnessValue) || brightnessValue < BRIGHTNESS_MIN || brightnessValue > BRIGHTNESS_MAX) { return res.status(400).json({ error: `Ungültiger Helligkeitswert. Erlaubt: ${BRIGHTNESS_MIN}-${BRIGHTNESS_MAX}.` }); }
    try {
        const apiResponse = await setBrightness(req, brightnessValue);
        res.status(200).json({ success: true, brightness: brightnessValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Helligkeits-Aufruf.', details: error.message }); }
});

app.post('/api/set-on-state', async (req, res) => {
    const { onState } = req.body; 
    if (typeof onState !== 'boolean') { return res.status(400).json({ error: 'Ungültiger On/Off-Wert. Erwartet wird true oder false.' }); }
    try {
        const apiResponse = await setOnState(req, onState);
        res.status(200).json({ success: true, onState: onState, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim On/Off-Aufruf.', details: error.message }); }
});

app.post('/api/set-hue', async (req, res) => {
    const { hue } = req.body; 
    const hueValue = parseInt(hue);
    if (isNaN(hueValue) || hueValue < HUE_MIN || hueValue > HUE_MAX) { return res.status(400).json({ error: `Ungültiger Hue-Wert. Erlaubt: ${HUE_MIN}-${HUE_MAX}.` }); }
    try {
        const apiResponse = await setHue(req, hueValue);
        res.status(200).json({ success: true, hue: hueValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Hue-Aufruf.', details: error.message }); }
});

app.post('/api/set-sat', async (req, res) => {
    const { sat } = req.body; 
    const satValue = parseInt(sat);
    if (isNaN(satValue) || satValue < SAT_MIN || satValue > SAT_MAX) { return res.status(400).json({ error: `Ungültiger Saturation-Wert. Erlaubt: ${SAT_MIN}-${SAT_MAX}.` }); }
    try {
        const apiResponse = await setSaturation(req, satValue);
        res.status(200).json({ success: true, sat: satValue, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Saturation-Aufruf.', details: error.message }); }
});

app.get('/api/get-effects-list', async (req, res) => {
    try {
        const effectsList = await getEffectsList(req);
        res.status(200).json(effectsList);
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Abruf der Effektliste.', details: error.message }); }
});

app.post('/api/select-effect', async (req, res) => {
    const { effectName } = req.body; 
    if (typeof effectName !== 'string' || effectName.trim().length === 0) { return res.status(400).json({ error: 'Ungültiger Effektname.' }); }
    try {
        const apiResponse = await selectEffect(req, effectName);
        res.status(200).json({ success: true, effectName: effectName, apiStatus: apiResponse.status });
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Effekt-Aufruf.', details: error.message }); }
});

app.get('/api/get-state', async (req, res) => {
    try {
        const stateData = await getDeviceState(req);
        res.status(200).json(stateData);
    } catch (error) { res.status(500).json({ success: false, error: 'Backend-Fehler beim Abruf des Gerätestatus.', details: error.message }); }
});


// **********************************************
// ** SERVER START **
// **********************************************

app.listen(port, () => {
    console.log(`✅ Server läuft auf http://localhost:${port}`);
    console.log('Nanoleaf Host wird dynamisch per Header übermittelt.');
});