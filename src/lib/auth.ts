const ENCODER = new TextEncoder();

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const keyData = ENCODER.encode(secret);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Creates a tamper-proof session token signed with the secret token
 */
export async function signSession(expires: number, secret: string): Promise<string> {
  const payload = `admin:${expires}`;
  const key = await getHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    ENCODER.encode(payload)
  );
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${payload}:${signatureHex}`;
}

/**
 * Verifies the integrity and expiration of the session token
 */
export async function verifySession(cookieValue: string | undefined, secret: string): Promise<boolean> {
  if (!cookieValue) return false;
  
  const parts = cookieValue.split(':');
  if (parts.length !== 3) return false;
  
  const [role, expiresStr, signatureHex] = parts;
  if (role !== 'admin') return false;
  
  const expires = Number(expiresStr);
  if (isNaN(expires) || expires < Date.now()) return false;
  
  // Re-sign to verify signature matches
  const payload = `${role}:${expiresStr}`;
  const key = await getHmacKey(secret);
  const expectedSignatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    ENCODER.encode(payload)
  );
  const expectedSignatureHex = Array.from(new Uint8Array(expectedSignatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return signatureHex === expectedSignatureHex;
}
