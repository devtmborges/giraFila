/**
 * GiraFila — Master Password Utility
 * Manages master password hashing, verification, and persistence.
 * Uses native Web Crypto API (SHA-256) with a lightweight pure-JS fallback
 * for non-secure HTTP contexts (such as local network IP access over Wi-Fi).
 * Aligned with HARNESS/Security/SecurityGovernance.md
 */

const STORAGE_KEY = 'gf_export_pwd_hash';
const HASH_PREFIX = 'girafila';

// Pre-computed hash of initial credentials (never surfaced in UI or logs)
const INITIAL_DIGEST = '8bf9017c1ff62c51dfa9761bfad01a94004dae6201d26b24c67e3b02cbbac9bf';

/**
 * Pure JavaScript SHA-256 implementation for non-secure HTTP contexts (e.g. LAN Wi-Fi access)
 * where window.crypto.subtle is restricted by browser security policies.
 * @param {string} text
 * @returns {string} Hex digest
 */
function sha256Fallback(text) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const maxWord = Math.pow(2, 32);
  const words = [];

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  // UTF-8 encode
  const utf8 = unescape(encodeURIComponent(text));
  const utf8BitLength = utf8.length * 8;

  let str = utf8 + '\x80';
  while ((str.length % 64) !== 56) str += '\x00';
  for (let i = 0; i < str.length; i++) {
    words[i >> 2] |= str.charCodeAt(i) << ((3 - (i % 4)) * 8);
  }
  words[words.length] = ((utf8BitLength / maxWord) | 0);
  words[words.length] = (utf8BitLength | 0);

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0);
    
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = (hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        )) | 0;
      const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;
      
      hash = [(temp1 + temp2) | 0].concat(hash.slice(0, 7));
      hash[4] = (hash[4] + temp1) | 0;
    }
    
    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Computes SHA-256 of prefixed password string.
 * @param {string} password
 * @returns {Promise<string>} Hex digest
 */
async function hashPassword(password) {
  const fullText = HASH_PREFIX + password;

  // Use native Web Crypto API when available (Secure Contexts: HTTPS / localhost)
  if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(fullText);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback silently if subtle.digest throws in edge cases
      return sha256Fallback(fullText);
    }
  }

  // Pure-JS fallback for HTTP contexts (LAN IP access)
  return sha256Fallback(fullText);
}

/**
 * Returns the currently stored hash, initializing with default silently if absent.
 * @returns {string}
 */
function getStoredHash() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Silent initialization — never surfaced to the user
    localStorage.setItem(STORAGE_KEY, INITIAL_DIGEST);
    return INITIAL_DIGEST;
  }
  return stored;
}

/**
 * Verifies a plaintext password against the stored hash.
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password) {
  const hash = await hashPassword(password);
  return hash === getStoredHash();
}

/**
 * Persists a new password (stores its hash).
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function updatePassword(newPassword) {
  const hash = await hashPassword(newPassword);
  localStorage.setItem(STORAGE_KEY, hash);
}
