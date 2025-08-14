// Common utility functions

/**
 * Format phone number to international format
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if the number starts with '0'
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Check if the number starts with country code
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validatePhoneNumber(phoneNumber) {
  // Basic validation for Indonesian phone numbers
  const regex = /^(\+?62|0)[0-9]{9,13}$/;
  return regex.test(phoneNumber);
}

/**
 * Show loading indicator
 * @param {HTMLElement} button - Button element
 * @param {string} loadingText - Text to show while loading
 */
function showLoading(button, loadingText = 'Loading...') {
  const originalText = button.textContent;
  button.setAttribute('data-original-text', originalText);
  button.disabled = true;
  button.textContent = loadingText;
}

/**
 * Hide loading indicator
 * @param {HTMLElement} button - Button element
 */
function hideLoading(button) {
  const originalText = button.getAttribute('data-original-text');
  button.disabled = false;
  button.textContent = originalText;
}

/**
 * Show error message
 * @param {string} message - Error message to display
 * @param {HTMLElement} container - Container element for error message
 */
function showError(message, container) {
  container.textContent = message;
  container.classList.remove('hidden');
}

/**
 * Hide error message
 * @param {HTMLElement} container - Container element for error message
 */
function hideError(container) {
  container.textContent = '';
  container.classList.add('hidden');
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Get URL parameter by name
 * @param {string} name - Parameter name
 * @returns {string|null} Parameter value or null if not found
 */
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}