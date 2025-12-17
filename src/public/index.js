/* © Ashok-777 */
/* GitHub: https://github.com/Ashok-777 */
// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI on load
    toggleModeUI();
    updateResults();
});

// --- CONSTANTS ---
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
    const length = str.length;
    if (length >= width) return str;
    return '0'.repeat(width - length) + str;
}

function getBitWidth() {
    const bitWidthElement = document.getElementById('bitWidthSelect');
    return bitWidthElement ? parseInt(bitWidthElement.value) : 8; // Default 8-bit
}

// --- UI MODE LOGIC ---
function toggleModeUI() {
    const mode = document.getElementById('conversionMode').value;
    const optionsDiv = document.getElementById('modeOptions');
    optionsDiv.innerHTML = '';

    const inputElement = document.getElementById('inputValue');
    let html = '';

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
    updateResults();
}

// --- VALIDATION FUNCTIONS ---
function isValidInput(value, base, mode) {
    if (value === '') return true;

    if (mode === 'unsigned' || mode === 'signed') {
        if (value.includes('.')) return false;
        if (value.includes('-') && mode === 'unsigned') return false;
        const magnitude = value.replace('-', '');
        if (magnitude === '') return false;
        const allowedChars = {
            2: /^[01]+$/,
            8: /^[0-7]+$/,
            10: /^\d+$/,
            16: /^[0-9a-fA-F]+$/
        };
        const regex = allowedChars[base];
        return regex ? regex.test(magnitude) : false;
    }

    if (mode === 'fixed' || mode === 'float') {
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

// --- CORE CONVERSION ---
function convertBase(numberStr, fromBase, toBase, mode) {
    if (!isValidInput(numberStr, fromBase, mode) || numberStr === '') {
        return 'Invalid Value. Please Check.';
    }

    if (mode === 'unsigned') {
        const decimalValue = parseInt(numberStr, fromBase);
        let result = decimalValue.toString(toBase);
        return toBase === 16 ? result.toUpperCase() : result;
    }

    if (mode === 'signed') return signedConversion(numberStr, fromBase, toBase);
    if (mode === 'fixed') return fixedPointConversion(numberStr, fromBase, toBase);
    if (mode === 'float') return floatConversion(numberStr, fromBase, toBase);

    return 'Mode Error';
}

// --- SIGNED INTEGER (TWO'S COMPLEMENT) ---
function signedConversion(numberStr, fromBase, toBase) {
    const bitWidth = getBitWidth();
    const useBigInt = bitWidth >= 53;
    const Big = useBigInt ? BigInt : Number;

    const maxVal = Big(2) ** Big(bitWidth - 1) - Big(1);
    const minVal = -(Big(2) ** Big(bitWidth - 1));

    let decimalValue;

    if (fromBase === 10) {
        try { decimalValue = Big(numberStr); } 
        catch (e) { return "Number too large for BigInt (Decimal)."; }
    } else if (fromBase === 2) {
        if (numberStr.length > bitWidth) return `Binary length exceeds ${bitWidth} bits.`;
        const signBit = Big(numberStr[0]);
        if (signBit === Big(0)) decimalValue = Big('0b' + numberStr);
        else {
            const paddedBinary = zeroPad(numberStr, bitWidth);
            const inverted = paddedBinary.split('').map(b => b === '0' ? '1' : '0').join('');
            decimalValue = -(Big('0b' + inverted) + Big(1));
        }
    } else {
        try { decimalValue = Big('0' + fromBase.toString(16) + numberStr.toUpperCase()); }
        catch (e) { return "Input value error."; }
        if (decimalValue > maxVal) return `Magnitude too large for ${bitWidth}-bit signed integer.`;
    }

    if (decimalValue > maxVal || decimalValue < minVal)
        return `Out of range for ${bitWidth}-bit: [${minVal.toString()} to ${maxVal.toString()}]`;

    if (toBase === 10) return decimalValue.toString();

    if (decimalValue >= Big(0)) {
        let result = decimalValue.toString(toBase);
        if (toBase === 2) result = zeroPad(result, bitWidth);
        return toBase === 16 ? result.toUpperCase() : result;
    } else {
        if (toBase === 2) {
            const absDecimal = -decimalValue;
            let positiveBinary = absDecimal.toString(2);
            positiveBinary = zeroPad(positiveBinary, bitWidth);
            let inverted = positiveBinary.split('').map(b => b === '0' ? '1' : '0').join('');
            let twoselement = (Big('0b' + inverted) + Big(1)).toString(2);
            twoselement = zeroPad(twoselement, bitWidth);
            return twoselement;
        } else {
            return '-' + (-decimalValue).toString(toBase).toUpperCase();
        }
    }
}

// --- FIXED-POINT ---
function fixedPointConversion(numberStr, fromBase, toBase) {
    if (toBase === 10) return parseFloat(numberStr).toFixed(12);

    const parts = numberStr.split('.');
    const integerPartStr = parts[0] || '0';
    const fractionalPartStr = parts[1] || '0';

    const integerDecimal = parseInt(integerPartStr, fromBase);
    let integerResult = integerDecimal.toString(toBase).toUpperCase();

    let fractionalDecimal = 0;
    if (fractionalPartStr.length > 0) {
        if (fromBase === 10) fractionalDecimal = parseFloat('0.' + fractionalPartStr);
        else {
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
    const maxPrecision = 12;
    for (let i = 0; i < maxPrecision && tempFractional > 1e-12; i++) {
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

// --- FLOATING-POINT (Placeholder) ---
function floatConversion(numberStr, fromBase, toBase) {
    if (fromBase !== 10) return 'Input must be Base 10 for Float Mode.';
    const decimalValue = parseFloat(numberStr);
    if (isNaN(decimalValue)) return 'Invalid Float Value.';
    if (toBase === 10) return decimalValue.toPrecision(7);
    if (toBase === 2) return `Sign: ${decimalValue < 0 ? 1 : 0} (Binary Representation Requires full IEEE 754 logic)`;
    if (toBase === 16) return `(Float) ${Math.abs(decimalValue).toString(16).toUpperCase()} (Requires IEEE 754)`;
    return decimalValue.toString(toBase).toUpperCase();
}

// --- EXPLANATION GENERATION ---
function generateExplanation(numberStr, fromBase, toBase, mode) {
    if (!isValidInput(numberStr, fromBase, mode) || numberStr === '')
        return "Please enter a valid value for the selected conversion mode.";

    const value = numberStr;
    const bitWidth = getBitWidth();
    const Big = bitWidth >= 53 ? BigInt : Number;

    if (mode === 'float') {
        return `
--- Mode: Floating-Point (IEEE 754) ---
Conversion requires IEEE 754 standard steps:
1. Determine Sign Bit.
2. Normalize magnitude.
3. Calculate Biased Exponent.
4. Store Mantissa.
Result displayed is simplified.
        `;
    }

    if (mode === 'fixed') {
        const parts = value.split('.');
        const integerPartStr = parts[0] || '0';
        const fractionalPartStr = parts[1] || '0';

        let explanation = `--- Integer Part ---\nConvert (${integerPartStr}) using division/remainder.\n`;
        explanation += `--- Fractional Part ---\nConvert fractional (${fractionalPartStr}) using repeated multiplication:\n`;

        let fractionalDecimal = fromBase === 10 ? parseFloat('0.' + fractionalPartStr) : 0;
        let tempFractional = fractionalDecimal;
        const maxPrecision = 5;
        for (let i = 0; i < maxPrecision && tempFractional > 0.0001; i++) {
            tempFractional *= toBase;
            const integerPart = Math.floor(tempFractional);
            tempFractional -= integerPart;
            explanation += `Step ${i + 1}: Integer digit = ${integerPart}, Remainder = ${tempFractional.toFixed(5)}\n`;
        }
        return explanation;
    }

    if (mode === 'signed') {
        const decimalValue = Big(value);
        if (toBase !== 2) {
            return `--- Signed Integer: Non-Binary Target ---\nDecimal (${decimalValue}) converted with sign prefix.`;
        }
        if (decimalValue >= Big(0)) {
            return `--- Signed Integer: Positive Value ---\nConverted value padded to ${bitWidth} bits.`;
        } else {
            const magnitude = -decimalValue;
            let positiveBinary = magnitude.toString(2);
            positiveBinary = zeroPad(positiveBinary, bitWidth);
            let inverted = positiveBinary.split('').map(b => b === '0' ? '1' : '0').join('');
            let twoselement = (Big('0b' + inverted) + Big(1)).toString(2);
            return `
--- Signed Integer: Negative Value (Two's Complement) ---
Bit Width: ${bitWidth} bits
1. Magnitude to Binary: ${positiveBinary}
2. One's Complement: ${inverted}
3. Two's Complement: ${twoselement} (Final Result)
`;
        }
    }

    // Unsigned integer default explanation
    let explanation = `--- Convert from Base ${fromBase} to Decimal ---\n`;
    let decimalValue = 0;
    const digits = numberStr.toUpperCase().split('');
    for (let i = 0; i < digits.length; i++) {
        const char = digits[digits.length - 1 - i];
        let digitValue = parseInt(char, 10);
        if (fromBase === 16 && isNaN(digitValue)) digitValue = hexMap[char];
        const power = i;
        const term = digitValue * Math.pow(fromBase, power);
        decimalValue += term;
        explanation += `(${digitValue} * ${fromBase}^${power}) = ${term}\n`;
    }
    explanation += `Total Decimal Value: ${decimalValue}\n--- Convert to Base ${toBase} ---\n`;

    let tempDecimal = decimalValue;
    const targetDigits = [];
    if (tempDecimal === 0) targetDigits.push('0');
    while (tempDecimal > 0) {
        const remainder = tempDecimal % toBase;
        let digitDisplay = remainder;
        if (toBase === 16 && remainder >= 10) digitDisplay = hexMap[remainder];
        targetDigits.unshift(digitDisplay);
        tempDecimal = Math.floor(tempDecimal / toBase);
    }
    explanation += `Final Result in Base ${toBase}: ${targetDigits.join('')}`;
    return explanation;
}

// --- MAIN CONTROLLER ---
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
        const explainerText = document.querySelector(`#${explainerId} .explanation-text`);
        if (explainerText) explainerText.textContent = explanationText;

        const explainer = document.getElementById(explainerId);
        if (explainer && explainer.classList.contains('expanded')) {
            explainer.classList.remove('expanded');
            const btn = explainer.previousElementSibling.querySelector('.expand-btn');
            if (btn) btn.textContent = 'Expand Explanation >';
        }
    }
}

function toggleExplanation(explainerId) {
    const explainer = document.getElementById(explainerId);
    if (!explainer) return;
    const button = explainer.previousElementSibling.querySelector('.expand-btn');

    explainer.classList.toggle('expanded');
    if (explainer.classList.contains('expanded')) button.textContent = 'Collapse Explanation <';
    else button.textContent = 'Expand Explanation >';
}

// --- COPY FUNCTION ---
async function copyResult(elementId, baseName) {
    const outputSpan = document.getElementById(elementId);
    if (!outputSpan) return;

    const textToCopy = outputSpan.textContent.trim();
    const notification = document.getElementById('copyNotification');

    if (!textToCopy || textToCopy.includes('Invalid') || textToCopy.includes('Error')) {
        if (notification) {
            notification.textContent = 'Cannot copy invalid value.';
            notification.classList.add('show');
            setTimeout(() => notification.classList.remove('show'), 1500);
        } else {
            alert('Cannot copy invalid value.');
        }
        return;
    }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textToCopy);
            if (notification) {
                notification.textContent = `Copied ${baseName} value: ${textToCopy}`;
                notification.classList.add('show');
                setTimeout(() => notification.classList.remove('show'), 1800);
            }
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            document.body.appendChild(textarea);
            textarea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (!successful) throw new Error('Fallback copy failed');
            if (notification) {
                notification.textContent = `Copied ${baseName} value: ${textToCopy}`;
                notification.classList.add('show');
                setTimeout(() => notification.classList.remove('show'), 1800);
            }
        }
    } catch (err) {
        console.error('Copy failed:', err);
        alert('Copy failed. Please copy manually.');
    }
          }
/* © Ashok-777 */
/* GitHub: https://github.com/Ashok-777 */
