// public/script.js

// Konstanten für die HTML-Elemente
const ctRange = document.getElementById('ctRange');
const ctValueDisplay = document.getElementById('ctValue');
const statusMessage = document.getElementById('statusMessage');

// Initialwert setzen und Event Listener hinzufügen
document.addEventListener('DOMContentLoaded', () => {
    // Anzeige des CT-Werts aktualisieren, wenn der Slider bewegt wird
    ctRange.addEventListener('input', () => {
        ctValueDisplay.textContent = `${ctRange.value} K`;
    });
});

/**
 * @function setColourTemperature
 * @description Sendet den gewählten CT-Wert an den Node.js Backend-Endpunkt.
 */
async function setColourTemperature() {
    const ctValue = parseInt(ctRange.value);
    
    // Statusmeldung zurücksetzen
    statusMessage.textContent = 'Sende Anfrage...';
    statusMessage.className = '';

    try {
        // Fetch-Aufruf an unseren eigenen Backend-Server
        const response = await fetch('/api/set-ct', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ct: ctValue })
        });
        
        // Response in JSON parsen
        const result = await response.json();

        if (response.ok) {
            // Erfolg (HTTP Status 200 vom Backend)
            statusMessage.textContent = `✅ Farbtemperatur erfolgreich auf ${result.ct} K gesetzt. (API Status: ${result.apiStatus})`;
            statusMessage.className = 'success';
        } else {
            // Fehler vom Backend (z.B. 400 oder 500)
            statusMessage.textContent = `❌ Fehler: ${result.error || result.details}`;
            statusMessage.className = 'error';
        }

    } catch (error) {
        // Fehler bei der Verbindung zum Node-Server
        statusMessage.textContent = `🚨 Kommunikationsfehler zum Server: ${error.message}`;
        statusMessage.className = 'error';
    }
}