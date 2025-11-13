// server.js

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const port = 3000;

// **********************************************
// ** KONFIGURATION (Bitte anpassen!) **
// **********************************************
const API_BASE_URL = 'http://192.168.1.28:16021/api/v1/e3wOXc0ZWl40n9rH9PYeHgAKWo32aMsB';
// Die Nanoleaf API verwendet 1700K bis 6500K für Essentials (je nach Gerät)
const CT_MIN = 1700;
const CT_MAX = 6500;
// **********************************************

// Middleware, um JSON-Bodies in POST-Anfragen zu parsen
app.use(express.json()); 
// Statische Dateien (Frontend HTML/JS) aus dem Ordner 'public' bereitstellen
app.use(express.static(path.join(__dirname, 'public'))); 

/**
 * @function setColourTemperature
 * @description Sendet den PUT-Request an die Nanoleaf-API, um die Farbtemperatur zu setzen.
 * @param {number} ctValue - Die gewünschte Farbtemperatur in Kelvin.
 * @returns {Promise<object>} - Die Antwort der API.
 */
async function setColourTemperature(ctValue) {
    // API-Endpunkt für die Farbtemperatur
    const url = `${API_BASE_URL}/state/ct`;
    
    // Request Body wie von dir spezifiziert
    const requestBody = {
        "on": {
            "value": ctValue
        }
    };

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        // Überprüfen, ob der Statuscode 2xx ist (Erfolg)
        if (!response.ok && response.status !== 204) {
             // Wenn der Server Fehler wie 400 oder 500 zurückgibt
             const errorText = await response.text();
             throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        
        // Die API gibt oft 204 No Content zurück (erfolgreich, kein Body)
        return { status: response.status, message: 'Colour temperature updated successfully.' };

    } catch (error) {
        console.error('Fehler beim Senden der Nanoleaf-Anfrage:', error.message);
        throw new Error(`Failed to update colour temperature: ${error.message}`);
    }
}


// **********************************************
// ** ROUTE FÜR DIE UI-ANFRAGE **
// **********************************************

// POST-Route, um die Farbtemperatur zu empfangen und an die API weiterzuleiten
app.post('/api/set-ct', async (req, res) => {
    // req.body ist der JSON-Body, der vom Frontend gesendet wird: { ct: 4000 }
    const { ct } = req.body; 

    // 1. Eingabe validieren (ist es eine Zahl und im gültigen Bereich?)
    const ctValue = parseInt(ct);
    if (isNaN(ctValue) || ctValue < CT_MIN || ctValue > CT_MAX) {
        return res.status(400).json({ error: `Ungültiger Wert. Bitte einen Wert zwischen ${CT_MIN} und ${CT_MAX} verwenden.` });
    }

    // 2. API-Aufruf ausführen
    try {
        const apiResponse = await setColourTemperature(ctValue);
        // Erfolgreiche Antwort an das Frontend senden
        res.status(200).json({ 
            success: true, 
            ct: ctValue, 
            apiStatus: apiResponse.status 
        });
    } catch (error) {
        // Fehlerantwort an das Frontend senden
        res.status(500).json({ 
            success: false, 
            error: 'Backend-Fehler beim API-Aufruf.', 
            details: error.message 
        });
    }
});


// Server starten
app.listen(port, () => {
  console.log(`✅ Server läuft auf http://localhost:${port}`);
  console.log(`Öffne http://localhost:${port} in deinem Browser, um die UI zu sehen.`);
});