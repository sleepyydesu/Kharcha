import { useState } from "react";

export default function SetToken() {
    const [token, setToken] = useState("");

    const handleSave = () => {
        localStorage.setItem("token", token);
        alert("Token saved to localStorage!");
    };

    const handleClear = () => {
        localStorage.removeItem("token");
        alert("Token removed!");
    };

    return (
        <div style={{ padding: "40px" }}>
            <h1>Set Auth Token</h1>

            <textarea
                placeholder="Paste token here..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                rows={6}
                style={{ width: "100%", marginTop: "10px" }}
            />

            <div style={{ marginTop: "20px" }}>
                <button onClick={handleSave}>Save Token</button>
                <button onClick={handleClear} style={{ marginLeft: "10px" }}>
                    Clear Token
                </button>
            </div>
        </div>
    );
}
