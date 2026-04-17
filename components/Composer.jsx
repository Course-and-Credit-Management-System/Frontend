import React, { useEffect, useState } from "react";
import FormDataC from "./form_data_C";
import { api } from '../lib/api';

const toLocalInputValue = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromLocalInputValueToIso = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
};

// Set deadline to X minutes or hours from now (for demo/presentation)
const minutesFromNow = (minutes) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Composer_C = () => {
    const [windowSettings, setWindowSettings] = useState({
        isOpen: true,
        registrationDeadline: "",
        detailsDeadline: "",
        paymentDeadline: "",
        allowEditAfterSubmit: true,
    });
    const [savingWindow, setSavingWindow] = useState(false);

    useEffect(() => {
        let isMounted = true;
        api.getRegistrationWindowSettings()
            .then((data) => {
                if (!isMounted || !data) return;
                setWindowSettings({
                    isOpen: data.isOpen ?? true,
                    registrationDeadline: toLocalInputValue(data.registrationDeadline),
                    detailsDeadline: toLocalInputValue(data.detailsDeadline),
                    paymentDeadline: toLocalInputValue(data.paymentDeadline),
                    allowEditAfterSubmit: data.allowEditAfterSubmit ?? true,
                });
            })
            .catch(() => {
                // Keep defaults on failure
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const handleWindowChange = (e) => {
        const { name, type, checked, value } = e.target;
        setWindowSettings((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    // Quick-set deadline for demo/presentation (minutes or hours from now)
    const setDeadlineFromNow = (field, minutes) => {
        setWindowSettings((prev) => ({
            ...prev,
            [field]: minutesFromNow(minutes),
        }));
    };

    const handleSaveWindow = async () => {
        setSavingWindow(true);
        try {
            const payload = {
                isOpen: !!windowSettings.isOpen,
                registrationDeadline: fromLocalInputValueToIso(windowSettings.registrationDeadline),
                detailsDeadline: fromLocalInputValueToIso(windowSettings.detailsDeadline),
                paymentDeadline: fromLocalInputValueToIso(windowSettings.paymentDeadline),
                allowEditAfterSubmit: !!windowSettings.allowEditAfterSubmit,
            };
            // Basic client-side chronological validation
            const reg = payload.registrationDeadline ? new Date(payload.registrationDeadline).getTime() : null;
            const det = payload.detailsDeadline ? new Date(payload.detailsDeadline).getTime() : null;
            const pay = payload.paymentDeadline ? new Date(payload.paymentDeadline).getTime() : null;
            if (reg && det && reg > det) {
                alert("Registration deadline must be before or equal to details deadline.");
                setSavingWindow(false);
                return;
            }
            if (det && pay && det > pay) {
                alert("Details deadline must be before or equal to payment deadline.");
                setSavingWindow(false);
                return;
            }

            const updated = await api.updateRegistrationWindowSettings(payload);
            setWindowSettings({
                isOpen: updated.isOpen ?? true,
                registrationDeadline: toLocalInputValue(updated.registrationDeadline),
                detailsDeadline: toLocalInputValue(updated.detailsDeadline),
                paymentDeadline: toLocalInputValue(updated.paymentDeadline),
                allowEditAfterSubmit: updated.allowEditAfterSubmit ?? true,
            });
            alert("Registration window settings saved.");
        } catch (error) {
            alert(error?.message || "Failed to save registration window settings.");
        } finally {
            setSavingWindow(false);
        }
    };

    return (
        <div>
            <div style={{ marginTop: "20px", marginBottom: "24px", padding: "16px", borderRadius: "12px", border: "1px solid #dbe8f5", background: "#ffffff" }}>
                <h2 style={{ marginTop: 0, marginBottom: "12px" }}>🕒 Registration Window Control</h2>
                <p style={{ marginTop: 0, marginBottom: "16px", fontSize: "0.9rem", color: "#555" }}>
                    Control when students can register, submit details, and upload payment. Deadlines are optional; leave blank for no deadline.
                </p>
                <div style={{ marginBottom: "12px", padding: "10px 12px", background: "#f0f7ff", borderRadius: "8px", border: "1px solid #c5daf0" }}>
                    <strong style={{ fontSize: "0.85rem", color: "#0b5d90" }}>🎓 Demo / Presentation:</strong>
                    <span style={{ marginLeft: "8px", fontSize: "0.85rem", color: "#555" }}>
                        Quick-set deadlines in minutes/hours from now to test that students cannot access after each deadline.
                    </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", alignItems: "flex-start" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                            type="checkbox"
                            name="isOpen"
                            checked={windowSettings.isOpen}
                            onChange={handleWindowChange}
                        />
                        <span>Registration Open</span>
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label>Registration Deadline</label>
                        <input
                            type="datetime-local"
                            name="registrationDeadline"
                            value={windowSettings.registrationDeadline}
                            onChange={handleWindowChange}
                        />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            <span style={{ fontSize: "0.75rem", color: "#666", alignSelf: "center" }}>From now:</span>
                            {[2, 5, 10, 30, 60].map((m) => (
                                <button key={m} type="button" onClick={() => setDeadlineFromNow("registrationDeadline", m)}
                                    style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #0b5d90", background: "#fff", color: "#0b5d90", cursor: "pointer" }}>
                                    {m < 60 ? `${m} min` : "1 hr"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label>Details Submission Deadline</label>
                        <input
                            type="datetime-local"
                            name="detailsDeadline"
                            value={windowSettings.detailsDeadline}
                            onChange={handleWindowChange}
                        />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            <span style={{ fontSize: "0.75rem", color: "#666", alignSelf: "center" }}>From now:</span>
                            {[2, 5, 10, 30, 60].map((m) => (
                                <button key={m} type="button" onClick={() => setDeadlineFromNow("detailsDeadline", m)}
                                    style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #0b5d90", background: "#fff", color: "#0b5d90", cursor: "pointer" }}>
                                    {m < 60 ? `${m} min` : "1 hr"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label>Payment Deadline</label>
                        <input
                            type="datetime-local"
                            name="paymentDeadline"
                            value={windowSettings.paymentDeadline}
                            onChange={handleWindowChange}
                        />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            <span style={{ fontSize: "0.75rem", color: "#666", alignSelf: "center" }}>From now:</span>
                            {[2, 5, 10, 30, 60].map((m) => (
                                <button key={m} type="button" onClick={() => setDeadlineFromNow("paymentDeadline", m)}
                                    style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #0b5d90", background: "#fff", color: "#0b5d90", cursor: "pointer" }}>
                                    {m < 60 ? `${m} min` : "1 hr"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                            type="checkbox"
                            name="allowEditAfterSubmit"
                            checked={windowSettings.allowEditAfterSubmit}
                            onChange={handleWindowChange}
                        />
                        <span>Allow edits after submit</span>
                    </label>
                    <div>
                        <button
                            type="button"
                            onClick={handleSaveWindow}
                            disabled={savingWindow}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#0b5d90",
                                color: "#fff",
                                fontWeight: 600,
                                cursor: savingWindow ? "default" : "pointer",
                                marginTop: "4px",
                            }}
                        >
                            {savingWindow ? "Saving..." : "Save Window Settings"}
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: "30px", marginBottom: "20px" }}>
                <h2>⚙ Configure The Registeration </h2>
                <FormDataC
                />
            </div>

            
        </div>
    );
};

export default Composer_C;
