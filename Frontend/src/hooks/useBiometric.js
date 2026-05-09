/**
 * useBiometric.js — WebAuthn-based biometric login hook
 *
 * Flow:
 *  Register: after a successful normal login, call registerBiometric() to
 *  create and store a credential tied to this device + account.
 *
 *  Login: call biometricLogin() to prompt the platform authenticator
 *  (fingerprint / Face ID), then send the assertion to the server to
 *  verify and issue session cookies.
 *
 * Storage:
 *  localStorage["kharcha_biometric_user"] = { credentialId, email, displayName }
 *  The actual private key never leaves the device — only the credential
 *  ID is stored; the server holds the public key.
 */

const RP_ID   = window.location.hostname;       // e.g. "localhost" or "kharcha.app"
const RP_NAME = "Kharcha";

const STORAGE_KEY    = "kharcha_biometric_user";
const TX_STORAGE_KEY = "kharcha_biometric_tx";  // separate enrollment for transactions

// ── Helpers ──────────────────────────────────────────────────

function base64urlToBuffer(base64url) {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const binary  = atob(base64);
    const bytes   = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

function bufferToBase64url(buffer) {
    const bytes  = new Uint8Array(buffer);
    let binary   = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function randomChallenge() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return arr;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Returns true if the browser/device can use a platform authenticator
 * (fingerprint, Face ID, Windows Hello, etc.).
 */
export async function isBiometricAvailable() {
    if (!window.PublicKeyCredential) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

/**
 * Returns the saved biometric user for this device, or null.
 */
export function getSavedBiometricUser() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * Clears saved biometric data (e.g. on logout or credential removal).
 */
export function clearSavedBiometricUser() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Register a biometric credential for the currently logged-in user.
 * Call this right after a successful normal login when the user opts in,
 * or always silently after login to set it up automatically.
 *
 * @param {object} user  - { account_id, email, display_name }
 * @param {Function} apiRegister - async fn that calls POST /auth/biometric/register
 */
export async function registerBiometric(user, apiRegister) {
    // 1. Ask server for a registration challenge
    const { challenge: challengeB64, userId: userIdB64 } =
        await apiRegister({ action: "challenge", email: user.email });

    const challenge = base64urlToBuffer(challengeB64);
    const userId    = base64urlToBuffer(userIdB64);

    // 2. Create credential on device
    const credential = await navigator.credentials.create({
        publicKey: {
            rp: { id: RP_ID, name: RP_NAME },
            user: {
                id:          userId,
                name:        user.email,
                displayName: user.display_name || user.email,
            },
            challenge,
            pubKeyCredParams: [
                { type: "public-key", alg: -7  },  // ES256
                { type: "public-key", alg: -257 },  // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform",   // device biometric only
                userVerification:        "required",
                residentKey:             "preferred",
            },
            timeout:     60000,
            attestation: "none",
        },
    });

    // 3. Send the credential to the server to store the public key
    const attestationResponse = {
        id:       credential.id,
        rawId:    bufferToBase64url(credential.rawId),
        type:     credential.type,
        response: {
            clientDataJSON:    bufferToBase64url(credential.response.clientDataJSON),
            attestationObject: bufferToBase64url(credential.response.attestationObject),
        },
    };

    await apiRegister({ action: "register", email: user.email, attestation: attestationResponse });

    // 4. Persist the credential ID locally so the login screen knows to show the button
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        credentialId:  credential.id,
        email:         user.email,
        displayName:   user.display_name || user.email,
    }));
}

/**
 * Authenticate using a previously registered biometric credential.
 * Returns the same shape as a normal signIn success response.
 *
 * @param {Function} apiVerify - async fn that calls POST /auth/biometric/verify
 */
export async function biometricLogin(apiVerify) {
    const saved = getSavedBiometricUser();
    if (!saved) throw new Error("No biometric credential registered on this device.");

    // 1. Get an assertion challenge from server
    const { challenge: challengeB64, allowCredentials } =
        await apiVerify({ action: "challenge", credentialId: saved.credentialId });

    const challenge = base64urlToBuffer(challengeB64);

    // 2. Prompt the platform authenticator
    const assertion = await navigator.credentials.get({
        publicKey: {
            challenge,
            allowCredentials: allowCredentials.map((c) => ({
                id:   base64urlToBuffer(c.id),
                type: "public-key",
            })),
            userVerification: "required",
            timeout:          60000,
            rpId:             RP_ID,
        },
    });

    // 3. Send assertion to server for verification + session issuance
    const assertionPayload = {
        action:       "verify",
        credentialId: assertion.id,
        response: {
            authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
            clientDataJSON:    bufferToBase64url(assertion.response.clientDataJSON),
            signature:         bufferToBase64url(assertion.response.signature),
            userHandle:        assertion.response.userHandle
                ? bufferToBase64url(assertion.response.userHandle)
                : null,
        },
    };

    return await apiVerify(assertionPayload);
}

// ── Transaction biometric (separate enrollment) ──────────────

/**
 * Register a biometric credential specifically for authorising transactions.
 * Stored under a separate localStorage key so login and tx biometrics are
 * independently configurable.
 *
 * Caller must have already verified the user's MPIN before calling this.
 *
 * @param {object} user  - { email, display_name }
 * @param {Function} apiRegister - same biometricRegisterApi (same backend endpoint)
 */
export async function registerBiometricTx(user, apiRegister) {
    const { challenge: challengeB64, userId: userIdB64 } =
        await apiRegister({ action: "challenge", email: user.email });

    const challenge = base64urlToBuffer(challengeB64);
    const userId    = base64urlToBuffer(userIdB64);

    const credential = await navigator.credentials.create({
        publicKey: {
            rp: { id: RP_ID, name: RP_NAME },
            user: {
                id:          userId,
                name:        user.email + ":tx",          // distinct user handle
                displayName: (user.display_name || user.email) + " (Transactions)",
            },
            challenge,
            pubKeyCredParams: [
                { type: "public-key", alg: -7  },
                { type: "public-key", alg: -257 },
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification:        "required",
                residentKey:             "preferred",
            },
            timeout:     60000,
            attestation: "none",
        },
    });

    const attestationResponse = {
        id:       credential.id,
        rawId:    bufferToBase64url(credential.rawId),
        type:     credential.type,
        response: {
            clientDataJSON:    bufferToBase64url(credential.response.clientDataJSON),
            attestationObject: bufferToBase64url(credential.response.attestationObject),
        },
    };

    await apiRegister({ action: "register", email: user.email, attestation: attestationResponse });

    localStorage.setItem(TX_STORAGE_KEY, JSON.stringify({
        credentialId:  credential.id,
        email:         user.email,
        displayName:   user.display_name || user.email,
    }));
}

/**
 * Returns the saved transaction biometric credential for this device, or null.
 */
export function getSavedBiometricTxUser() {
    try {
        const raw = localStorage.getItem(TX_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * Clears the transaction biometric credential from localStorage.
 */
export function clearSavedBiometricTxUser() {
    localStorage.removeItem(TX_STORAGE_KEY);
}

/**
 * Authenticate using the transaction biometric credential.
 * Returns { biometric_token } — a 60-second JWT to pass to the transfer API.
 *
 * @param {Function} apiVerify - async fn that calls POST /auth/biometric/verify-transaction
 */
export async function biometricTxLogin(apiVerify) {
    const saved = getSavedBiometricTxUser();
    if (!saved) throw new Error("No transaction biometric credential registered on this device.");

    const { challenge: challengeB64, allowCredentials } =
        await apiVerify({ action: "challenge", credentialId: saved.credentialId });

    const challenge = base64urlToBuffer(challengeB64);

    const assertion = await navigator.credentials.get({
        publicKey: {
            challenge,
            allowCredentials: allowCredentials.map((c) => ({
                id:   base64urlToBuffer(c.id),
                type: "public-key",
            })),
            userVerification: "required",
            timeout:          60000,
            rpId:             RP_ID,
        },
    });

    const assertionPayload = {
        action:       "verify",
        credentialId: assertion.id,
        response: {
            authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
            clientDataJSON:    bufferToBase64url(assertion.response.clientDataJSON),
            signature:         bufferToBase64url(assertion.response.signature),
            userHandle:        assertion.response.userHandle
                ? bufferToBase64url(assertion.response.userHandle)
                : null,
        },
    };

    return await apiVerify(assertionPayload);  // { biometric_token }
}
