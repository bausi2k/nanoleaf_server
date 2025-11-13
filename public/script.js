// public/script.js

// Konstante für Local Storage Key
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

// NEU: AUTH & Control Elemente
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
    // Initialen Token laden (falls vorhanden) und Backend informieren
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
// ** AUTH & PERSISTENCE FUNKTIONEN (NEU) **
// **********************************************

/**
 * @function setTokenInLocalStorage
 * @description Speichert den Token im Browser Local Storage.
 */
function setTokenInLocalStorage(token) {
    localStorage.setItem(NANOLEAF_TOKEN_KEY, token);
}

/**
 * @function checkAndSetupToken
 * @description Versucht, den Token aus Local Storage zu laden und sendet ihn ans Backend.
 */
function checkAndSetupToken() {
    const token = localStorage.getItem(NANOLEAF_TOKEN_KEY);
    
    if (token) {
        // Token gefunden: UI für Steuerung anzeigen
        showControlUI(true);
        // Sende Token an Backend (dies ist eine neue Route, die wir im Backend NICHT gebaut haben,
        // da das Backend den Token des Clients nicht braucht. Wir überspringen diesen Schritt,
        // da das Backend nur den Token aus .env beim Start nutzt oder einen neuen generiert.
        // Wenn der Backend-Server neu startet, muss der Token aus der .env stammen, oder neu generiert werden.
        // Da das Backend den Token des Clients NICHT speichert (Sicherheitsrisiko), ist das primäre Ziel des Frontends,
        // bei einem 401/Fehler den Auth-Screen zu zeigen, falls der Token aus Local Storage abgelaufen ist.
    } else {
        // Kein Token gefunden: Auth UI anzeigen
        showControlUI(false);
    }
}

/**
 * @function showControlUI
 * @description Steuert die Sichtbarkeit der Auth- und Control-Sektionen.
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
        // Schickt Request an Backend, welches den Request an Nanoleaf sendet
        const response = await fetch('/api/add-user', {
            method: 'POST'
        });
        
        const result = await response.json();

        if (response.ok) {
            const newToken = result.auth_token;
            
            // 1. Token im Local Storage speichern (Persistenz)
            setTokenInLocalStorage(newToken);

            // 2. UI Status aktualisieren
            generatedTokenMsg.textContent = '✅ Token erfolgreich generiert und gespeichert!';
            generatedTokenMsg.style.color = 'green';
            generatedTokenDiv.textContent = `Neuer Token: ${newToken}`;
            generatedTokenDiv.style.display = 'block';
            
            // 3. Auf Steuerung umschalten
            showControlUI(true);

            // 4. Daten neu laden (Effektliste, Status)
            loadEffects();
            getAndVisualizeState();
            
        } else {
            generatedTokenMsg.textContent = `❌ Fehler: ${result.details || result.error || 'Unbekannter Fehler'}. Ist das Pairing-Fenster offen?`;
            generatedTokenMsg.style.color = 'red';
            showControlUI(false); // Zeige Auth, falls Fehler
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

// Alle API-Call-Funktionen (setCT, setBrightness, etc.) müssen bei einem 401/Fehler
// auf die Auth-Seite umschalten. Wir fügen eine zentrale Fehlerbehandlung hinzu.

async function handleApiError(response, errorMessage) {
    if (response && response.status === 401) {
        // Token ist ungültig oder abgelaufen -> Token im LS löschen und Auth UI zeigen
        localStorage.removeItem(NANOLEAF_TOKEN_KEY);
        showControlUI(false);
        statusMessage.textContent = '🚨 Token ungültig (401). Bitte neuen Token generieren.';
        statusMessage.className = 'error';
        return true; 
    }
    return false;
}

// Hilfsfunktion zum Senden von Daten an das Backend
async function sendDataToBackend(endpoint, data, successMsg) {
    statusMessage.textContent = `Sende Anfrage an ${endpoint}...`;
    statusMessage.className = '';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();

        if (await handleApiError(response, result)) {
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
        statusMessage.textContent = `🚨 Kommunikationsfehler zum Server: ${error.message}`;
        statusMessage.className = 'error';
        return false;
    }
}


// **********************************************
// ** GET AND VISUALIZE STATE **
// **********************************************

async function getAndVisualizeState() {
    // Wenn Control UI ausgeblendet ist, nicht versuchen, Status zu laden
    if (controlContent.classList.contains('hidden')) {
        return;
    }
    
    // Ladezustand anzeigen
    displayOnState.textContent = 'Lade...'; 
    displayEffectName.textContent = 'Lade...'; 
    // ... (restliche Ladeanzeigen)

    try {
        const response = await fetch('/api/get-state');
        const data = await response.json();
        
        if (await handleApiError(response, data)) {
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
        // ... (Synchronisierung der Slider/Anzeigen)
        displayBrightness.textContent = currentValues.brightness;
        brightnessRange.value = currentValues.brightness;
        brightnessValueDisplay.textContent = `${currentValues.brightness} %`;
        
        displayCTValue.textContent = currentValues.ct;
        ctRange.value = Math.round(currentValues.ct / 100) * 100;
        ctValueDisplay.textContent = `${ctRange.value} K`;

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
        if (error.message.includes('API-Token fehlt')) {
            showControlUI(false); // Zeige Auth UI
        }
    }
}

// ... (Restliche Funktionen zur Steuerung verwenden jetzt sendDataToBackend) ...

// **********************************************
// ** SLIDER & SELECT HANDLER **
// **********************************************

// Debounce Logik (unverändert)

function debounce(func, delay) {
    let timeoutId;
    return function(value) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(value);
        }, delay);
    };
}

const debouncedSetCt = debounce(setColourTemperature, DEBOUNCE_DELAY_MS);
const debouncedSetBrightness = debounce(setBrightness, DEBOUNCE_DELAY_MS);
const debouncedSetHue = debounce(setHue, DEBOUNCE_DELAY_MS);
const debouncedSetSat = debounce(setSaturation, DEBOUNCE_DELAY_MS);


// Event Handler verwenden debounced Funktionen (unverändert)
function handleCtSliderInput() {
    const ctValue = ctRange.value;
    ctValueDisplay.textContent = `${ctValue} K`;
    debouncedSetCt(ctValue);
    updateVisualIndicators(getVisualStateFromSliders());
}

function handleBrightnessSliderInput() {
    const brightnessValue = brightnessRange.value;
    brightnessValueDisplay.textContent = `${brightnessValue} %`;
    debouncedSetBrightness(brightnessValue);
    updateVisualIndicators(getVisualStateFromSliders());
}

function handleHueSliderInput() {
    const hueValue = hueRange.value;
    hueValueDisplay.textContent = `${hueValue} °`;
    debouncedSetHue(hueValue);
    updateVisualIndicators(getVisualStateFromSliders());
}

function handleSatSliderInput() {
    const satValue = satRange.value;
    satValueDisplay.textContent = `${satValue} %`;
    debouncedSetSat(satValue);
    updateVisualIndicators(getVisualStateFromSliders());
}

function handleOnOffSwitchChange() {
    const isOn = onOffSwitch.checked;
    setOnState(isOn);
}

function handleEffectSelectChange() {
    const effectName = effectSelect.value;
    if (effectName) {
        selectEffect(effectName);
    }
}


// **********************************************
// ** API SETTER (VERWENDEN sendDataToBackend) **
// **********************************************

async function setColourTemperature(ctValue) {
    const success = await sendDataToBackend('/api/set-ct', { ct: ctValue }, `CT erfolgreich auf ${ctValue} K gesetzt.`);
    if (success) {
        updateVisualIndicators(getVisualStateFromSliders());
    }
}

async function setBrightness(brightnessValue) {
    const success = await sendDataToBackend('/api/set-brightness', { brightness: brightnessValue }, `Helligkeit erfolgreich auf ${brightnessValue} % gesetzt.`);
    if (success) {
        updateVisualIndicators(getVisualStateFromSliders());
    }
}

async function setOnState(onState) {
    const success = await sendDataToBackend('/api/set-on-state', { onState: onState }, `Gerät erfolgreich ${onState ? 'EINGESCHALTET' : 'AUSGESCHALTET'}.`);
    if (success) {
        getAndVisualizeState(); 
    }
}

async function setHue(hueValue) {
    const success = await sendDataToBackend('/api/set-hue', { hue: hueValue }, `Hue erfolgreich auf ${hueValue} ° gesetzt.`);
    if (success) {
        updateVisualIndicators(getVisualStateFromSliders());
    }
}

async function setSaturation(satValue) {
    const success = await sendDataToBackend('/api/set-sat', { sat: satValue }, `Saturation erfolgreich auf ${satValue} % gesetzt.`);
    if (success) {
        updateVisualIndicators(getVisualStateFromSliders());
    }
}

async function selectEffect(effectName) {
    const success = await sendDataToBackend('/api/select-effect', { effectName: effectName }, `Effekt "${effectName}" erfolgreich aktiviert.`);
    if (success) {
        getAndVisualizeState(); 
    }
}

async function loadEffects() {
    // Wenn Control UI ausgeblendet ist, nicht versuchen, Effekte zu laden
    if (controlContent.classList.contains('hidden')) {
        effectSelect.innerHTML = '<option value="">-- Token benötigt --</option>';
        return;
    }
    
    effectSelect.innerHTML = '<option value="">-- Lade Effekte... --</option>';

    try {
        const response = await fetch('/api/get-effects-list');
        const effectsList = await response.json();
        
        if (await handleApiError(response, effectsList)) {
            return;
        }

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

// ... (Restliche Visualisierungsfunktionen wie hsbToRgb, updateVisualIndicators, etc. bleiben unverändert)
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