// Image token generation for secure image loading
// Must match the server-side algorithm in serve-image edge function

const TOKEN_SECRET = 'W0lfT00n_S3cur1ty_K3y_2024!';

/**
 * Generate a time-based token for image requests
 * Token is valid for current minute and adjacent minutes
 */
export function generateImageToken(timestamp: number): string {
  const minute = Math.floor(timestamp / 60000);
  const data = `${TOKEN_SECRET}:${minute}`;
  
  // Simple hash matching server-side
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a signature for a specific image request
 * Prevents token reuse across different images
 */
export function generateImageSignature(imageUrl: string, timestamp: number): string {
  const data = `${imageUrl}:${timestamp}:${TOKEN_SECRET}`;
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
}

/**
 * Build a secure image URL through the proxy
 */
export function getSecureImageUrl(originalUrl: string): string {
  const timestamp = Date.now();
  const token = generateImageToken(timestamp);
  const signature = generateImageSignature(originalUrl, timestamp);
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  const params = new URLSearchParams({
    url: originalUrl,
    token: token,
    ts: timestamp.toString(),
    sig: signature,
  });
  
  return `${supabaseUrl}/functions/v1/serve-image?${params.toString()}`;
}

/**
 * Get headers for secure image request
 * These are additional headers that can be used with fetch
 */
export function getSecureImageHeaders(): Record<string, string> {
  const timestamp = Date.now();
  const token = generateImageToken(timestamp);
  
  return {
    'X-Wolftoon-Token': token,
    'X-Wolftoon-Ts': timestamp.toString(),
  };
}

/**
 * Check if URL is from our storage (needs proxying)
 */
export function shouldProxyImage(url: string): boolean {
  // Proxy all Supabase storage URLs
  if (url.includes('supabase.co/storage') || url.includes('supabase.in/storage')) {
    return true;
  }
  // Proxy any external URLs used for manga images
  // Add patterns as needed
  return false;
}

/**
 * Transform image URL to secure version if needed
 */
export function secureImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // Only proxy storage URLs for now
  if (shouldProxyImage(url)) {
    return getSecureImageUrl(url);
  }
  
  return url;
}
