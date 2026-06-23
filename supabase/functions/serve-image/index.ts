import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wolftoon-token, x-wolftoon-ts, x-wolftoon-sig',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Secret key for token generation (should match client-side)
const TOKEN_SECRET = 'W0lfT00n_S3cur1ty_K3y_2024!';
const TOKEN_VALIDITY_MINUTES = 2;

// SPECIFIC Extension patterns - only block reading apps
const BLOCKED_UA_PATTERNS = [
  // Tachiyomi ecosystem - specific patterns
  /\btachiyomi\b/i, /\bkeiyoushi\b/i, /\bmihon\b/i, /\baniyomi\b/i,
  /\bneko\b/i, /\bsuwayomi\b/i, /\byokai\b/i, /\bkotatsu\b/i,
  /\bkomikku\b/i, /\bpaperback\b/i,
  /eu\.kanade\.tachiyomi/i, /pt\.wolftoon/i, /pt\.kuromangas/i, /app\.mihon/i,
  
  // Pure HTTP clients (NOT browsers)
  /^okhttp\/\d/i,
  /^dalvik\/\d/i,
  /^java\//i,
  /apache-httpclient/i,
  
  // Scraping tools
  /python-requests/i, /python-urllib/i, /\bscrapy\b/i,
  /\bcurl\/\d/i, /\bwget\/\d/i,
  /node-fetch/i, /^axios/i, /go-http-client/i, /libwww-perl/i,
  
  // Headless browsers
  /headlesschrome/i, /\bphantomjs\b/i, /\bselenium\b/i, /\bpuppeteer\b/i,
];

// Check if user agent is blocked
function isBlockedUserAgent(ua: string): boolean {
  for (const pattern of BLOCKED_UA_PATTERNS) {
    if (pattern.test(ua)) {
      // Exception: OkHttp/Dalvik WITH full browser signature is a real Android browser
      if (/okhttp|dalvik/i.test(ua) && /mozilla\/5.*applewebkit.*chrome.*mobile safari/i.test(ua)) {
        return false; // This is a legitimate Android browser
      }
      return true;
    }
  }
  
  // Don't block short UAs - let other validation handle it
  return false;
}

// Generate expected token
function generateToken(timestamp: number): string {
  const minute = Math.floor(timestamp / 60000);
  const data = `${TOKEN_SECRET}:${minute}`;
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Validate token
function validateToken(token: string, timestamp: number): boolean {
  const currentMinute = Math.floor(Date.now() / 60000);
  const tokenMinute = Math.floor(timestamp / 60000);
  
  if (Math.abs(currentMinute - tokenMinute) > TOKEN_VALIDITY_MINUTES) {
    return false;
  }
  
  const expectedToken = generateToken(timestamp);
  return token === expectedToken;
}

// Generate signature for request
function generateSignature(path: string, timestamp: number): string {
  const data = `${path}:${timestamp}:${TOKEN_SECRET}`;
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
}

// Log blocked attempt
async function logBlockedAttempt(supabase: any, ip: string, reason: string, ua: string, url: string) {
  try {
    await supabase.from('blocked_access_logs').insert({
      reason: `Image Proxy: ${reason}`,
      detected_extensions: ['ImageProxy-Block'],
      user_agent: ua,
      page_url: url,
      ip_address: ip,
    });
  } catch (e) {
    console.error('Failed to log blocked attempt:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || 
                   req.headers.get('cf-connecting-ip') ||
                   'unknown';

  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');
    const token = req.headers.get('x-wolftoon-token') || url.searchParams.get('token') || '';
    const timestamp = parseInt(req.headers.get('x-wolftoon-ts') || url.searchParams.get('ts') || '0');
    const signature = req.headers.get('x-wolftoon-sig') || url.searchParams.get('sig') || '';

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing image URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check if IP is blocked
    const { data: blockedIp } = await supabase
      .from('blocked_ips')
      .select('id')
      .eq('ip_address', clientIp)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (blockedIp) {
      console.log(`[serve-image] IP blocked: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check whitelisted IPs
    const { data: whitelisted } = await supabase
      .from('whitelisted_ips')
      .select('id')
      .eq('ip_address', clientIp)
      .single();

    // Skip other checks if whitelisted
    if (!whitelisted) {
      // 3. Check User-Agent
      if (isBlockedUserAgent(userAgent)) {
        console.log(`[serve-image] Blocked UA: ${userAgent.substring(0, 100)}`);
        await logBlockedAttempt(supabase, clientIp, 'Blocked User-Agent', userAgent, imageUrl);
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 4. Check Referer - must be from our domain or empty (for initial loads)
      const validReferers = ['wolftoon', 'localhost', '127.0.0.1', 'lovableproject.com', 'lovable.app'];
      const refererValid = !referer || validReferers.some(v => referer.includes(v));
      
      if (!refererValid) {
        console.log(`[serve-image] Invalid referer: ${referer}`);
        await logBlockedAttempt(supabase, clientIp, `Invalid Referer: ${referer}`, userAgent, imageUrl);
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 5. Validate token
      if (!token || !timestamp || !validateToken(token, timestamp)) {
        console.log(`[serve-image] Invalid token: ${token}, ts: ${timestamp}`);
        await logBlockedAttempt(supabase, clientIp, 'Invalid or expired token', userAgent, imageUrl);
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 6. Validate signature
      const expectedSig = generateSignature(imageUrl, timestamp);
      if (signature !== expectedSig) {
        console.log(`[serve-image] Invalid signature: ${signature} vs ${expectedSig}`);
        await logBlockedAttempt(supabase, clientIp, 'Invalid request signature', userAgent, imageUrl);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 7. Check Accept-Language header (browsers have it, scrapers usually don't)
      const acceptLang = req.headers.get('accept-language');
      if (!acceptLang) {
        console.log(`[serve-image] Missing Accept-Language`);
        await logBlockedAttempt(supabase, clientIp, 'Missing Accept-Language header', userAgent, imageUrl);
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch the actual image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Wolftoon Image Proxy)',
      }
    });

    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch image' }),
        { status: imageResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      }
    });

  } catch (error) {
    console.error('[serve-image] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
