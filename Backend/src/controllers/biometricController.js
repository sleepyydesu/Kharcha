/**
 * biometricController.js
 *
 * Express handlers for WebAuthn-based biometric authentication.
 * Implements three routes declared in biometricRoutes.js:
 *
 *   POST /auth/biometric/register          (authenticated)
 *   POST /auth/biometric/verify            (no auth required)
 *   POST /auth/biometric/verify-transaction (authenticated)
 *
 * Each route accepts a two-step protocol driven by the `action` field:
 *
 *   Step 1  action:"challenge"  →  server issues a fresh random challenge
 *   Step 2  action:"register"   →  client sends WebAuthn attestation  (register only)
 *           action:"verify"     →  client sends WebAuthn assertion    (verify endpoints)
 *
 * Dependencies (all already in package.json):
 *   cbor        — decodes CBOR-encoded attestationObject / COSE public keys
 *   crypto      — built-in; hashing, signature verification, key import
 *   jsonwebtoken — via jwtUtils (generateBiometricTxToken)
 *   supabase    — persistence layer
 *
 * Environment variables required:
 *   FRONTEND_URL   e.g. "https://kharcha.app"   (used for origin check)
 *   RP_ID          e.g. "kharcha.app"            (used for rpId hash check)
 *   JWT_SECRET, BIOMETRIC_TX_SECRET              (consumed by jwtUtils)
 */

"use strict";

const crypto  = require("crypto");
const cbor    = require("cbor");

const supabase          = require("../services/supabaseClient");
const { storeRefreshToken } = require("../services/tokenService");
const {
    generateAuthToken,
    generateRefreshToken,
    hashToken,
    generateBiometricTxToken,
} = require("../utils/jwtUtils");
const { setAuthCookies } = require("../utils/cookieUtils");

// ── Config ────────────────────────────────────────────────────────────────────

const EXPECTED_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";
const RP_ID           = process.env.RP_ID        || "localhost";
const CHALLENGE_TTL   = 120_000; // 2 minutes in ms

// ── In-memory challenge store ─────────────────────────────────────────────────
// Keyed by "reg:<account_id>", "auth:<credentialId>", or "tx:<credentialId>".
// For production at scale this can be replaced with a short-TTL Redis store.

const pendingChallenges = new Map();

function generateChallenge() {
    return crypto.randomBytes(32).toString("base64url");
}

function storeChallenge(key, challenge) {
    pruneExpiredChallenges();
    pendingChallenges.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL });
}

function consumeChallenge(key) {
    const entry = pendingChallenges.get(key);
    if (!entry) return null;
    pendingChallenges.delete(key);
    return entry.expiresAt >= Date.now() ? entry.challenge : null;
}

function pruneExpiredChallenges() {
    const now = Date.now();
    for (const [k, v] of pendingChallenges) {
        if (v.expiresAt < now) pendingChallenges.delete(k);
    }
}

// ── WebAuthn helpers ──────────────────────────────────────────────────────────

/**
 * Parse the binary authData buffer returned by the authenticator.
 *
 * Layout (see W3C WebAuthn §6.1):
 *   [0..31]   rpIdHash        32 bytes  SHA-256 of relying-party ID
 *   [32]      flags           1  byte   bit 0=UP, bit 2=UV, bit 6=AT, bit 7=ED
 *   [33..36]  signCount       4  bytes  uint32 big-endian
 *   [37..]    attestedCredentialData (only when AT flag is set)
 *               [0..15]   aaguid             16 bytes
 *               [16..17]  credentialIdLength  2 bytes uint16 big-endian
 *               [18..]    credentialId        <credentialIdLength> bytes
 *               [..]      credentialPublicKey CBOR-encoded COSE key
 */
function parseAuthData(buf) {
    let offset = 0;

    const rpIdHash  = buf.subarray(offset, offset + 32); offset += 32;
    const flags     = buf[offset];                        offset +=  1;
    const signCount = buf.readUInt32BE(offset);           offset +=  4;

    const up = !!(flags & 0x01); // user present
    const uv = !!(flags & 0x04); // user verified
    const at = !!(flags & 0x40); // attested credential data present

    let aaguid            = null;
    let credentialId      = null;
    let credentialPublicKey = null;

    if (at && offset < buf.length) {
        aaguid = buf.subarray(offset, offset + 16); offset += 16;
        const idLen = buf.readUInt16BE(offset);     offset +=  2;
        credentialId = buf.subarray(offset, offset + idLen); offset += idLen;
        credentialPublicKey = cbor.decodeFirstSync(buf.subarray(offset));
    }

    return { rpIdHash, flags, signCount, up, uv, at, aaguid, credentialId, credentialPublicKey };
}

/**
 * Convert a CBOR COSE public key (Map<int, any>) to a compact JSON string.
 * Stores only the key components, not the full PEM format.
 *
 * EC P-256: { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
 * RSA:     { "kty": "RSA", "n": "...", "e": "..." }
 */
function coseToJson(coseMap) {
    const kty = coseMap.get(1);

    if (kty === 2) {
        // EC2 — P-256
        const x = coseMap.get(-2);
        const y = coseMap.get(-3);
        return JSON.stringify({
            kty: "EC",
            crv: "P-256",
            x:   x.toString("base64url"),
            y:   y.toString("base64url"),
        });
    }

    if (kty === 3) {
        // RSA
        const n = coseMap.get(-1);
        const e = coseMap.get(-2);
        return JSON.stringify({
            kty: "RSA",
            n:   n.toString("base64url"),
            e:   e.toString("base64url"),
        });
    }

    throw new Error(`Unsupported COSE key type: ${kty}`);
}

/**
 * Convert stored JSON back to a Node.js KeyObject for signature verification.
 */
function jsonToPublicKey(keyJson) {
    const key = JSON.parse(keyJson);
    return crypto.createPublicKey({
        key:    key,
        format: "jwk",
    });
}

/**
 * Verify a WebAuthn assertion signature.
 *
 * The signed payload is:   authData || SHA-256(clientDataJSON)
 * The hash algorithm is SHA-256 for both ES256 and RS256.
 */
function verifyAssertionSignature(publicKey, authDataBuf, clientDataJSONBuf, signatureBuf) {
    const clientDataHash = crypto.createHash("sha256").update(clientDataJSONBuf).digest();
    const signedData     = Buffer.concat([authDataBuf, clientDataHash]);
    return crypto.verify("SHA256", signedData, publicKey, signatureBuf);
}

/**
 * Shared verification logic for both /verify and /verify-transaction.
 * Returns { ok, error, parsed, cred } so callers can act on the result.
 */
async function verifyAssertion({ credentialId, assertionResponse, expectedChallenge, accountId }) {
    // 1. Decode and validate clientDataJSON
    const clientDataJSONBuf = Buffer.from(assertionResponse.clientDataJSON, "base64url");
    let clientData;
    try {
        clientData = JSON.parse(clientDataJSONBuf.toString("utf8"));
    } catch {
        return { ok: false, error: "clientDataJSON is not valid JSON." };
    }

    if (clientData.type !== "webauthn.get") {
        return { ok: false, error: "clientData.type must be 'webauthn.get'." };
    }
    if (clientData.challenge !== expectedChallenge) {
        return { ok: false, error: "Challenge mismatch." };
    }
    // Flexible origin check - accept any origin that includes our expected hostname
    // This handles Safari on iOS which may include different port/trailing slash variations
    const expectedHostname = new URL(EXPECTED_ORIGIN).hostname;
    const actualOrigin = new URL(clientData.origin);
    if (!actualOrigin.hostname.includes(expectedHostname) && clientData.origin !== EXPECTED_ORIGIN) {
        return { ok: false, error: `Origin mismatch (got ${clientData.origin}, expected ${EXPECTED_ORIGIN}).` };
    }

    // 2. Parse authData
    const authDataBuf = Buffer.from(assertionResponse.authenticatorData, "base64url");
    const parsed      = parseAuthData(authDataBuf);

    const expectedRpIdHash = crypto.createHash("sha256").update(RP_ID).digest();
    if (!parsed.rpIdHash.equals(expectedRpIdHash)) {
        return { ok: false, error: "rpId hash mismatch." };
    }
    if (!parsed.up) {
        return { ok: false, error: "User presence flag not set." };
    }

    // 3. Load stored credential — optionally scoped to a specific account
    const query = supabase
        .from("biometric_credentials")
        .select("*")
        .eq("credential_id", credentialId);
    if (accountId) query.eq("account_id", accountId);

    const { data: cred, error: fetchErr } = await query.maybeSingle();
    if (fetchErr || !cred) {
        return { ok: false, error: "Credential not found." };
    }

    // 4. Verify signature (using JSON-stored key)
    const publicKey   = jsonToPublicKey(cred.public_key);
    const signatureBuf = Buffer.from(assertionResponse.signature, "base64url");
    const valid = verifyAssertionSignature(publicKey, authDataBuf, clientDataJSONBuf, signatureBuf);
    if (!valid) {
        return { ok: false, error: "Signature verification failed." };
    }

    // 5. Sign-count check (replay attack prevention)
    //    A stored count of 0 means the authenticator doesn't support counters — skip.
    if (cred.sign_count > 0 && parsed.signCount <= cred.sign_count) {
        return { ok: false, error: "Sign count violation — possible replay attack." };
    }

    // 6. Update persisted sign count
    await supabase
        .from("biometric_credentials")
        .update({ sign_count: parsed.signCount })
        .eq("credential_id", credentialId);

    return { ok: true, parsed, cred };
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /auth/biometric/register   (requires authenticate middleware)
 *
 * action:"challenge"
 *   Body:    { action, email }
 *   Returns: { challenge, userId }   — both base64url strings
 *
 * action:"register"
 *   Body:    { action, email, attestation }
 *   Returns: { success, message }
 */
const registerBiometric = async (req, res) => {
    const { action, attestation } = req.body;
    const account_id = req.account?.account_id;

    try {
        // ── Step 1: issue a registration challenge ────────────────────────────
        if (action === "challenge") {
            const challenge = generateChallenge();
            // userId sent to the authenticator must be stable per account.
            // We base64url-encode the account_id so it survives the round-trip.
            const userId = Buffer.from(account_id).toString("base64url");
            storeChallenge(`reg:${account_id}`, challenge);
            return res.status(200).json({ challenge, userId });
        }

        // ── Step 2: verify attestation and persist credential ─────────────────
        if (action === "register") {
            const expectedChallenge = consumeChallenge(`reg:${account_id}`);
            if (!expectedChallenge) {
                return res.status(400).json({ success: false, message: "Challenge expired or not found. Please try again." });
            }

            // Validate clientDataJSON
            const clientDataJSONBuf = Buffer.from(attestation.response.clientDataJSON, "base64url");
            let clientData;
            try {
                clientData = JSON.parse(clientDataJSONBuf.toString("utf8"));
            } catch {
                return res.status(400).json({ success: false, message: "clientDataJSON is not valid JSON." });
            }

            if (clientData.type !== "webauthn.create") {
                return res.status(400).json({ success: false, message: "clientData.type must be 'webauthn.create'." });
            }
            if (clientData.challenge !== expectedChallenge) {
                return res.status(400).json({ success: false, message: "Challenge mismatch." });
            }
            // Flexible origin check for Safari/iOS compatibility
            const expectedHostname = new URL(EXPECTED_ORIGIN).hostname;
            const actualOrigin = new URL(clientData.origin);
            if (!actualOrigin.hostname.includes(expectedHostname) && clientData.origin !== EXPECTED_ORIGIN) {
                return res.status(400).json({ success: false, message: `Origin mismatch (got ${clientData.origin}, expected ${EXPECTED_ORIGIN}).` });
            }

            // Decode CBOR attestationObject
            let attestationObject;
            try {
                attestationObject = cbor.decodeFirstSync(
                    Buffer.from(attestation.response.attestationObject, "base64url")
                );
            } catch {
                return res.status(400).json({ success: false, message: "Failed to decode attestationObject." });
            }

            const authDataBuf = attestationObject.authData;
            const parsed      = parseAuthData(authDataBuf);

            // Verify rpId hash
            const expectedRpIdHash = crypto.createHash("sha256").update(RP_ID).digest();
            if (!parsed.rpIdHash.equals(expectedRpIdHash)) {
                return res.status(400).json({ success: false, message: "rpId hash mismatch." });
            }
            if (!parsed.up) {
                return res.status(400).json({ success: false, message: "User presence flag not set." });
            }
            if (!parsed.at || !parsed.credentialPublicKey) {
                return res.status(400).json({ success: false, message: "No attested credential data in authData." });
            }

            // Serialize the public key as compact JSON (instead of PEM)
            let publicKeyJson;
            try {
                publicKeyJson = coseToJson(parsed.credentialPublicKey);
            } catch (e) {
                return res.status(400).json({ success: false, message: `Unsupported public key format: ${e.message}` });
            }

            const credentialId = parsed.credentialId.toString("base64url");

            // Check if credential already exists
            const { data: existingCred } = await supabase
                .from("biometric_credentials")
                .select("credential_id")
                .eq("account_id", account_id)
                .eq("credential_id", credentialId)
                .maybeSingle();

            let error;
            if (existingCred) {
                // Update existing credential
                const { error: updateErr } = await supabase
                    .from("biometric_credentials")
                    .update({
                        public_key:  publicKeyJson,
                        sign_count:  parsed.signCount,
                        aaguid:      parsed.aaguid ? parsed.aaguid.toString("hex") : null,
                        updated_at:  new Date().toISOString(),
                    })
                    .eq("account_id", account_id)
                    .eq("credential_id", credentialId);
                error = updateErr;
            } else {
                // Insert new credential (allows multiple per account)
                const { error: insertErr } = await supabase
                    .from("biometric_credentials")
                    .insert({
                        account_id,
                        credential_id: credentialId,
                        public_key:    publicKeyJson,
                        sign_count:    parsed.signCount,
                        aaguid:        parsed.aaguid ? parsed.aaguid.toString("hex") : null,
                        updated_at:    new Date().toISOString(),
                    });
                error = insertErr;
            }

            if (error) throw error;

            return res.status(200).json({ success: true, message: "Biometric credential registered successfully." });
        }

        return res.status(400).json({ success: false, message: "Invalid action. Use 'challenge' or 'register'." });

    } catch (err) {
        console.error("[registerBiometric]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

/**
 * POST /auth/biometric/verify   (no prior auth required)
 *
 * action:"challenge"
 *   Body:    { action, credentialId }
 *   Returns: { challenge, allowCredentials }
 *
 * action:"verify"
 *   Body:    { action, credentialId, response: { authenticatorData, clientDataJSON, signature, userHandle } }
 *   Returns: { success, message, account }  + sets auth cookies
 */
const verifyBiometric = async (req, res) => {
    const { action, credentialId, response: assertionResponse } = req.body;

    try {
        // ── Step 1: issue an assertion challenge ──────────────────────────────
        if (action === "challenge") {
            // Confirm the credential exists before issuing a challenge
            const { data: cred, error } = await supabase
                .from("biometric_credentials")
                .select("credential_id")
                .eq("credential_id", credentialId)
                .maybeSingle();

            if (error || !cred) {
                return res.status(404).json({ success: false, message: "Credential not found." });
            }

            const challenge = generateChallenge();
            storeChallenge(`auth:${credentialId}`, challenge);

            return res.status(200).json({
                challenge,
                allowCredentials: [{ id: credentialId, type: "public-key" }],
            });
        }

        // ── Step 2: verify assertion and issue session ────────────────────────
        if (action === "verify") {
            const expectedChallenge = consumeChallenge(`auth:${credentialId}`);
            if (!expectedChallenge) {
                return res.status(400).json({ success: false, message: "Challenge expired or not found." });
            }

            const result = await verifyAssertion({
                credentialId,
                assertionResponse,
                expectedChallenge,
                accountId: null, // no account filter for login — credential ID is unique
            });

            if (!result.ok) {
                return res.status(401).json({ success: false, message: result.error });
            }

            // Fetch account details
            const { data: account, error: accErr } = await supabase
                .from("accounts")
                .select("account_id, account_type, email")
                .eq("account_id", result.cred.account_id)
                .maybeSingle();

            if (accErr || !account) {
                return res.status(404).json({ success: false, message: "Account not found." });
            }

            // Issue access + refresh tokens (identical to normal signin)
            const accessToken  = generateAuthToken({ account_id: account.account_id, account_type: account.account_type, email: account.email });
            const refreshToken = generateRefreshToken();
            await storeRefreshToken(account.account_id, hashToken(refreshToken));
            setAuthCookies(res, accessToken, refreshToken);

            return res.status(200).json({
                success: true,
                message: "Biometric login successful.",
                account: {
                    account_id:   account.account_id,
                    account_type: account.account_type,
                    email:        account.email,
                },
            });
        }

        return res.status(400).json({ success: false, message: "Invalid action. Use 'challenge' or 'verify'." });

    } catch (err) {
        console.error("[verifyBiometric]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

/**
 * POST /auth/biometric/verify-transaction   (requires authenticate middleware)
 *
 * Same two-step flow as verifyBiometric, but instead of issuing session cookies
 * it returns a short-lived biometric_token (60 s JWT) that the wallet transfer
 * endpoint accepts in place of an MPIN.
 *
 * The credential is scoped to the authenticated account so one user can never
 * consume another user's biometric challenge.
 *
 * action:"challenge"
 *   Body:    { action, credentialId }
 *   Returns: { challenge, allowCredentials }
 *
 * action:"verify"
 *   Body:    { action, credentialId, response: { ... } }
 *   Returns: { success, biometric_token }
 */
const verifyTransactionBiometric = async (req, res) => {
    const { action, credentialId, response: assertionResponse } = req.body;
    const account_id = req.account?.account_id;

    try {
        // ── Step 1: issue a transaction challenge ─────────────────────────────
        if (action === "challenge") {
            // Credential must belong to the authenticated user
            const { data: cred, error } = await supabase
                .from("biometric_credentials")
                .select("credential_id")
                .eq("credential_id", credentialId)
                .eq("account_id", account_id)
                .maybeSingle();

            if (error || !cred) {
                return res.status(404).json({ success: false, message: "Credential not found for this account." });
            }

            const challenge = generateChallenge();
            storeChallenge(`tx:${credentialId}:${account_id}`, challenge);

            return res.status(200).json({
                challenge,
                allowCredentials: [{ id: credentialId, type: "public-key" }],
            });
        }

        // ── Step 2: verify assertion and return biometric_token ───────────────
        if (action === "verify") {
            const expectedChallenge = consumeChallenge(`tx:${credentialId}:${account_id}`);
            if (!expectedChallenge) {
                return res.status(400).json({ success: false, message: "Challenge expired or not found." });
            }

            const result = await verifyAssertion({
                credentialId,
                assertionResponse,
                expectedChallenge,
                accountId: account_id, // scope assertion to the authenticated user
            });

            if (!result.ok) {
                return res.status(401).json({ success: false, message: result.error });
            }

            // Short-lived token (60 s) the transfer endpoint accepts instead of MPIN
            const biometric_token = generateBiometricTxToken(account_id);
            return res.status(200).json({ success: true, biometric_token });
        }

        return res.status(400).json({ success: false, message: "Invalid action. Use 'challenge' or 'verify'." });

    } catch (err) {
        console.error("[verifyTransactionBiometric]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ── Delete credential ────────────────────────────────────────────────────────

/**
 * DELETE /auth/biometric/credential
 *
 * Delete a biometric credential by credential_id.
 * User must be authenticated and can only delete their own credentials.
 *
 * Body: { credentialId }
 * Returns: { success, message }
 */
const deleteCredential = async (req, res) => {
    const { credentialId } = req.body;
    const account_id = req.account?.account_id;

    if (!credentialId) {
        return res.status(400).json({ success: false, message: "credentialId is required." });
    }

    try {
        // Verify the credential belongs to this user before deleting
        const { data: cred, error: fetchErr } = await supabase
            .from("biometric_credentials")
            .select("account_id")
            .eq("credential_id", credentialId)
            .eq("account_id", account_id)
            .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!cred) {
            return res.status(404).json({ success: false, message: "Credential not found or does not belong to you." });
        }

        // Delete the credential
        const { error: deleteErr } = await supabase
            .from("biometric_credentials")
            .delete()
            .eq("credential_id", credentialId)
            .eq("account_id", account_id);

        if (deleteErr) throw deleteErr;

        return res.status(200).json({ success: true, message: "Biometric credential deleted successfully." });

    } catch (err) {
        console.error("[deleteCredential]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

module.exports = { registerBiometric, verifyBiometric, verifyTransactionBiometric, deleteCredential };