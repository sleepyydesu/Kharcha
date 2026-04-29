import { useState } from "react";
import { signIn } from "../services/api";
import InputField from "./InputField";

function LoginForm({ onLogin, onShowReset }) {
    const [identifier, setIdentifier] = useState("");
    const [credential, setCredential] = useState("");
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    function validate() {
        const e = {};
        if (!identifier.trim())
            e.identifier = "Phone number or email is required";
        if (!credential) e.credential = "Password or MPIN is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    // If the identifier looks like a Nepali phone number without the country code,
    // prepend +977 so the API always receives a fully-qualified number.
    function normalizePhone(raw) {
        const val = raw.trim();
        if (val.startsWith("+977")) return val; // already has country code
        if (/^(97|98)\d{8}$/.test(val)) return "+977" + val; // 10-digit local number
        return val; // email or other — pass through
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
                localStorage.setItem("token", data.token);
                // Persist mpin_set so Account page can decide setup vs change
                if (data.account) {
                    localStorage.setItem(
                        "mpin_set",
                        data.account.mpin_set ? "true" : "false",
                    );
                }
                onLogin();
            } else {
                setErrors({
                    general: data.message || "Login failed. Please try again.",
                });
            }
        } catch (err) {
            const msg = err.message;

            if (msg.includes("400")) {
                setErrors({
                    general: "Please check your input and try again.",
                });
            } else if (msg.includes("401")) {
                setErrors({
                    credential: "Incorrect password or MPIN. Please try again.",
                });
            } else if (msg.includes("403")) {
                setErrors({
                    general:
                        "Your account has been deactivated. Contact support.",
                });
            } else if (msg.includes("404")) {
                setErrors({
                    identifier:
                        "No account found with this email or phone number.",
                });
            } else {
                setErrors({
                    general:
                        msg || "Something went wrong. Please try again later.",
                });
            }
        } finally {
            setLoading(false);
        }
    }

    const canSubmit =
        identifier.trim().length > 0 && credential.length > 0 && !loading;

    return (
        <div className="form-body slide-in">
            {errors.general && (
                <p
                    style={{
                        color: "var(--error, #e53e3e)",
                        fontSize: "13px",
                        marginBottom: "12px",
                    }}
                >
                    {errors.general}
                </p>
            )}

            <InputField
                label="Phone Number or Email"
                type="text"
                placeholder="98XXXXXXXX or john@example.com"
                value={identifier}
                onChange={(e) => {
                    setIdentifier(e.target.value);
                    setErrors((prev) => ({
                        ...prev,
                        identifier: "",
                        general: "",
                    }));
                }}
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
                    setErrors((prev) => ({
                        ...prev,
                        credential: "",
                        general: "",
                    }));
                }}
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
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        onShowReset();
                    }}
                >
                    Reset password
                </a>
            </p>
        </div>
    );
}

export default LoginForm;
