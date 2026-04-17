import React, { useState, useEffect } from "react";
import OptionsEditorC from "./OptionsEditor_C";
import { api } from '../lib/api';
import "./componentstyle/form_data_C.css";

const STORAGE_KEY = "registration_form_data";
const DEFAULT_MAJOR_CAPACITY = 100;

const normalizeMajorLabel = (value) => String(value || "").trim();

const majorKey = (yearLevel, label) =>
    `${Number(yearLevel) || 0}::${normalizeMajorLabel(label).toUpperCase()}`;

const resolveMajorSelectionStartYearFromConfig = (config) => {
    const yearlyConfig = Array.isArray(config?.yearlyConfig) ? config.yearlyConfig : [];
    const yearsWithMajors = yearlyConfig
        .filter((entry) => Array.isArray(entry?.majors)
            && entry.majors.some((major) => normalizeMajorLabel(major) !== ""))
        .map((entry) => Number(entry?.yearLevel || 0))
        .filter((year) => Number.isFinite(year) && year > 0)
        .sort((a, b) => a - b);
    if (yearsWithMajors.length > 0) {
        return yearsWithMajors[0];
    }
    const totalYears = Number(config?.header?.totalYears || 0);
    const safeTotalYears = Number.isFinite(totalYears) && totalYears > 0 ? totalYears : 3;
    // No majors configured: keep all years in foundation mode.
    return safeTotalYears + 1;
};

const FormDataC = ({ initialData, onChange, disabled }) => {
    /**
     * Standardizes the data structure for backend readiness.
     * We separate metadata/global config from the specific yearly data.
     */
    const standardizeData = (input) => {
        const base = (Array.isArray(input) ? input[0] : input) || {};
        
        // Handle migration from old flat structure if necessary
        const header = base.header || {
            id: base.register_id || 1,
            totalYears: base.no_of_years || 0,
            baseFee: base.all_payment || 0
        };

        let yearlyConfig = base.yearlyConfig || base.years?.map(y => ({
            yearLevel: y.year,
            semesters: y.semesters,
            majors: y.majors,
            fee: y.payment_amount
        })) || [];

        // Critical Logic: Clean up old hidden data that exceeds totalYears
        if (yearlyConfig.length > header.totalYears) {
            yearlyConfig = yearlyConfig.slice(0, header.totalYears);
        }

        return {
            header,
            yearlyConfig
        };
    };

    // Main Storage: Array of configurations
    const [history, setHistory] = useState(() => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                const array = Array.isArray(parsed) ? parsed : [parsed];
                return array.map(item => standardizeData(item));
            } catch (e) {
                console.error("Failed to parse saved data", e);
            }
        }
        if (initialData) {
            const array = Array.isArray(initialData) ? initialData : [initialData];
            return array.map(item => standardizeData(item));
        }
        return [standardizeData(null)];
    });

    // Current active view
    const [data, setData] = useState(() => history[history.length - 1]);

    const [isEditMode, setIsEditMode] = useState(false);
    const [tempData, setTempData] = useState(null);
    const [syncingMajors, setSyncingMajors] = useState(false);

    // Sync with prop if provided and no local storage exists
    useEffect(() => {
        if (initialData && !localStorage.getItem(STORAGE_KEY)) {
            const array = Array.isArray(initialData) ? initialData : [initialData];
            const standardized = array.map(item => standardizeData(item));
            setHistory(standardized);
            setData(standardized[standardized.length - 1]);
        }
    }, [initialData]);

    const handleEditToggle = () => {
        if (!isEditMode) {
            if (disabled) {
                alert("Cannot edit form data during the registration period. Please wait until the period is finished or edit before it starts.");
                return;
            }
            setTempData(JSON.parse(JSON.stringify(data)));
        } else {
            setTempData(null);
        }
        setIsEditMode(!isEditMode);
    };

    const handleHistorySelect = (e) => {
        const selectedId = parseInt(e.target.value);
        const selectedConfig = history.find(c => c.header.id === selectedId);
        if (selectedConfig) {
            setTempData(JSON.parse(JSON.stringify(selectedConfig)));
        }
    };

    const handleNoOfYearsChange = (e) => {
        let val = e.target.value;
        // Only take the last digit if more than one are entered
        if (val.length > 1) {
            val = val.slice(-1);
        }
        const newCount = parseInt(val) || 0;
        let config = [...tempData.yearlyConfig];

        if (newCount > config.length) {
            // Add new years at the end
            const diff = newCount - config.length;
            for (let i = 0; i < diff; i++) {
                const yNum = config.length + 1;
                config.push({
                    yearLevel: yNum,
                    semesters: [2 * yNum - 1, 2 * yNum],
                    majors: [],
                    fee: tempData.header.baseFee
                });
            }
        } else if (newCount < config.length) {
            // Truncate the extra years from the end
            config = config.slice(0, newCount);
        }

        setTempData({ 
            ...tempData, 
            header: { ...tempData.header, totalYears: newCount },
            yearlyConfig: config 
        });
    };

    const handleAllPaymentChange = (e) => {
        const amount = parseInt(e.target.value) || 0;
        const updatedConfig = tempData.yearlyConfig.map(y => ({ ...y, fee: amount }));
        setTempData({ 
            ...tempData, 
            header: { ...tempData.header, baseFee: amount },
            yearlyConfig: updatedConfig 
        });
    };

    const handleYearPaymentChange = (yearLevel, value) => {
        const amount = parseInt(value) || 0;
        const updatedConfig = tempData.yearlyConfig.map(y => 
            y.yearLevel === yearLevel ? { ...y, fee: amount } : y
        );
        setTempData({ ...tempData, yearlyConfig: updatedConfig });
    };

    const handleMajorsChange = (yearLevel, majorsString) => {
        const majorsArray = majorsString.split(",").filter(m => m.trim() !== "");
        const updatedConfig = tempData.yearlyConfig.map(y => 
            y.yearLevel === yearLevel ? { ...y, majors: majorsArray } : y
        );
        setTempData({ ...tempData, yearlyConfig: updatedConfig });
    };

    const syncMajorsToBackendCatalog = async (finalData) => {
        const term = await api.getCurrentTerm();
        const academicYear = String(term?.academicYear || "").trim();
        const semester = Number(term?.semester || 0);
        if (!academicYear || (semester !== 1 && semester !== 2)) {
            throw new Error("Current term is missing. Please set academic year and semester in Term Config.");
        }

        const existingRowsRaw = await api.adminListMajorClasses({
            academicYear,
            semester,
            includeInactive: true
        });
        const existingRows = Array.isArray(existingRowsRaw) ? existingRowsRaw : [];
        const existingByKey = new Map();
        existingRows.forEach((row) => {
            const yearLevel = Number(row?.yearLevel || row?.year_level || 0);
            const label = normalizeMajorLabel(
                row?.label
                || row?.classLabel
                || row?.class_label
                || row?.courseCode
                || row?.course_code
                || row?.courseName
                || row?.course_name
                || ""
            );
            if (!yearLevel || !label) return;
            existingByKey.set(majorKey(yearLevel, label), row);
        });

        const desiredByKey = new Map();
        const yearlyConfig = Array.isArray(finalData?.yearlyConfig) ? finalData.yearlyConfig : [];
        yearlyConfig.forEach((entry) => {
            const yearLevel = Number(entry?.yearLevel || 0);
            if (!yearLevel) return;
            const majors = Array.isArray(entry?.majors) ? entry.majors : [];
            majors
                .map(normalizeMajorLabel)
                .filter(Boolean)
                .forEach((label) => {
                    const key = majorKey(yearLevel, label);
                    if (!desiredByKey.has(key)) {
                        desiredByKey.set(key, { yearLevel, label });
                    }
                });
        });

        for (const [key, desired] of desiredByKey.entries()) {
            const existing = existingByKey.get(key);
            const capacity = Number(existing?.maxCapacity || existing?.max_capacity || 0);
            await api.adminUpdateMajorClass({
                id: existing?.id || existing?.majorClassId || existing?.courseId || undefined,
                academicYear,
                semester,
                yearLevel: desired.yearLevel,
                classLabel: desired.label,
                courseCode: desired.label,
                courseName: desired.label,
                maxCapacity: capacity > 0 ? capacity : DEFAULT_MAJOR_CAPACITY,
                isLocked: Boolean(existing?.isLocked || existing?.is_locked),
                isActive: true,
                departmentId: existing?.departmentId || existing?.department_id || undefined
            });
        }

        for (const [key, existing] of existingByKey.entries()) {
            if (desiredByKey.has(key)) continue;

            const id = existing?.id || existing?.majorClassId || existing?.courseId;
            if (!id) continue;
            const yearLevel = Number(existing?.yearLevel || existing?.year_level || 0);
            const label = normalizeMajorLabel(
                existing?.label
                || existing?.classLabel
                || existing?.class_label
                || existing?.courseCode
                || existing?.course_code
                || existing?.courseName
                || existing?.course_name
                || ""
            );
            if (!yearLevel || !label) continue;
            const capacity = Number(existing?.maxCapacity || existing?.max_capacity || 0);
            await api.adminUpdateMajorClass({
                id,
                academicYear,
                semester,
                yearLevel,
                classLabel: label,
                courseCode: String(existing?.courseCode || existing?.course_code || label).trim(),
                courseName: String(existing?.courseName || existing?.course_name || label).trim(),
                maxCapacity: capacity > 0 ? capacity : DEFAULT_MAJOR_CAPACITY,
                isLocked: Boolean(existing?.isLocked || existing?.is_locked),
                isActive: false,
                departmentId: existing?.departmentId || existing?.department_id || undefined
            });
        }
    };

    const syncMajorSelectionStartYear = async (finalData) => {
        const majorSelectionStartYear = resolveMajorSelectionStartYearFromConfig(finalData);
        await api.updateAdminTermConfig({ majorSelectionStartYear });
    };

    const handleSave = async () => {
        if (!isModified()) {
            // No changes were made, but still sync majors to backend catalog.
            const finalData = tempData;
            setData(finalData);
            try {
                setSyncingMajors(true);
                await syncMajorsToBackendCatalog(finalData);
                await syncMajorSelectionStartYear(finalData);
                setIsEditMode(false);
                setTempData(null);
                if (onChange) onChange(finalData);
                window.dispatchEvent(new CustomEvent("registrationConfigUpdated"));
                alert("Major class catalog and major selection year synced.");
            } catch (syncError) {
                console.error("Failed to sync major class catalog:", syncError);
                alert(`Failed to sync major settings: ${syncError?.message || "Unknown error"}`);
            } finally {
                setSyncingMajors(false);
            }
            return;
        }

        // Find the absolute highest ID ever used to ensure the next one is always +1 from max
        const maxId = history.reduce((max, item) => Math.max(max, item.header.id), 0);
        const newId = maxId + 1;

        const finalData = {
            header: {
                ...tempData.header,
                id: newId,
                lastUpdated: new Date().toISOString()
            },
            yearlyConfig: tempData.yearlyConfig
        };
        
        const newHistory = [...history, finalData];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        setHistory(newHistory);
        setData(finalData);
        try {
            setSyncingMajors(true);
            await syncMajorsToBackendCatalog(finalData);
            await syncMajorSelectionStartYear(finalData);
            setIsEditMode(false);
            setTempData(null);
            if (onChange) onChange(finalData);
            // Dispatch custom event to notify other components (e.g., AdminDashboard)
            window.dispatchEvent(new CustomEvent("registrationConfigUpdated"));
            alert("Configuration saved, major class catalog synced, and major selection year updated.");
        } catch (syncError) {
            console.error("Failed to sync major class catalog:", syncError);
            alert(`Configuration saved locally, but failed to sync major settings: ${syncError?.message || "Unknown error"}`);
        } finally {
            setSyncingMajors(false);
        }
    };

    const displayData = isEditMode ? tempData : data;

    // Helper to check if a field has been modified compared to the version being edited
    // Determine the base version once for all rows to improve performance
    const baseVersion = isEditMode && tempData ? history.find(c => c.header.id === tempData.header.id) : null;

    const isModified = () => {
        if (!isEditMode || !tempData || !baseVersion) return false;
        return JSON.stringify(tempData.header) !== JSON.stringify(baseVersion.header) || 
               JSON.stringify(tempData.yearlyConfig) !== JSON.stringify(baseVersion.yearlyConfig);
    };

    const isHeaderModified = (key) => {
        if (!isEditMode || !tempData || !baseVersion) return false;
        return tempData.header[key] !== baseVersion.header[key];
    };

    const isYearModified = (yearLevel) => {
        if (!isEditMode || !tempData || !baseVersion) return false;
        return !baseVersion.yearlyConfig.some(y => y.yearLevel === yearLevel);
    };

    const isMajorModified = (yearLevel) => {
        if (!isEditMode || !tempData || !baseVersion) return false;
        const current = tempData.yearlyConfig.find(y => y.yearLevel === yearLevel);
        const original = baseVersion.yearlyConfig.find(y => y.yearLevel === yearLevel);
        if (!current || !original) return true;
        return JSON.stringify(original.majors) !== JSON.stringify(current.majors);
    };

    const isFeeModified = (yearLevel) => {
        if (!isEditMode || !tempData || !baseVersion) return false;
        const current = tempData.yearlyConfig.find(y => y.yearLevel === yearLevel);
        const original = baseVersion.yearlyConfig.find(y => y.yearLevel === yearLevel);
        if (!current || !original) return true;
        return original.fee !== current.fee;
    };

    return (
        <div className="form-container">
            {/* Header */}
            <div className="form-header">
                <div className="header-info-group">
                    <h2>Form Data Manager</h2>
                    <div className="header-sub-info">
                        {isEditMode ? (
                            <div className="id-selector-container">
                                <span className="id-label">Editing Reg ID:</span>
                                <select 
                                    className="id-dropdown"
                                    value={tempData.header.id}
                                    onChange={handleHistorySelect}
                                >
                                    {history.map(item => (
                                        <option key={item.header.id} value={item.header.id}>
                                            #{item.header.id} {item.header.lastUpdated ? `(${new Date(item.header.lastUpdated).toLocaleDateString()})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <span className="id-badge">Register ID: #{displayData.header.id}</span>
                        )}
                        
                        {displayData.header.lastUpdated && (
                            <span className="last-saved">
                                🕒 Last Saved: {new Date(displayData.header.lastUpdated).toLocaleString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit', 
                                    minute: '2-digit'
                                })}
                            </span>
                        )}
                    </div>
                </div>
                <button 
                    onClick={handleEditToggle}
                    className={`btn-edit ${isEditMode ? "danger" : ""}`}
                >
                    {isEditMode ? "✖ Cancel Editing" : "✎ Edit Settings"}
                </button>
            </div>

            {/* Config Fields */}
            <div className="config-grid">
                <div className={`input-box ${isEditMode ? "editing" : ""} ${isHeaderModified('totalYears') ? "modified" : ""}`}>
                    <span className="input-label">Number of Years</span>
                    {isEditMode ? (
                        <input 
                            type="number" 
                            className="value-input"
                            value={displayData.header.totalYears} 
                            onChange={handleNoOfYearsChange}
                            onFocus={(e) => e.target.select()}
                        />
                    ) : (
                        <span className="value-input">{displayData.header.totalYears} Years</span>
                    )}
                </div>
                <div className={`input-box ${isEditMode ? "editing" : ""} ${isHeaderModified('baseFee') ? "modified" : ""}`}>
                    <span className="input-label"> Payment Amount For All Student </span>
                    {isEditMode ? (
                        <input 
                            type="number" 
                            className="value-input"
                            value={displayData.header.baseFee} 
                            onChange={handleAllPaymentChange}
                            onFocus={(e) => e.target.select()}
                        />
                    ) : (
                        <span className="value-input">{displayData.header.baseFee.toLocaleString()} MMK</span>
                    )}
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
                <table className="form-table">
                    <thead>
                        <tr>
                            <th>Academic Year</th>
                            <th>Available Majors</th>
                            <th>Fee Structure</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.yearlyConfig.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ textAlign: "center", padding: "40px", color: "#718096" }}>
                                    No years configured yet.
                                </td>
                            </tr>
                        )}
                        {displayData.yearlyConfig.map((y) => (
                            <tr key={y.yearLevel}>
                                <td style={{ fontWeight: "600", color: "#667eea" }}>
                                    <div className={`year-label ${isYearModified(y.yearLevel) ? "modified" : ""}`}>
                                        Year {y.yearLevel}
                                    </div>
                                </td>
                                <td>
                                    {isEditMode ? (
                                        <div className={`edit-cell ${isMajorModified(y.yearLevel) ? "modified" : ""}`}>
                                            <OptionsEditorC 
                                                optionsString={y.majors.join(",")} 
                                                onOptionsChange={(val) => handleMajorsChange(y.yearLevel, val)}
                                                title={y.majors.join(", ") || "Click to add majors..."}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                            {y.majors.length > 0 ? y.majors.map((m, mi) => (
                                                <span key={mi} style={{ background: "#f7fafc", padding: "4px 10px", borderRadius: "6px", fontSize: "13px" }}>{m}</span>
                                            )) : <span style={{ color: "#718096", fontStyle: "italic" }}>No majors choose</span>}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    {isEditMode ? (
                                        <div className={`edit-cell fee-input-wrapper ${isFeeModified(y.yearLevel) ? "modified" : ""}`}>
                                            <input 
                                                type="number" 
                                                value={y.fee} 
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => handleYearPaymentChange(y.yearLevel, e.target.value)}
                                                className="fee-input"
                                            />
                                            <span style={{ fontSize: "12px", color: "#718096" }}>MMK</span>
                                        </div>
                                    ) : (
                                        <span style={{ fontWeight: "600" }}>{y.fee.toLocaleString()} MMK</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Save Button */}
            {isEditMode && (
                <button
                    onClick={handleSave}
                    className={`save-btn ${isModified() ? "pulse-active" : ""}`}
                    disabled={syncingMajors}
                >
                    {syncingMajors
                        ? "Syncing major catalog..."
                        : (isModified()
                            ? `Save as New Register ID (#${history.reduce((max, item) => Math.max(max, item.header.id), 0) + 1})`
                            : "Keep Current Register ID")}
                </button>
            )}
        </div>
    );
};

export default FormDataC;

