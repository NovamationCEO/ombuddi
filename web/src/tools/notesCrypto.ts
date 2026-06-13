/**
 * Client-side AES-256-GCM encryption for entries.notes.
 *
 * Key derivation: PBKDF2(password=saltPhrase, salt=orgId, iterations=100_000, hash=SHA-256)
 * Storage format: "ombuddi_enc_v1:" + base64(iv[12 bytes] || ciphertext+tag)
 *
 * The orgId bakes the key to the organization, so a note from org A can't be
 * decrypted even with the correct salt phrase inside org B.
 *
 * Detection: strings starting with ENC_PREFIX are encrypted; everything else
 * is treated as legacy plaintext (backward compat for existing dev data).
 */

const ENC_PREFIX = 'ombuddi_enc_v1:'
const IV_LENGTH = 12
const PBKDF2_ITERATIONS = 100_000

function encode(s: string): Uint8Array<ArrayBuffer> {
    return new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>
}

async function deriveKey(saltPhrase: string, orgId: string): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encode(saltPhrase),
        'PBKDF2',
        false,
        ['deriveKey'],
    )
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encode(orgId),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    )
}

export async function encryptNotes(plaintext: string, saltPhrase: string, orgId: string): Promise<string> {
    const key = await deriveKey(saltPhrase, orgId)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encode(plaintext),
    )
    const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertext), IV_LENGTH)
    return ENC_PREFIX + btoa(String.fromCharCode(...combined))
}

/**
 * Returns the decrypted string on success, or null if the data is not
 * encrypted with this salt/org combination (wrong key or corrupt data).
 * Throws only on unexpected errors.
 */
export async function decryptNotes(stored: string, saltPhrase: string, orgId: string): Promise<string | null> {
    if (!stored.startsWith(ENC_PREFIX)) return stored  // legacy plaintext
    try {
        const raw = Uint8Array.from(atob(stored.slice(ENC_PREFIX.length)), (c) => c.charCodeAt(0))
        const iv = raw.slice(0, IV_LENGTH)
        const ciphertext = raw.slice(IV_LENGTH)
        const key = await deriveKey(saltPhrase, orgId)
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
        return new TextDecoder().decode(plaintext)
    } catch {
        return null  // wrong key — caller shows override prompt
    }
}

export function isEncrypted(stored: string): boolean {
    return stored.startsWith(ENC_PREFIX)
}
