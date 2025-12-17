
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI on load
    toggleModeUI();
    updateResults();
}); 

const baseLabels = { 2: 'Binary', 8: 'Octal', 10: 'Decimal', 16: 'Hexadecimal' };
const targetConversions = [
    { id: 'resultBin', baseTo: 2, explainerId: 'explainerBin', name: 'Binary' },
    { id: 'resultOct', baseTo: 8, explainerId: 'explainerOct', name: 'Octal' },
    { id: 'resultDec', baseTo: 10, explainerId: 'explainerDec', name: 'Decimal' },
    { id: 'resultHex', baseTo: 16, explainerId: 'explainerHex', name: 'Hexadecimal' }
];
const hexMap = { 10: 'A', 11: 'B', 12: 'C', 13: 'D', 14: 'E', 15: 'F', 'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15 };


// --- UTILITY FUNCTIONS --- 

function zeroPad(str, width) {
    // Pad the string with leading zeros up to the required width
    const length = str.length;
    if (length >= width) return str;
    return '0'.repeat(width - length) + str;
} 

function getBitWidth() {
    const bitWidthElement = document.getElementById('bitWidthSelect');
    return bitWidthElement ? parseInt(bitWidthElement.value) : 8; // Default to 8-bit
} 

// --- UI MODE LOGIC --- 

function toggleModeUI() {
    const mode = document.getElementById('conversionMode').value;
    const optionsDiv = document.getElementById('modeOptions');
    optionsDiv.innerHTML = '';
    
    let html = '';
    const inputElement = document.getElementById('inputValue');
    
    // Adjust UI and input placeholder based on the selected mode
    if (mode === 'signed') {
        html = `
            <div class="input-row">
                <label for="bitWidthSelect">Bit Width (2's Comp.):</label>
                <select id="bitWidthSelect" class="base-select" onchange="updateResults()">
                    <option value="8">8-bit</option>
                    <option value="16">16-bit</option>
                    <option value="32">32-bit</option>
                    <option value="64">64-bit</option>
                </select>
            </div>
        `;
        inputElement.placeholder = 'e.g., -10 or 127 (Supports 64-bit)';
    } else if (mode === 'fixed') {
        inputElement.placeholder = 'e.g., 10.5 or 0.75';
    } else if (mode === 'float') {
        inputElement.placeholder = 'IEEE 754 (e.g., 10.5 or -0.5)';
    } else {
        inputElement.placeholder = 'e.g., 10 or 255';
    } 

    optionsDiv.innerHTML = html;
    updateResults(); // Re-calculate when mode changes to apply new rules
}


// --- VALIDATION FUNCTIONS --- 

function isValidInput(value, base, mode) {
    if (value === '') return true;
    
    // --- Unsigned / Signed Integers ---
    if (mode === 'unsigned' || mode === 'signed') {
        // Reject fractional part
        if (value.includes('.')) return false;
        // Allow negative sign only in signed mode
        if (value.includes('-') && mode === 'unsigned') return false; 

        const magnitude = value.replace('-', '');
        if (magnitude === '') return false; 

        // Check if digits are valid for the source base
        const allowedChars = {
            2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-fA-F]+$/
        };
        const regex = allowedChars[base];
        return regex ? regex.test(magnitude) : false;
    } 

    // --- Fixed / Floating Point (Allow sign and radix point) ---
    if (mode === 'fixed' || mode === 'float') {
        // Check digits including potential sign and radix point
        const allowedChars = {
            2: /^-?[01]+\.?[01]*$/,
            8: /^-?[0-7]+\.?[0-7]*$/,
            10: /^-?\d+\.?\d*$/,
            16: /^-?[0-9a-fA-F]+\.?[0-9a-fA-F]*$/
        };
        const regex = allowedChars[base];
        return regex ? regex.test(value) : false;
    }
    
    return true;
}


// --- CORE CONVERSION FUNCTIONS --- 

function convertBase(numberStr, fromBase, toBase, mode) {
    if (!isValidInput(numberStr, fromBase, mode) || numberStr === '') {
        return 'Invalid Value. Please Check.';
    } 

    if (mode === 'unsigned') {
        // Standard unsigned integer conversion
        const decimalValue = parseInt(numberStr, fromBase);
        let result = decimalValue.toString(toBase);
        return toBase === 16 ? result.toUpperCase() : result;
    }
    
    if (mode === 'signed') {
        return signedConversion(numberStr, fromBase, toBase);
    } 

    if (mode === 'fixed') {
        return fixedPointConversion(numberStr, fromBase, toBase);
    }
    
    if (mode === 'float') {
        return floatConversion(numberStr, fromBase, toBase);
    } 

    return 'Mode Error';
}


// --- SIGNED INTEGER (TWO'S COMPLEMENT) LOGIC ---
function signedConversion(numberStr, fromBase, toBase) {
    const bitWidth = getBitWidth();
    const useBigInt = bitWidth >= 53; // Use BigInt if bit width is 53 or more to preserve accuracy
    const Big = useBigInt ? BigInt : Number; 

    // Calculate boundary values
    const maxVal = Big(2) ** Big(bitWidth - 1) - Big(1);
    const minVal = -(Big(2) ** Big(bitWidth - 1)); 

    let decimalValue;
    
    // 1. Convert everything to Decimal (BigInt or Number)
    if (fromBase === 10) {
        try {
            decimalValue = Big(numberStr);
        } catch (e) {
            return "Number too large for BigInt (Decimal).";
        }
    } else if (fromBase === 2) {
        // Handle Two's Complement Binary input
        if (numberStr.length > bitWidth) {
            return `Binary length exceeds ${bitWidth} bits.`;
        }
        
        const signBit = Big(numberStr[0]);
        if (signBit === Big(0)) {
            // Positive
            decimalValue = Big('0b' + numberStr);
        } else {
            // Negative (Two's Complement)
            const paddedBinary = zeroPad(numberStr, bitWidth);
            const inverted = paddedBinary.split('').map(b => b === '0' ? '1' : '0').join('');
            decimalValue = -(Big('0b' + inverted) + Big(1));
        }
    } else {
        // Octal/Hex input (Treated as magnitude for simplicity if positive)
        try {
            // Use standard BigInt parsing for base 8 or 16
            decimalValue = Big('0' + fromBase.toString(16) + numberStr.toUpperCase());
        } catch (e) {
            return "Input value error.";
        }
        
        // Check for positive magnitude overflow
        if (decimalValue > maxVal) {
             return `Magnitude too large for ${bitWidth}-bit signed integer.`;
        }
    } 

    // Check bounds
    if (decimalValue > maxVal || decimalValue < minVal) {
        return `Out of range for ${bitWidth}-bit: [${minVal.toString()} to ${maxVal.toString()}]`;
    } 

    // 2. Convert Decimal to Target Base
    if (toBase === 10) return decimalValue.toString();
    
    if (decimalValue >= Big(0)) {
        // Positive conversion (standard)
        let result = decimalValue.toString(toBase);
        if (toBase === 2) result = zeroPad(result, bitWidth);
        return toBase === 16 ? result.toUpperCase() : result;
    } else {
        // Negative conversion (Two's Complement for Binary)
        if (toBase === 2) {
            const absDecimal = -decimalValue;
            let positiveBinary = absDecimal.toString(2);
            positiveBinary = zeroPad(positiveBinary, bitWidth); 

            // 1. Invert bits (One's Complement)
            let inverted = positiveBinary.split('').map(b => b === '0' ? '1' : '0').join('');
            
            // 2. Add 1 (Two's Complement)
            let twoselement = (Big('0b' + inverted) + Big(1)).toString(2);
            twoselement = zeroPad(twoselement, bitWidth); 
            
            return twoselement;
        } else {
            // Negative conversion to Octal/Hex (prefix sign)
            let magnitude = (-decimalValue).toString(toBase);
            return '-' + magnitude.toUpperCase();
        }
    }
}


// --- FIXED-POINT LOGIC ---
function fixedPointConversion(numberStr, fromBase, toBase) {
    if (toBase === 10) return parseFloat(numberStr).toFixed(12); 

    let parts = numberStr.split('.');
    const integerPartStr = parts[0] || '0';
    const fractionalPartStr = parts[1] || '0';
    
    // Part 1: Convert Integer (Standard conversion)
    const integerDecimal = parseInt(integerPartStr, fromBase);
    let integerResult = integerDecimal.toString(toBase).toUpperCase(); 

    // Part 2: Convert Fractional Part (Convert to Decimal, then multiply/extract)
    let fractionalDecimal = 0;
    if (fractionalPartStr.length > 0) {
        if (fromBase === 10) {
            fractionalDecimal = parseFloat('0.' + fractionalPartStr);
        } else {
            let sum = 0;
            const digits = fractionalPartStr.toUpperCase().split('');
            for (let i = 0; i < digits.length; i++) {
                let digitValue = parseInt(digits[i], fromBase);
                if (fromBase === 16 && isNaN(digitValue)) digitValue = hexMap[digits[i]];
                sum += digitValue * Math.pow(fromBase, -(i + 1));
            }
            fractionalDecimal = sum;
        }
    }
    
    let fractionalResult = '';
    let tempFractional = fractionalDecimal;
    const maxPrecision = 12; // Limit precision for display
    
    // Multiplication/Extraction Loop
    for (let i = 0; i < maxPrecision && tempFractional > 0.000000000001; i++) {
        tempFractional *= toBase;
        let integerPart = Math.floor(tempFractional);
        
        let digitDisplay = integerPart;
        if (toBase === 16 && integerPart >= 10) digitDisplay = hexMap[integerPart]; 

        fractionalResult += digitDisplay.toString();
        tempFractional -= integerPart;
    } 

    if (fractionalResult === '') fractionalResult = '0';
    
    return integerResult + '.' + fractionalResult;
}


// --- FLOATING-POINT LOGIC (Placeholder for simplicity) ---
function floatConversion(numberStr, fromBase, toBase) {
    if (fromBase !== 10) return 'Input must be Base 10 for Float Mode.';
    
    const decimalValue = parseFloat(numberStr);
    if (isNaN(decimalValue)) return 'Invalid Float Value.'; 

    if (toBase === 10) return decimalValue.toPrecision(7); 

    // --- Structured representation placeholder (IEEE 754 concepts) ---
    
    if (toBase === 2) {
        // Simple Binary (32-bit concept)
        // 
        return `Sign: ${decimalValue < 0 ? 1 : 0} (Binary Representation Requires full IEEE 754 logic)`;
    } 

    if (toBase === 16) {
        let hex = Math.abs(decimalValue).toString(16).toUpperCase();
        return `(Float) ${hex} (Requires IEEE 754)`;
    }
    
    return decimalValue.toString(toBase).toUpperCase();
}


// --- EXPLANATION GENERATION FUNCTIONS --- 

function generateExplanation(numberStr, fromBase, toBase, mode) {
    if (!isValidInput(numberStr, fromBase, mode) || numberStr === '') {
        return "Please enter a valid value for the selected conversion mode.";
    }
    
    const value = numberStr;
    const bitWidth = getBitWidth();
    const Big = bitWidth >= 53 ? BigInt : Number;
    
    if (mode === 'float') {
        return `
--- Mode: Floating-Point (IEEE 754) ---
The conversion of floating-point numbers requires adherence to the complex IEEE 754 standard (32-bit or 64-bit). 

Steps involve:
1. Determine Sign Bit (1 bit).
2. Normalizing the magnitude to $1.M \times 2^E$.
3. Calculating the Biased Exponent (8 or 11 bits).
4. Storing the Mantissa (M, 23 or 52 bits). 

This process is not suitable for a simple step-by-step mathematical explanation.
Result displayed is a structured interpretation based on the IEEE 754 concept.
        `;
    } 

    if (mode === 'fixed') {
        let parts = value.split('.');
        const integerPartStr = parts[0] || '0';
        const fractionalPartStr = parts[1] || '0';
        
        let explanation = `--- Step 1: Integer Part Conversion (Positional Notation) ---\n`;
        explanation += `Convert integer part (${integerPartStr}) using standard division/remainder.\n`;
        
        explanation += `\n--- Step 2: Fractional Part Conversion (Multiplication/Extraction) ---\n`;
        explanation += `The fractional part ($0.${fractionalPartStr}$) is converted using repeated multiplication by the target base ($${toBase}$):\n`;
        
        let fractionalDecimal = (fromBase === 10) ? parseFloat('0.' + fractionalPartStr) : 0.0;
        let tempFractional = fractionalDecimal;
        const maxPrecision = 5; 
        
        for (let i = 0; i < maxPrecision && tempFractional > 0.0001; i++) {
            tempFractional *= toBase;
            let integerPart = Math.floor(tempFractional);
            tempFractional -= integerPart;
            explanation += `\n$0. \dots \times ${toBase}$: New Integer Digit is ${integerPart} (Remainder: ${tempFractional.toFixed(5)})`;
        }
        explanation += `\n... Read integer digits downwards to get the fractional result.`;
        return explanation;
    } 

    if (mode === 'signed') {
        const decimalValue = Big(value); // Assume input is decimal for clear explanation
        
        if (toBase !== 2) {
             return `--- Signed Integer: Non-Binary Target ---\nThe decimal value (${decimalValue.toString()}) is converted to the target base based on its positive magnitude, and then prefixed with a minus sign ($ - $). Binary conversion requires Two's Complement logic.`;
        }
        
        // Two's Complement explanation (for binary target)
        if (decimalValue >= Big(0)) {
            return `--- Signed Integer: Positive Value ---\nSame steps as Unsigned Integer mode. Converted value is padded to ${bitWidth} bits.`;
        } else {
            let magnitude = -decimalValue;
            let positiveBinary = magnitude.toString(2);
            positiveBinary = zeroPad(positiveBinary, bitWidth); 

            let inverted = positiveBinary.split('').map(b => b === '0' ? '1' : '0').join('');
            let twoselement = (Big('0b' + inverted) + Big(1)).toString(2);
            
            return `
--- Signed Integer: Negative Value (Two's Complement) ---
Bit Width: ${bitWidth} bits 

1. Convert Magnitude to Binary:
   Positive magnitude (${magnitude.toString()}) in Binary: ${positiveBinary} 

2. One's Complement (Invert all bits):
   Inverted: ${inverted} 

3. Two's Complement (Add 1):
   Result: ${twoselement} (Final Result)
`;
        }
    }
    
    // --- Unsigned Integer Logic (Default) ---
    
    let explanation = `--- Step 1: Convert from Base ${fromBase} to Decimal (Base 10) ---\n`;
    let decimalValue = 0;
    const digits = numberStr.toUpperCase().split('');
    
    for (let i = 0; i < digits.length; i++) {
        const char = digits[digits.length - 1 - i];
        let digitValue = parseInt(char, 10);
        if (fromBase === 16 && isNaN(digitValue)) digitValue = hexMap[char];
        const power = i;
        const basePower = Math.pow(fromBase, power);
        const term = digitValue * basePower;
        decimalValue += term;
        explanation += `\n(${digitValue} * ${fromBase}^${power} [${basePower}]) = ${term}`;
    }
    
    explanation += `\n\nTotal Decimal Value: ${decimalValue}`;
    explanation += `\n\n--- Step 2: Convert from Decimal (${decimalValue}) to Base ${toBase} (${baseLabels[toBase]}) ---\n`;
    
    if (toBase === 10) return explanation += `\nConversion not necessary. Result is ${decimalValue}.`; 

    let tempDecimal = decimalValue;
    let targetDigits = [];
    
    if (tempDecimal === 0) targetDigits.push('0');
    
    while (tempDecimal > 0) {
        const remainder = tempDecimal % toBase;
        let digitDisplay = remainder;
        if (toBase === 16 && remainder >= 10) digitDisplay = hexMap[remainder];
        
        targetDigits.unshift(digitDisplay);
        explanation += `\n${tempDecimal} / ${toBase} = ${Math.floor(tempDecimal / toBase)} Remainder: ${digitDisplay}`;
        tempDecimal = Math.floor(tempDecimal / toBase);
    }
    
    const finalResult = targetDigits.join('');
    explanation += `\n\nFinal Result in Base ${toBase}: ${finalResult}`;
    
    return explanation;
}


// --- MAIN CONTROLLER & UTILITY --- 

function updateResults() {
    const inputElement = document.getElementById('inputValue');
    const baseFromElement = document.getElementById('baseFrom');
    const modeElement = document.getElementById('conversionMode');
    
    const value = inputElement.value.trim();
    const baseFrom = parseInt(baseFromElement.value);
    const mode = modeElement.value;
    
    for (const { id, baseTo, explainerId, name } of targetConversions) {
        const result = convertBase(value, baseFrom, baseTo, mode);
        document.getElementById(id).textContent = result;
        
        const explanationText = generateExplanation(value, baseFrom, baseTo, mode);
        document.querySelector(`#${explainerId} .explanation-text`).textContent = explanationText;
        
        // Collapse all explainers when the input changes
        const explainer = document.getElementById(explainerId);
        if (explainer.classList.contains('expanded')) {
            explainer.classList.remove('expanded');
            explainer.previousElementSibling.querySelector('.expand-btn').textContent = 'Expand Explanation >';
        }
    }
}


function toggleExplanation(explainerId) {
    const explainer = document.getElementById(explainerId);
    const button = explainer.previousElementSibling.querySelector('.expand-btn'); 

    explainer.classList.toggle('expanded');
    
    if (explainer.classList.contains('expanded')) {
        button.textContent = 'Collapse Explanation <';
    } else {
        button.textContent = 'Expand Explanation >';
    }
}


async function copyResult(elementId, baseName) {
    const outputSpan = document.getElementById(elementId);
    const textToCopy = outputSpan.textContent;
    const notification = document.getElementById('copyNotification'); 

    if (!textToCopy || textToCopy.includes('Invalid') || textToCopy.includes('Error')) {
        notification.textContent = 'Cannot copy invalid value.';
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 1500);
        return;
    } 

    try {
        await navigator.clipboard.writeText(textToCopy);
        notification.textContent = `Copied ${baseName} Value: ${textToCopy}`;
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 1800); 

    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Copy failed. Please copy manually.');
    }
}
