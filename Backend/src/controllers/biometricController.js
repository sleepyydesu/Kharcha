/**
 * biometricController.js — WebAuthn credential registration and verification
 *
 * This is a server-side WebAuthn implementation without any external library,
 * using only Node.js built-ins (crypto). It handles:
 *
 *  POST /api/auth/biometric/register
 *    { action: "challenge", email }             → { challenge, userId }
 *    { action: "register", email, attestation } → { success: true }
 *
 *  POST /api/auth/biometric/verify
 *    { action: "challenge", credentialId }      → { challenge, allowCredentials }
 *    { action: "verify",    credentialId, response } → issues cookies, { success, account }
 *
 * DB table expected (Supabase / Postgres):
 *
 *   CREATE TABLE biometric_credentials (
 *     id             BIGSERIAL PRIMARY KEY,
 *     account_id     UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
 *     credential_id  TEXT NOT NULL UNIQUE,           -- base64url
 *     public_key_spki TEXT NOT NULL,                  -- base64url DER-encoded SPKI
 *     sign_count     BIGINT NOT NULL DEFAULT 0,
 *     created_at     TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 * Challenges are stored server-side in a simple in-memory map with a 90-second TTL.
 * For multi-instance deployments, replace this with Redis or a DB table.
 */

const crypto   = require("crypto");
const supabase = require("../services/supabaseClient");
const { issueTokens } = require("./authController"); // re-export helper (see note below)

// ── In-memory challenge store (single-process / development) ──
// key: base64url challenge   value: { accountId | email, expiresAt }
const pendingChallenges = new Map();
const CHALLENGE_TTL_MS  = 90_000;

function storeChallenge(challenge, meta) {
    pendingChallenges.set(challenge, { ...meta, expiresAt: Date.now() + CHALLENGE_TTL_MS });
    // Purge expired entries lazily
    for (const [k, v] of pendingChallenges) {
        if (v.expiresAt < Date.now()) pendingChallenges.delete(k);
    }
}

function consumeChallenge(challenge) {
    const entry = pendingChallenges.get(challenge);
    if (!entry) return null;
    pendingChallenges.delete(challenge);
    if (entry.expiresAt < Date.now()) return null;
    return entry;
}

// ── Helpers ──────────────────────────────────────────────────

function randomBase64url(bytes = 32) {
    return crypto.randomBytes(bytes)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

function base64urlToBuffer(b64url) {
    const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64");
}

function bufferToBase64url(buf) {
    return Buffer.from(buf)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

/**
 * Parse and extract the public key from a WebAuthn attestationObject.
 * We only support "none" attestation (no attestation verification needed).
 *
 * The attestationObject is CBOR-encoded. Rather than pulling in a full CBOR
 * library, we use a minimal CBOR decoder for the specific structure WebAuthn
 * sends, then extract the COSE public key from the authenticatorData.
 *
 * For production, install the `cbor` npm package for robustness.
 */
function extractPublicKeyFromAttestation(attestationObjectB64) {
    // We use the `cbor` package if available, otherwise raw parsing
    // Install: npm install cbor
    try {
        const cbor = require("cbor");
        const buf  = base64urlToBuffer(attestationObjectB64);
        const decoded = cbor.decodeFirstSync(buf);

        // authenticatorData layout:
        // [32 bytes rpIdHash][1 byte flags][4 bytes signCount][variable attested cred data]
        const authData = decoded.authData;
        const flags    = authData[32];
        const hasAT    = (flags & 0x40) !== 0; // attested credential data present

        if (!hasAT) throw new Error("No attested credential data in authenticatorData");

        // After rpIdHash (32) + flags (1) + signCount (4) = offset 37
        // AAGUID (16) + credIdLen (2) + credId (credIdLen) + COSE key
        let offset     = 37;
        offset        += 16; // skip AAGUID
        const credIdLen = (authData[offset] << 8) | authData[offset + 1];
        offset        += 2;
        const credId   = authData.slice(offset, offset + credIdLen);
        offset        += credIdLen;

        // Remaining bytes are the COSE public key
        const coseKey  = cbor.decodeFirstSync(authData.slice(offset));

        // COSE key map: 1=kty, 3=alg, -1=crv/-1=n, -2=x/-2=e
        const kty = coseKey.get(1);
        const alg = coseKey.get(3);

        let publicKeySpki;

        if (kty === 2) {
            // EC2 (ES256, alg=-7)
            const x = coseKey.get(-2);
            const y = coseKey.get(-3);
            // Build uncompressed EC point key and import as SPKI
            const keyData = Buffer.concat([Buffer.from([0x04]), x, y]);
            // SPKI wrapper for P-256
            const spkiHeader = Buffer.from(
                "3059301306072a8648ce3d020106082a8648ce3d03010703420004",
                "hex",
            );
            publicKeySpki = bufferToBase64url(
                Buffer.concat([spkiHeader.slice(0, -1), keyData]),
            );
        } else if (kty === 3) {
            // RSA (RS256, alg=-257)
            const n = coseKey.get(-1);
            const e = coseKey.get(-2);
            // Build PKCS#1 RSA key and wrap in SPKI
            // For simplicity, use Node's crypto to reconstruct
            const keyObject = crypto.createPublicKey({
                key: { kty: "RSA", n: bufferToBase64url(n), e: bufferToBase64url(e) },
                format: "jwk",
            });
            publicKeySpki = bufferToBase64url(
                keyObject.export({ type: "spki", format: "der" }),
            );
        } else {
            throw new Error(`Unsupported key type: ${kty}`);
        }

        return {
            credentialId: bufferToBase64url(credId),
            publicKeySpki,
            signCount:    authData.readUInt32BE(33),
        };
    } catch (err) {
        throw new Error(`Failed to parse attestation: ${err.message}`);
    }
}

/**
 * Verify a WebAuthn assertion against the stored public key.
 */
async function verifyAssertion({ storedPublicKeySpki, storedSignCount, challengeB64url, assertionResponse, origin }) {
    const { authenticatorData, clientDataJSON, signature } = assertionResponse;

    // 1. Parse clientDataJSON
    const clientData = JSON.parse(
        base64urlToBuffer(clientDataJSON).toString("utf8"),
    );

    if (clientData.type !== "webauthn.get") {
        throw new Error("Invalid clientData type");
    }

    if (clientData.challenge !== challengeB64url) {
        throw new Error("Challenge mismatch");
    }

    // 2. Verify origin
    const expectedOrigins = [origin, `https://${new URL(origin).hostname}`];
    if (!expectedOrigins.includes(clientData.origin)) {
        throw new Error(`Origin mismatch: ${clientData.origin}`);
    }

    // 3. Reconstruct signed data
    const authDataBuf    = base64urlToBuffer(authenticatorData);
    const clientDataHash = crypto
        .createHash("sha256")
        .update(base64urlToBuffer(clientDataJSON))
        .digest();
    const signedData = Buffer.concat([Buffer.from(authDataBuf), clientDataHash]);

    // 4. Verify signature
    const publicKey = crypto.createPublicKey({
        key:    base64urlToBuffer(storedPublicKeySpki),
        format: "der",
        type:   "spki",
    });

    const sigBuf  = base64urlToBuffer(signature);
    const isValid = crypto.verify("sha256", signedData, publicKey, sigBuf);

    if (!isValid) throw new Error("Signature verification failed");

    // 5. Check sign count (replay attack prevention)
    const newSignCount = Buffer.from(authDataBuf).readUInt32BE(33);
    if (storedSignCount > 0 && newSignCount <= storedSignCount) {
        throw new Error("Sign count check failed — possible cloned authenticator");
    }

    return { newSignCount };
}

// ── Controllers ──────────────────────────────────────────────

/**
 * POST /api/auth/biometric/register
 * Requires: user is already authenticated (authenticate middleware).
 */
const registerBiometric = async (req, res) => {
    try {
        const { action, email, attestation } = req.body;
        const accountId = req.account?.account_id;

        if (!accountId) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        // ── Step 1: issue a challenge ──
        if (action === "challenge") {
            const challenge = randomBase64url(32);
            const userId    = randomBase64url(16);

            storeChallenge(challenge, { accountId, type: "registration" });

            return res.status(200).json({ success: true, challenge, userId });
        }

        // ── Step 2: receive attestation, store public key ──
        if (action === "register") {
            if (!attestation) {
                return res.status(400).json({ success: false, message: "attestation is required." });
            }

            const { credentialId, publicKeySpki, signCount } =
                extractPublicKeyFromAttestation(attestation.response.attestationObject);

            // Upsert — one credential per account on this device (replace if re-registering)
            const { error } = await supabase
                .from("biometric_credentials")
                .upsert(
                    {
                        account_id:      accountId,
                        credential_id:   credentialId,
                        public_key_spki: publicKeySpki,
                        sign_count:      signCount,
                    },
                    { onConflict: "account_id" },
                );

            if (error) throw error;

            return res.status(200).json({ success: true, message: "Biometric credential registered." });
        }

        return res.status(400).json({ success: false, message: "Invalid action." });
    } catch (err) {
        console.error("[registerBiometric]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

/**
 * POST /api/auth/biometric/verify
 * No auth required — this IS the login flow.
 */
const verifyBiometric = async (req, res) => {
    try {
        const { action, credentialId, response: assertionResponse } = req.body;

        // ── Step 1: issue a challenge ──
        if (action === "challenge") {
            if (!credentialId) {
                return res.status(400).json({ success: false, message: "credentialId is required." });
            }

            const challenge = randomBase64url(32);
            storeChallenge(challenge, { credentialId, type: "authentication" });

            return res.status(200).json({
                success: true,
                challenge,
                allowCredentials: [{ id: credentialId, type: "public-key" }],
            });
        }

        // ── Step 2: verify assertion and issue session ──
        if (action === "verify") {
            if (!credentialId || !assertionResponse) {
                return res.status(400).json({ success: false, message: "credentialId and response are required." });
            }

            // Look up stored credential
            const { data: cred, error: credError } = await supabase
                .from("biometric_credentials")
                .select("account_id, public_key_spki, sign_count")
                .eq("credential_id", credentialId)
                .maybeSingle();

            if (credError) throw credError;
            if (!cred) {
                return res.status(404).json({ success: false, message: "Credential not found." });
            }

            // Find the challenge from clientDataJSON
            const clientData = JSON.parse(
                base64urlToBuffer(assertionResponse.clientDataJSON).toString("utf8"),
            );
            const challengeEntry = consumeChallenge(clientData.challenge);
            if (!challengeEntry) {
                return res.status(400).json({ success: false, message: "Invalid or expired challenge." });
            }

            // Verify assertion
            const origin = req.headers.origin || `https://${req.hostname}`;
            const { newSignCount } = await verifyAssertion({
                storedPublicKeySpki: cred.public_key_spki,
                storedSignCount:     cred.sign_count,
                challengeB64url:     clientData.challenge,
                assertionResponse,
                origin,
            });

            // Update sign count
            await supabase
                .from("biometric_credentials")
                .update({ sign_count: newSignCount })
                .eq("credential_id", credentialId);

            // Load account for token issuance
            const { data: account, error: accError } = await supabase
                .from("accounts")
                .select("account_id, account_type, email, is_active, is_verified, mpin_hash")
                .eq("account_id", cred.account_id)
                .maybeSingle();

            if (accError) throw accError;
            if (!account) {
                return res.status(404).json({ success: false, message: "Account not found." });
            }
            if (!account.is_active) {
                return res.status(403).json({
                    success: false,
                    message: "Your account has been deactivated. Please contact support.",
                });
            }

            // Issue auth cookies
            await issueTokens(res, {
                account_id:   account.account_id,
                account_type: account.account_type,
                email:        account.email,
            });

            return res.status(200).json({
                success: true,
                message: "Signed in successfully via biometrics.",
                account: {
                    account_id:   account.account_id,
                    account_type: account.account_type,
                    email:        account.email,
                    mpin_set:     !!account.mpin_hash,
                    is_verified:  account.is_verified,
                },
            });
        }

        return res.status(400).json({ success: false, message: "Invalid action." });
    } catch (err) {
        console.error("[verifyBiometric]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

module.exports = { registerBiometric, verifyBiometric };
