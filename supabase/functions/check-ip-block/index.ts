import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckIpRequest {
  action: 'check' | 'record_strike' | 'firewall_check' | 'rate_limit' | 'honeypot' | 'captcha_success' | 'captcha_failed';
  detected_extensions?: string[];
  reason?: string;
  user_id?: string;
  user_agent?: string;
  page_url?: string;
  request_headers?: Record<string, string>;
  endpoint?: string;
  honeypot_type?: string;
  attempts?: number;
}

const STRIKE_THRESHOLD = 10;
const STRIKE_WINDOW_HOURS = 1;
const BLOCK_DURATION_HOURS = 1;
const HONEYPOT_BLOCK_HOURS = 24; // Honeypots block for 24 hours

// Rate limiting settings
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_SCRAPER_THRESHOLD = 30;

// In-memory rate limit store
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

// Extension patterns that trigger IP blocking
const EXTENSION_PATTERNS = [
  'tachiyomi', 'kotatsu', 'mihon', 'neko', 'tachiyomisy', 'tachiyomij2k',
  'aniyomi', 'komikku', 'paperback', 'suwayomi', 'yokai', 'keiyoushi',
  'eu.kanade.tachiyomi', 'pt.wolftoon', 'pt.kuromangas', 'app.mihon',
  'org.kotatsu', 'mangadex'
];

// Honeypot endpoints - accessing these triggers instant ban
const HONEYPOT_ENDPOINTS = [
  '/api/v1/manga/list.json',
  '/api/v2/chapters/all',
  '/api/manga.json',
  '/manga/api/list',
  '/api/export/chapters',
  '/data/chapters.json',
  '/api/v1/download',
  '/api/bulk/images',
  '/api/scrape',
  '/.env',
  '/config.json',
  '/api/admin/users',
  '/api/private/data',
  '/wp-admin',
  '/phpinfo.php',
  '/.git/config',
  '/backup.sql',
  '/database.sql',
  '/api/v1/all-manga',
  '/api/v1/sitemap.xml',
  '/feed/chapters',
];

// Firewall patterns - more aggressive
const FIREWALL_PATTERNS = {
  user_agent: [
    /tachiyomi/i, /mihon/i, /kotatsu/i, /neko/i, /aniyomi/i,
    /komikku/i, /paperback/i, /suwayomi/i, /yokai/i, /keiyoushi/i,
    /^okhttp\/\d/i, /^dalvik\/\d/i,
    /eu\.kanade\.tachiyomi/i, /pt\.wolftoon/i, /pt\.kuromangas/i,
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
    /python-requests/i, /python-urllib/i, /axios/i, /node-fetch/i,
    /go-http-client/i, /java/i, /libwww-perl/i, /scrapy/i,
    /headlesschrome/i, /phantomjs/i, /selenium/i, /puppeteer/i,
    /httpx/i, /aiohttp/i, /httpie/i, /http\.rb/i,
    /android.*version\/\d.*chrome/i, // WebView without real Chrome
  ],
  suspicious_headers: ['x-requested-with', 'x-wolftoon-ext', 'x-tachiyomi'],
  suspicious_values: {
    'x-requested-with': [
      'com.keiyoushi', 'eu.kanade.tachiyomi', 'mihon', 'kotatsu', 'tachiyomisy', 
      'tachiyomij2k', 'app.mihon', 'pt.wolftoon', 'pt.kuromangas', 'xmlhttprequest'
    ],
  } as Record<string, string[]>,
  // Headers that real browsers always have
  required_browser_headers: ['accept', 'accept-language', 'accept-encoding'],
};

function checkRateLimit(clientIp: string, isSuspectedScraper: boolean): { limited: boolean; currentCount: number; limit: number } {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_SECONDS * 1000;
  const limit = isSuspectedScraper ? RATE_LIMIT_SCRAPER_THRESHOLD : RATE_LIMIT_MAX_REQUESTS;
  
  const record = rateLimitStore.get(clientIp);
  
  if (!record || (now - record.windowStart) > windowMs) {
    rateLimitStore.set(clientIp, { count: 1, windowStart: now });
    return { limited: false, currentCount: 1, limit };
  }
  
  record.count++;
  
  if (record.count > limit) {
    return { limited: true, currentCount: record.count, limit };
  }
  
  return { limited: false, currentCount: record.count, limit };
}

function detectScraper(userAgent: string, headers: Record<string, string>, path?: string): boolean {
  const ua = userAgent.toLowerCase();
  
  for (const pattern of FIREWALL_PATTERNS.user_agent) {
    if (pattern.test(ua)) return true;
  }
  
  if (!userAgent || userAgent.length < 10) return true;
  
  const accept = headers['accept'] || headers['Accept'] || '';
  if (accept === 'application/json' || accept === '*/*') {
    if (!accept.includes('text/html')) return true;
  }
  
  // Check for suspicious referer (or lack thereof)
  const referer = headers['referer'] || headers['Referer'] || '';
  if (!referer && path && (path.includes('/api/') || path.includes('/chapters/'))) {
    return true;
  }
  
  return false;
}

function checkFirewallPatterns(userAgent: string, headers: Record<string, string>): { blocked: boolean; reason: string | null; detectedPatterns: string[] } {
  const detectedPatterns: string[] = [];

  for (const pattern of FIREWALL_PATTERNS.user_agent) {
    if (pattern.test(userAgent)) {
      const match = userAgent.match(pattern);
      detectedPatterns.push(match ? match[0] : 'UA-Pattern');
    }
  }

  for (const header of FIREWALL_PATTERNS.suspicious_headers) {
    const value = headers[header]?.toLowerCase() || headers[header.toLowerCase()]?.toLowerCase();
    if (value) {
      const suspiciousValues = FIREWALL_PATTERNS.suspicious_values[header] || [];
      for (const suspicious of suspiciousValues) {
        if (value.includes(suspicious.toLowerCase())) {
          detectedPatterns.push(`${header}:${suspicious}`);
        }
      }
    }
  }

  // Check for OkHttp without proper browser markers
  if (/okhttp/i.test(userAgent)) {
    const hasBrowser = /chrome|firefox|safari|edge|opera|mozilla/i.test(userAgent);
    const hasMobileSafari = /mobile safari/i.test(userAgent);
    if (!hasBrowser || !hasMobileSafari) {
      detectedPatterns.push('OkHttp-Suspicious');
    }
  }

  // Check for Dalvik (Android runtime)
  if (/dalvik/i.test(userAgent)) {
    const hasRealBrowser = /mozilla\/5.*chrome.*mobile safari/i.test(userAgent);
    if (!hasRealBrowser) {
      detectedPatterns.push('Dalvik-App');
    }
  }

  // Minimal UA
  if (!userAgent || userAgent.length < 20) {
    detectedPatterns.push('Minimal-UA');
  }

  // Java client
  if (/^java\/|^apache-httpclient/i.test(userAgent)) {
    detectedPatterns.push('Java-Client');
  }

  // Check extension patterns in all headers
  const allHeaders = Object.values(headers).join(' ').toLowerCase();
  for (const pattern of EXTENSION_PATTERNS) {
    if (allHeaders.includes(pattern.toLowerCase())) {
      detectedPatterns.push(`Header-${pattern}`);
    }
  }

  // Check Accept-Language (most scrapers don't send this or send generic)
  const acceptLang = headers['accept-language'] || headers['Accept-Language'] || '';
  if (!acceptLang && headers['accept']) {
    detectedPatterns.push('No-Accept-Language');
  }

  // Check for missing required browser headers
  const hasAcceptEncoding = headers['accept-encoding'] || headers['Accept-Encoding'];
  if (!hasAcceptEncoding) {
    detectedPatterns.push('No-Accept-Encoding');
  }

  // Check referer - API calls without referer from our domain are suspicious
  const referer = headers['referer'] || headers['Referer'] || '';
  const origin = headers['origin'] || headers['Origin'] || '';
  const validDomains = ['wolftoon', 'localhost', '127.0.0.1', 'lovableproject.com', 'lovable.app'];
  
  // If there's a referer but it's not from our domains, suspicious
  if (referer && !validDomains.some(d => referer.includes(d))) {
    detectedPatterns.push(`Invalid-Referer: ${referer.substring(0, 50)}`);
  }

  // Android WebView detection - has Android in UA but accessing API directly
  if (/android/i.test(userAgent) && !/mobile safari/i.test(userAgent)) {
    detectedPatterns.push('Android-WebView-NoSafari');
  }

  // Check for typical extension request pattern: 
  // - Has apikey header
  // - No sec-fetch-* headers (modern browsers send these)
  const hasSecFetch = headers['sec-fetch-mode'] || headers['sec-fetch-site'] || headers['sec-fetch-dest'];
  const hasApiKey = headers['apikey'] || headers['Apikey'];
  if (hasApiKey && !hasSecFetch && !referer) {
    detectedPatterns.push('API-Direct-Access');
  }

  return {
    blocked: detectedPatterns.length > 0,
    reason: detectedPatterns.length > 0 ? `Firewall: ${detectedPatterns.join(', ')}` : null,
    detectedPatterns
  };
}

// Check if endpoint is a honeypot
function isHoneypot(path: string): boolean {
  const normalizedPath = path.toLowerCase();
  return HONEYPOT_ENDPOINTS.some(hp => normalizedPath.includes(hp.toLowerCase()));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';

    const body: CheckIpRequest = await req.json();
    const { action, detected_extensions, reason, user_id, user_agent, page_url, request_headers, endpoint, honeypot_type, attempts } = body;

    console.log(`[check-ip-block] Action: ${action}, IP: ${clientIp}`);

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Check if IP is whitelisted
    const { data: whitelisted } = await supabase
      .from('whitelisted_ips')
      .select('id')
      .eq('ip_address', clientIp)
      .single();

    if (whitelisted) {
      console.log(`[check-ip-block] IP ${clientIp} is whitelisted`);
      return new Response(
        JSON.stringify({ blocked: false, whitelisted: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // HONEYPOT ACTION - Instant block
    if (action === 'honeypot') {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + HONEYPOT_BLOCK_HOURS);

      console.log(`[check-ip-block] HONEYPOT TRIGGERED! IP: ${clientIp}, Type: ${honeypot_type || endpoint}`);

      // Log the honeypot access
      await supabase.from('blocked_access_logs').insert({
        user_id: user_id || null,
        reason: `HONEYPOT: ${honeypot_type || endpoint || 'Unknown trap'}`,
        detected_extensions: ['Honeypot', honeypot_type || 'trap'].filter(Boolean),
        user_agent: user_agent || null,
        page_url: page_url || endpoint || null,
        ip_address: clientIp,
      });

      // Instant block for 24 hours
      await supabase.from('blocked_ips').upsert({
        ip_address: clientIp,
        blocked_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        reason: `Honeypot: ${honeypot_type || endpoint || 'trap access'}`,
        strike_count: 999,
      }, { onConflict: 'ip_address' });

      return new Response(
        JSON.stringify({ 
          blocked: true, 
          reason: 'Acesso não autorizado detectado',
          honeypot: true,
          expires_at: expiresAt.toISOString()
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the endpoint is a honeypot
    if (endpoint && isHoneypot(endpoint)) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + HONEYPOT_BLOCK_HOURS);

      console.log(`[check-ip-block] HONEYPOT ENDPOINT: ${endpoint}, IP: ${clientIp}`);

      await supabase.from('blocked_access_logs').insert({
        user_id: user_id || null,
        reason: `HONEYPOT ENDPOINT: ${endpoint}`,
        detected_extensions: ['Honeypot-Endpoint'],
        user_agent: user_agent || null,
        page_url: endpoint,
        ip_address: clientIp,
      });

      await supabase.from('blocked_ips').upsert({
        ip_address: clientIp,
        blocked_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        reason: `Honeypot endpoint: ${endpoint}`,
        strike_count: 999,
      }, { onConflict: 'ip_address' });

      return new Response(
        JSON.stringify({ blocked: true, honeypot: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    if (action === 'rate_limit') {
      const ua = user_agent || req.headers.get('user-agent') || '';
      const isSuspectedScraper = detectScraper(ua, { ...headers, ...(request_headers || {}) }, endpoint);
      const rateCheck = checkRateLimit(clientIp, isSuspectedScraper);

      if (rateCheck.limited) {
        await supabase.from('blocked_access_logs').insert({
          user_id: user_id || null,
          reason: `Rate limit: ${rateCheck.currentCount}/${rateCheck.limit}/min`,
          detected_extensions: isSuspectedScraper ? ['RateLimit-Scraper'] : ['RateLimit'],
          user_agent: ua,
          page_url: page_url || endpoint || null,
          ip_address: clientIp,
        });

        if (rateCheck.currentCount > rateCheck.limit * 3) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + BLOCK_DURATION_HOURS);

          await supabase.from('blocked_ips').upsert({
            ip_address: clientIp,
            blocked_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            reason: `Rate limit abuse: ${rateCheck.currentCount} req/min`,
            strike_count: rateCheck.currentCount,
          }, { onConflict: 'ip_address' });

          return new Response(
            JSON.stringify({ blocked: true, reason: 'Rate limit exceeded - IP blocked', expires_at: expiresAt.toISOString() }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' } }
          );
        }

        return new Response(
          JSON.stringify({ blocked: true, reason: 'Rate limit exceeded', rate_limited: true }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
        );
      }

      if (isSuspectedScraper) {
        const firewallResult = checkFirewallPatterns(ua, { ...headers, ...(request_headers || {}) });
        if (firewallResult.blocked) {
          return new Response(
            JSON.stringify({ blocked: true, reason: firewallResult.reason, firewall: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ blocked: false, current: rateCheck.currentCount, limit: rateCheck.limit }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Firewall check
    if (action === 'firewall_check') {
      const ua = user_agent || req.headers.get('user-agent') || '';
      const firewallResult = checkFirewallPatterns(ua, { ...headers, ...(request_headers || {}) });
      const isSuspectedScraper = detectScraper(ua, { ...headers, ...(request_headers || {}) }, page_url);
      const rateCheck = checkRateLimit(clientIp, isSuspectedScraper);

      if (firewallResult.blocked || rateCheck.limited) {
        await supabase.from('blocked_access_logs').insert({
          user_id: user_id || null,
          reason: firewallResult.reason || `Rate limit: ${rateCheck.currentCount}/${rateCheck.limit}`,
          detected_extensions: firewallResult.detectedPatterns.length > 0 ? firewallResult.detectedPatterns : ['RateLimit'],
          user_agent: ua,
          page_url: page_url || null,
          ip_address: clientIp,
        });

        const windowStart = new Date();
        windowStart.setHours(windowStart.getHours() - STRIKE_WINDOW_HOURS);

        const { count } = await supabase
          .from('blocked_access_logs')
          .select('*', { count: 'exact', head: true })
          .eq('ip_address', clientIp)
          .gte('created_at', windowStart.toISOString());

        const strikeCount = count || 0;

        if (strikeCount >= STRIKE_THRESHOLD) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + BLOCK_DURATION_HOURS);

          await supabase.from('blocked_ips').upsert({
            ip_address: clientIp,
            blocked_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            reason: firewallResult.reason || 'Firewall block',
            strike_count: strikeCount,
          }, { onConflict: 'ip_address' });

          return new Response(
            JSON.stringify({ blocked: true, reason: firewallResult.reason, firewall: true, expires_at: expiresAt.toISOString() }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ blocked: true, reason: firewallResult.reason, firewall: true, strike_count: strikeCount }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ blocked: false, firewall: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if blocked
    if (action === 'check') {
      const { data: blockedIp } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('ip_address', clientIp)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (blockedIp) {
        console.log(`[check-ip-block] IP ${clientIp} is blocked until ${blockedIp.expires_at}`);
        return new Response(
          JSON.stringify({ blocked: true, reason: blockedIp.reason, expires_at: blockedIp.expires_at }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record strike
    if (action === 'record_strike') {
      const isExtensionRelated = detected_extensions?.some(ext => 
        EXTENSION_PATTERNS.some(pattern => ext.toLowerCase().includes(pattern))
      );

      if (!isExtensionRelated) {
        console.log(`[check-ip-block] Skipping non-extension: ${detected_extensions?.join(', ')}`);
        return new Response(
          JSON.stringify({ blocked: false, message: 'Not an extension detection' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase.from('blocked_access_logs').insert({
        user_id: user_id || null,
        reason: reason || 'Extension detected',
        detected_extensions: detected_extensions || [],
        user_agent: user_agent || null,
        page_url: page_url || null,
        ip_address: clientIp,
      });

      const windowStart = new Date();
      windowStart.setHours(windowStart.getHours() - STRIKE_WINDOW_HOURS);

      const { count } = await supabase
        .from('blocked_access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', clientIp)
        .gte('created_at', windowStart.toISOString());

      const strikeCount = count || 0;
      console.log(`[check-ip-block] IP ${clientIp} has ${strikeCount} strikes`);

      if (strikeCount >= STRIKE_THRESHOLD) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + BLOCK_DURATION_HOURS);

        await supabase.from('blocked_ips').upsert({
          ip_address: clientIp,
          blocked_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          reason: `Excesso: ${detected_extensions?.join(', ') || 'extensão'}`,
          strike_count: strikeCount,
        }, { onConflict: 'ip_address' });

        console.log(`[check-ip-block] IP ${clientIp} blocked until ${expiresAt.toISOString()}`);

        return new Response(
          JSON.stringify({ blocked: true, reason: 'IP bloqueado', expires_at: expiresAt.toISOString(), strike_count: strikeCount }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ blocked: false, strike_count: strikeCount, threshold: STRIKE_THRESHOLD }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CAPTCHA success - clear strikes for this IP
    if (action === 'captcha_success') {
      console.log(`[check-ip-block] CAPTCHA SUCCESS from IP: ${clientIp}`);
      
      // Log the successful captcha
      await supabase.from('blocked_access_logs').insert({
        user_id: user_id || null,
        reason: 'CAPTCHA_SUCCESS',
        detected_extensions: ['captcha-passed'],
        user_agent: user_agent || null,
        page_url: page_url || null,
        ip_address: clientIp,
      });

      // Remove any existing blocks for this IP
      await supabase
        .from('blocked_ips')
        .delete()
        .eq('ip_address', clientIp);

      return new Response(
        JSON.stringify({ success: true, message: 'CAPTCHA verified successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CAPTCHA failed - block the IP
    if (action === 'captcha_failed') {
      console.log(`[check-ip-block] CAPTCHA FAILED from IP: ${clientIp}, attempts: ${attempts}`);
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + BLOCK_DURATION_HOURS * 2); // Block for 2 hours on captcha failure

      // Log the failed captcha
      await supabase.from('blocked_access_logs').insert({
        user_id: user_id || null,
        reason: `CAPTCHA_FAILED: ${attempts || 0} attempts`,
        detected_extensions: ['captcha-failed'],
        user_agent: user_agent || null,
        page_url: page_url || null,
        ip_address: clientIp,
      });

      // Block the IP
      await supabase.from('blocked_ips').upsert({
        ip_address: clientIp,
        blocked_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        reason: 'CAPTCHA verification failed',
        strike_count: 999,
      }, { onConflict: 'ip_address' });

      return new Response(
        JSON.stringify({ blocked: true, reason: 'CAPTCHA verification failed', expires_at: expiresAt.toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-ip-block] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
