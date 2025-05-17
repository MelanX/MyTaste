/**
 * Utility functions for formatting values in the application
 */

/**
 * Formats a numeric amount to a human-readable string
 * 
 * This function handles several specialized cases:
 * - Returns an empty string for undefined values or zero amounts
 * - Converts decimal fractions to their Unicode fraction characters where appropriate
 *   (e.g., 0.25 becomes "¼")
 * - Formats mixed numbers (e.g., 1.5 becomes "1½")
 * - Formats all other numbers with comma as decimal separator (European format)
 * 
 * Supported fractions:
 * - ⅕ (one-fifth) = 0.2
 * - ¼ (one-quarter) = 0.25
 * - ⅖ (two-fifths) = 0.4
 * - ½ (one-half) = 0.5
 * - ⅗ (three-fifths) = 0.6
 * - ⅘ (four-fifths) = 0.8
 * 
 * Mixed numbers like 1.5 will be formatted as "1½"
 * 
 * @param amount - The numeric value to format
 * @returns The formatted string representation of the amount
 */
export const formatAmount = (amount: number | string | undefined): string => {
    if (amount === undefined) return '';
    
    // Convert to number and ensure a decimal point is used
    amount = parseFloat(String(amount).replace(',', '.'));
    
    // Special case for zero
    if (amount === 0) return '';
    
    // Extract the whole number and fractional part
    const wholeNumber = Math.floor(amount);
    const fraction = Number((amount - wholeNumber).toFixed(2));

    // Map of common fractions to Unicode fraction characters
    const fractionMap: Record<number, string> = {
        0.2: '⅕',
        0.25: '¼',
        0.4: '⅖',
        0.5: '½',
        0.6: '⅗',
        0.75: '¾',
        0.8: '⅘'
    };
    
    // Handle simple fractions (no whole number part)
    if (wholeNumber === 0 && fraction in fractionMap) {
        return fractionMap[fraction];
    }
    
    // Handle mixed numbers (whole + fraction)
    if (wholeNumber > 0 && fraction in fractionMap) {
        return `${wholeNumber} ${fractionMap[fraction]}`;
    }

    // Standard case: convert to string with comma as decimal separator
    return String(amount).replace('.', ',');
};
