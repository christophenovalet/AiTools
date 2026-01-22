/**
 * Client-Side Encryption Utilities
 * Uses Web Crypto API for zero-knowledge encryption of sensitive data
 * API keys are encrypted before sending to server
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100000;

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive encryption key from user's email using PBKDF2
 */
async function deriveKey(email, salt) {
  const encoder = new TextEncoder();

  // Import key material from email
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(email),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 * @param {string} plaintext - Data to encrypt
 * @param {string} userEmail - User's email (used as passphrase)
 * @returns {Object} - { encrypted, salt, iv } - Base64 encoded
 */
export async function encryptData(plaintext, userEmail) {
  const encoder = new TextEncoder();

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive encryption key from user's email
  const key = await deriveKey(userEmail, salt);

  // Encrypt plaintext
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Return as base64 strings
  return {
    encrypted: arrayBufferToBase64(encrypted),
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypt data using AES-GCM
 * @param {Object} encryptedData - { encrypted, salt, iv } - Base64 encoded
 * @param {string} userEmail - User's email (used as passphrase)
 * @returns {string} - Decrypted plaintext
 */
export async function decryptData(encryptedData, userEmail) {
  // Derive encryption key from user's email
  const key = await deriveKey(
    userEmail,
    base64ToArrayBuffer(encryptedData.salt)
  );

  // Decrypt ciphertext
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: base64ToArrayBuffer(encryptedData.iv) },
    key,
    base64ToArrayBuffer(encryptedData.encrypted)
  );

  // Convert back to string
  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypt API key specifically
 * @param {string} apiKey - Claude API key
 * @param {string} userEmail - User's email
 * @returns {Object} - Encrypted data with metadata
 */
export async function encryptApiKey(apiKey, userEmail) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  if (!userEmail) {
    throw new Error('User email is required for encryption');
  }

  return encryptData(apiKey, userEmail);
}

/**
 * Decrypt API key specifically
 * @param {Object} encryptedData - Encrypted API key data
 * @param {string} userEmail - User's email
 * @returns {string} - Decrypted API key
 */
export async function decryptApiKey(encryptedData, userEmail) {
  if (!encryptedData || !encryptedData.encrypted) {
    throw new Error('Invalid encrypted data');
  }

  if (!userEmail) {
    throw new Error('User email is required for decryption');
  }

  return decryptData(encryptedData, userEmail);
}

/**
 * Check if data is encrypted (has required fields)
 */
export function isEncrypted(data) {
  return (
    data &&
    typeof data === 'object' &&
    'encrypted' in data &&
    'salt' in data &&
    'iv' in data
  );
}

/**
 * Encrypt multiple key-value pairs
 * @param {Object} data - Object with keys to encrypt
 * @param {string} userEmail - User's email
 * @returns {Object} - Object with encrypted values
 */
export async function encryptObject(data, userEmail) {
  const encrypted = {};

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'string') {
      encrypted[key] = await encryptData(value, userEmail);
    } else {
      encrypted[key] = value;
    }
  }

  return encrypted;
}

/**
 * Decrypt multiple key-value pairs
 * @param {Object} encryptedData - Object with encrypted values
 * @param {string} userEmail - User's email
 * @returns {Object} - Object with decrypted values
 */
export async function decryptObject(encryptedData, userEmail) {
  const decrypted = {};

  for (const [key, value] of Object.entries(encryptedData)) {
    if (isEncrypted(value)) {
      try {
        decrypted[key] = await decryptData(value, userEmail);
      } catch (err) {
        console.error(`Failed to decrypt ${key}:`, err);
        decrypted[key] = null;
      }
    } else {
      decrypted[key] = value;
    }
  }

  return decrypted;
}
