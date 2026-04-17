import React, { useState, useEffect } from "react";
import "./componentstyle/OptionsEditor_C.css";

const OptionsEditorC = ({ optionsString, onOptionsChange, title = "Edit List Options" }) => {
    const [options, setOptions] = useState([]);
    const [newOption, setNewOption] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    // Initialize options from the string prop
    useEffect(() => {
        if (optionsString) {
            // Split by comma and trim each option
            const parsedOptions = optionsString.split(",").filter(opt => opt.trim() !== "");
            setOptions(parsedOptions);
        } else {
            setOptions([]);
        }
    }, [optionsString]);

    const updateParent = (updatedOptions) => {
        // Join with comma for storage
        onOptionsChange(updatedOptions.join(","));
    };

    const handleAddOption = () => {
        if (newOption.trim()) {
            const updated = [...options, newOption.trim()];
            setOptions(updated);
            setNewOption("");
            updateParent(updated);
        }
    };

    const handleRemoveOption = (index) => {
        const updated = options.filter((_, i) => i !== index);
        setOptions(updated);
        updateParent(updated);
    };

    const handleEditOption = (index, value) => {
        const updated = [...options];
        updated[index] = value;
        setOptions(updated);
        updateParent(updated);
    };

    return ( 
        <div className="options-editor-container">
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className="options-editor-header"
            >
                <h4 className="options-editor-title">{title}</h4>
                <span className="options-editor-arrow" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ▼
                </span>
            </div>
            
            {isOpen && (
                <div className="options-list-container">
                    <div className="options-list">
                        {options.map((option, index) => (
                            <div key={index} className="option-item">
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleEditOption(index, e.target.value)}
                                    className="option-input"
                                />
                                <button 
                                    onClick={() => handleRemoveOption(index)}
                                    className="btn-remove"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        
                        {options.length === 0 && (
                            <p className="empty-options-text">
                                No options added yet.
                            </p>
                        )}
                    </div>

                    <div className="add-option-container">
                        <input
                            type="text"
                            placeholder="Type new option..."
                            value={newOption}
                            onChange={(e) => setNewOption(e.target.value)}
                            className="option-input"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                        />
                        <button 
                            onClick={handleAddOption}
                            className="btn-add"
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}
        </div>
    );       

}

export default OptionsEditorC;
