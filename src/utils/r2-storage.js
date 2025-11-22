// Cloudflare R2 Storage utility using S3-compatible API
// Note: For production, you should use a backend server to handle R2 operations
// to keep your secret keys secure. This is a client-side implementation for development.

const R2_CONFIG = {
  accountId: import.meta.env.VITE_R2_ACCOUNT_ID,
  accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
  secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  bucketName: import.meta.env.VITE_R2_BUCKET_NAME,
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  publicUrl: import.meta.env.VITE_R2_PUBLIC_URL
};

/**
 * Generate AWS Signature V4 for R2 requests
 */
async function generateSignature(method, path, headers, payload = '') {
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = date.slice(0, 8);
  
  // Create canonical request
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key].trim()}`)
    .join('\n');
  
  const signedHeaders = Object.keys(headers)
    .sort()
    .map(key => key.toLowerCase())
    .join(';');
  
  const payloadHash = await sha256(payload);
  
  const canonicalRequest = [
    method,
    path,
    '', // query string
    canonicalHeaders + '\n',
    signedHeaders,
    payloadHash
  ].join('\n');
  
  const canonicalRequestHash = await sha256(canonicalRequest);
  
  // Create string to sign
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    date,
    credentialScope,
    canonicalRequestHash
  ].join('\n');
  
  // Calculate signature
  const signingKey = await getSignatureKey(
    R2_CONFIG.secretAccessKey,
    dateStamp,
    'auto',
    's3'
  );
  
  const signature = await hmacSha256(signingKey, stringToSign);
  
  return {
    date,
    signature: bufferToHex(signature),
    signedHeaders,
    credentialScope
  };
}

/**
 * SHA-256 hash function
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * HMAC-SHA256 function
 */
async function hmacSha256(key, message) {
  const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const msgBuffer = new TextEncoder().encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  return await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
}

/**
 * Get signature key
 */
async function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = await hmacSha256('AWS4' + key, dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

/**
 * Convert buffer to hex string
 */
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Upload file to R2
 */
export async function uploadToR2(file, path) {
  try {
    const fullPath = `/${R2_CONFIG.bucketName}/${path}`;
    const url = `${R2_CONFIG.endpoint}${fullPath}`;
    
    const headers = {
      'Host': new URL(R2_CONFIG.endpoint).host,
      'Content-Type': file.type || 'application/octet-stream',
      'Content-Length': file.size.toString(),
      'x-amz-content-sha256': await sha256(await file.arrayBuffer())
    };
    
    const { date, signature, signedHeaders, credentialScope } = await generateSignature(
      'PUT',
      fullPath,
      headers,
      await file.text()
    );
    
    headers['x-amz-date'] = date;
    headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: file
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    return {
      success: true,
      url: `${R2_CONFIG.publicUrl}/${path}`,
      path: path
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    throw error;
  }
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(path) {
  try {
    const fullPath = `/${R2_CONFIG.bucketName}/${path}`;
    const url = `${R2_CONFIG.endpoint}${fullPath}`;
    
    const headers = {
      'Host': new URL(R2_CONFIG.endpoint).host,
      'x-amz-content-sha256': await sha256('')
    };
    
    const { date, signature, signedHeaders, credentialScope } = await generateSignature(
      'DELETE',
      fullPath,
      headers
    );
    
    headers['x-amz-date'] = date;
    headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('R2 delete error:', error);
    throw error;
  }
}

/**
 * Get public URL for a file
 */
export function getR2PublicUrl(path) {
  return `${R2_CONFIG.publicUrl}/${path}`;
}

/**
 * Check if R2 is configured
 */
export function isR2Configured() {
  return !!(
    R2_CONFIG.accountId &&
    R2_CONFIG.accessKeyId &&
    R2_CONFIG.secretAccessKey &&
    R2_CONFIG.bucketName &&
    R2_CONFIG.endpoint
  );
}

export const r2Storage = {
  upload: uploadToR2,
  delete: deleteFromR2,
  getPublicUrl: getR2PublicUrl,
  isConfigured: isR2Configured
};
