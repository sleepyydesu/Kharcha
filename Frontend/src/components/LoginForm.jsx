//Loginform 

import { useState, useEffect } from "react";
import { signIn, getMpinStatus, biometricVerifyApi } from "../services/api";
import InputField from "./InputField";
import { useNotifications } from "../context/NotificationContext";
import {
    isBiometricAvailable,
    getSavedBiometricUser,
    biometricLogin,
    clearSavedBiometricUser,
} from "../hooks/useBiometric";

function LoginForm({ onLogin, onShowReset }) {
    const { addNotification } = useNotifications();
    const [identifier, setIdentifier] = useState("");
    const [credential, setCredential] = useState("");
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // Biometric state
    const [biometricReady, setBiometricReady] = useState(false);
    const [biometricUser, setBiometricUser] = useState(null);
    const [biometricLoading, setBiometricLoading] = useState(false);

    useEffect(() => {
        async function checkBiometric() {
            const available = await isBiometricAvailable();
            if (!available) return;
            const saved = getSavedBiometricUser();
            if (saved) {
                setBiometricUser(saved);
                setBiometricReady(true);
            }
        }
        checkBiometric();
    }, []);

    function validate() {
        const e = {};
        if (!identifier.trim()) e.identifier = "Phone number or email is required";
        if (!credential) e.credential = "Password or MPIN is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function normalizePhone(raw) {
        const val = raw.trim();
        if (val.startsWith("+977")) return val;
        if (/^(97|98)\d{8}$/.test(val)) return "+977" + val;
        return val;
    }

    async function handleSubmit() {
        if (!validate()) return;
        setLoading(true);
        setErrors({});

        try {
            const data = await signIn({
                identifier: normalizePhone(identifier),
                credential,
            });

            if (data.success) {
                try {
                    const mpinStatus = await getMpinStatus();
                    if (!mpinStatus?.mpin_set) {
                        addNotification({
                            id:    "mpin_setup_prompt",
                            title: "Set up your MPIN",
                            body:  "Secure your transactions by setting up your 6-digit MPIN on your Account page.",
                            link:  "/account",
                            type:  "warning",
                        });
                    }
                } catch {
                    // Non-blocking
                }

                // Store account info for the setup modal
                window.__kharcha_pending_biometric_setup = {
                    account_id: data.account?.account_id,
                    email:      data.account?.email,
                };

                onLogin();
            } else {
                setErrors({ general: data.message || "Login failed. Please try again." });
            }
        } catch (err) {
            const msg = err.message;
            if (msg.includes("400")) {
                setErrors({ general: "Please check your input and try again." });
            } else if (msg.includes("401")) {
                setErrors({ credential: "Incorrect password or MPIN. Please try again." });
            } else if (msg.includes("403")) {
                setErrors({ general: "Your account has been deactivated. Contact support." });
            } else if (msg.includes("404")) {
                setErrors({ identifier: "No account found with this email or phone number." });
            } else {
                setErrors({ general: msg || "Something went wrong. Please try again later." });
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleBiometricLogin() {
        setBiometricLoading(true);
        setErrors({});
        try {
            const data = await biometricLogin(biometricVerifyApi);
            if (data.success) {
                onLogin();
            } else {
                setErrors({ general: data.message || "Biometric login failed. Please try again." });
            }
        } catch (err) {
            // Clear stale credential if it's no longer valid (e.g., device changed, DB reset)
            if (err.message?.includes("Credential not found")) {
                clearSavedBiometricUser();
                setBiometricReady(false);
                setBiometricUser(null);
            }
            if (err.name === "NotAllowedError") {
                setErrors({ general: "Biometric verification was cancelled." });
            } else {
                setErrors({ general: err.message || "Biometric login failed. Please use your password." });
            }
        } finally {
            setBiometricLoading(false);
        }
    }

    const canSubmit = identifier.trim().length > 0 && credential.length > 0 && !loading;
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && canSubmit) handleSubmit();
    };

    return (
        <div className="form-body slide-in">
            {errors.general && (
                <p style={{ color: "var(--error, #e53e3e)", fontSize: "13px", marginBottom: "12px" }}>
                    {errors.general}
                </p>
            )}

            {biometricReady && (
                <button
                    className="btn-biometric"
                    onClick={handleBiometricLogin}
                    disabled={biometricLoading}
                    type="button"
                    aria-label="Sign in with biometrics"
                >
                    {biometricLoading ? (
                        <span className="biometric-spinner" />
                    ) : (
                        <FingerprintIcon />
                    )}
                    <span>
                        {biometricLoading
                            ? "Verifying…"
                            : `Sign in as ${biometricUser?.displayName ?? "you"}`}
                    </span>
                </button>
            )}

            {biometricReady && (
                <div className="biometric-divider">
                    <span>or sign in with credentials</span>
                </div>
            )}

            <InputField
                label="Phone Number or Email"
                type="text"
                placeholder="98XXXXXXXX or john@example.com"
                value={identifier}
                onChange={(e) => {
                    setIdentifier(e.target.value);
                    setErrors((prev) => ({ ...prev, identifier: "", general: "" }));
                }}
                onKeyDown={handleKeyDown}
                icon="phone"
                error={errors.identifier}
            />

            <InputField
                label="Password / MPIN"
                type="password"
                placeholder="Enter your password or 6-digit MPIN"
                value={credential}
                onChange={(e) => {
                    setCredential(e.target.value);
                    setErrors((prev) => ({ ...prev, credential: "", general: "" }));
                }}
                onKeyDown={handleKeyDown}
                icon="lock"
                error={errors.credential}
            />

            <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{ marginTop: "16px" }}
            >
                {loading ? "Signing in…" : "Log In to Kharcha"}
            </button>

            <p className="footer-note">
                Forgot your credentials?{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); onShowReset(); }}>
                    Reset password
                </a>
            </p>
        </div>
    );
}

function FingerprintIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
            <path d="M2 12a10 10 0 0 1 18-6" />
            <path d="M2 17c1 .5 2.06.78 3 .87" />
            <path d="M22 6c.18.5.33 1 .44 1.5" />
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
            <path d="M17.44 9a6 6 0 0 1 .56 3 22.49 22.49 0 0 1-.31 3" />
            <path d="M4.42 11.247A13.152 13.152 0 0 0 4 12a13.55 13.55 0 0 0 2.1 7.338" />
            <path d="M8.53 16.11a6 6 0 0 0 .98 3.89" />
            <path d="M12 20c-.3.8-.7 1.4-1 2" />
        </svg>
    );
}

export default LoginForm;
