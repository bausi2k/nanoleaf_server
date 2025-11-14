// public/script.js

// Konstanten für Local Storage Keys
const NANOLEAF_TOKEN_KEY = 'nanoleaf_auth_token';
const NANOLEAF_HOST_KEY = 'nanoleaf_host';

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

// HOST & AUTH Elemente
const configSection = document.getElementById('configSection');
const hostInput = document.getElementById('hostInput');
const setHostButton = document.getElementById('setHostButton');
const discoverButton = document.getElementById('discoverButton'); // NEU
const currentHostDisplay = document.getElementById('currentHostDisplay');

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
    // Initialen Host und Token laden
    initializeConfig();

    refreshButton.addEventListener('click', getAndVisualizeState);

    // Steuerung Events
    ctRange.addEventListener('input', handleCtSliderInput);
    brightnessRange.addEventListener('input', handleBrightnessSliderInput);
    onOffSwitch.addEventListener('change', handleOnOffSwitchChange);
    hueRange.addEventListener('input', handleHueSliderInput);
    satRange.addEventListener('input', handleSatSliderInput);
    effectSelect.addEventListener('change', handleEffectSelectChange);
    
    // HOST & AUTH Events
    setHostButton.addEventListener('click', setHostConfiguration);
    discoverButton.addEventListener('click', discoverHost); // NEU
    generateTokenButton.addEventListener('click', generateToken);

    // Initialen Status und Effektliste beim Laden abrufen
    loadEffects();
    getAndVisualizeState();
});

// **********************************************
// ** HOST & TOKEN MANAGEMENT **
// **********************************************

/**
 * @function initializeConfig
 * @description Lädt Host und Token aus Local Storage und initialisiert die UI.
 */
function initializeConfig() {
    const storedHost = localStorage.getItem(NANOLEAF_HOST_KEY);
    const storedToken = localStorage.getItem(NANOLEAF_TOKEN_KEY);
    
    // Host-Eingabefeld initialisieren
    if (storedHost) {
        hostInput.value = storedHost;
        currentHostDisplay.textContent = storedHost;
    } else {
        hostInput.value = ''; 
    }
    
    // UI basierend auf Host und Token steuern
    if (storedHost && storedToken) {
        showControlUI(true);
    } else if (storedHost) {
        showAuthUI(true);
    } else {
        showAuthUI(false);
    }
}

/**
 * @function discoverHost
 * @description Startet mDNS Discovery über das Backend und speichert den Host.
 */
async function discoverHost() {
    discoverButton.disabled = true;
    currentHostDisplay.textContent = 'Suche läuft...';
    currentHostDisplay.style.color = 'orange';
    hostInput.value = '';
    
    try {
        // 1. API-Call an die Backend-Route für Discovery
        const response = await fetch('/api/discover-host');
        const result = await response.json();
        
        if (response.ok && result.success) {
            const host = result.host;
            
            // 2. Ergebnis in das Eingabefeld und Local Storage speichern
            hostInput.value = host;
            
            // 3. Speichern und UI aktualisieren (durch Aufruf der existierenden Funktion)
            setHostConfiguration(); 
            
            currentHostDisplay.style.color = 'green';
            currentHostDisplay.textContent = `${host} (gefunden!)`;
        } else {
            // 4. Fehlerbehandlung bei fehlgeschlagener Discovery
            const errorMessage = result.details || result.error || 'Gerät nicht gefunden (Timeout).';
            hostInput.value = '';
            currentHostDisplay.textContent = `❌ Suche fehlgeschlagen: ${errorMessage}`;
            currentHostDisplay.style.color = 'red';
        }
    } catch (error) {
        // 5. Kritische Netzwerkfehler
        hostInput.value = '';
        currentHostDisplay.textContent = `❌ Serverfehler: ${error.message}`;
        currentHostDisplay.style.color = 'red';
    } finally {
        discoverButton.disabled = false;
    }
}
/**
 * @function setHostConfiguration
 * @description Speichert den eingegebenen Host und prüft die Konnektivität.
 */
function setHostConfiguration() {
    const host = hostInput.value.trim();
    if (!host || !host.includes(':')) {
        currentHostDisplay.textContent = 'Ungültige IP:Port-Angabe!';
        currentHostDisplay.style.color = 'red';
        return;
    }
    
    // Host speichern
    localStorage.setItem(NANOLEAF_HOST_KEY, host);
    currentHostDisplay.textContent = host;
    currentHostDisplay.style.color = 'green';
    
    // Token entfernen, um Neuauthentifizierung zu erzwingen
    localStorage.removeItem(NANOLEAF_TOKEN_KEY); 
    
    // UI aktualisieren: Host ist jetzt da, Token fehlt
    showAuthUI(true);
    
    // Versuche, Status abzurufen, um zu prüfen (fängt Fehler 401/404 ab)
    getAndVisualizeState();
}

/**
 * @function showAuthUI
 * @description Steuert die Sichtbarkeit der Auth-Sektionen.
 */
function showAuthUI(isHostConfigured) {
    if (isHostConfigured) {
        authSection.classList.remove('hidden');
        authHr.classList.remove('hidden');
        controlContent.classList.add('hidden');
        configSection.style.border = '1px solid orange'; 
    } else {
        authSection.classList.add('hidden');
        authHr.classList.add('hidden');
        controlContent.classList.add('hidden');
        configSection.style.border = '1px solid red';
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
        configSection.style.border = '1px solid green';
    } else {
        showAuthUI(true); // Fallback: Host ist konfiguriert, aber Token fehlt/ist ungültig
    }
}


// **********************************************
// ** AUTH GENERIERUNG **
// **********************************************

async function generateToken() {
    const host = localStorage.getItem(NANOLEAF_HOST_KEY);
    if (!host) {
        generatedTokenMsg.textContent = '🚨 Bitte zuerst Host konfigurieren.';
        generatedTokenMsg.style.color = 'red';
        return;
    }
    
    generatedTokenMsg.textContent = 'Sende Anfrage... Gerät muss blinken.';
    generatedTokenDiv.style.display = 'none';
    generateTokenButton.disabled = true;

    try {
        const response = await fetch('/api/add-user', {
            method: 'POST',
            headers: { 'X-Nanoleaf-Host': host } // Sende Host an Backend
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
    if (response && response.status === 404) {
        // Gerät nicht gefunden oder falsche URL -> Host prüfen
        statusMessage.textContent = '🚨 Host/Gerät nicht gefunden (404). Bitte Host prüfen.';
        statusMessage.className = 'error';
        return true; 
    }
    // Konfigurationsfehler vom Backend (z.B. Host fehlt)
    if (errorMessage && errorMessage.includes('Host fehlt')) {
        statusMessage.textContent = '🚨 Konfigurationsfehler. Bitte Host konfigurieren.';
        statusMessage.className = 'error';
        showAuthUI(false);
        return true;
    }
    return false;
}

// Hilfsfunktion zum Senden von Daten an das Backend
async function sendDataToBackend(endpoint, data, successMsg) {
    const host = localStorage.getItem(NANOLEAF_HOST_KEY);
    const token = localStorage.getItem(NANOLEAF_TOKEN_KEY);
    
    if (!host || !token) {
        showControlUI(false);
        return false;
    }
    
    statusMessage.textContent = `Sende Anfrage an ${endpoint}...`;
    statusMessage.className = '';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Nanoleaf-Host': host // Sende Host
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
    const host = localStorage.getItem(NANOLEAF_HOST_KEY);
    const token = localStorage.getItem(NANOLEAF_TOKEN_KEY);
    
    // Wenn Host oder Token fehlen, zeige die Konfigurations-UI
    if (!host || !token) {
        showControlUI(false);
        return;
    }
    
    // Ladezustand anzeigen
    displayOnState.textContent = 'Lade...'; 
    displayEffectName.textContent = 'Lade...'; 
    statusMessage.textContent = ''; 

    try {
        const response = await fetch('/api/get-state', {
            headers: { 'X-Nanoleaf-Host': host } // Sende Host
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

// ... (Restliche Setter und Visualisierungsfunktionen bleiben unverändert) ...
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
    const host = localStorage.getItem(NANOLEAF_HOST_KEY);
    const token = localStorage.getItem(NANOLEAF_TOKEN_KEY);
    
    if (!host || !token) {
        effectSelect.innerHTML = '<option value="">-- Token/Host fehlt --</option>';
        return;
    }
    
    effectSelect.innerHTML = '<option value="">-- Lade Effekte... --</option>';

    try {
        const response = await fetch('/api/get-effects-list', { headers: { 'X-Nanoleaf-Host': host } });
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