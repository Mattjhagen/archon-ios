const IDE_ORIGIN = 'https://app.relayapp.pro';
const IDE_STATIC_FILES = new Set([
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/site.webmanifest',
]);

function shouldProxyToIde(pathname) {
  return pathname === '/ide'
    || pathname.startsWith('/ide/')
    || pathname.startsWith('/api/')
    || pathname === '/ws'
    || pathname.startsWith('/assets/')
    || IDE_STATIC_FILES.has(pathname);
}

function ideUrl(url) {
  const upstream = new URL(IDE_ORIGIN);
  upstream.pathname = url.pathname === '/ide'
    ? '/'
    : url.pathname.startsWith('/ide/')
      ? url.pathname.slice('/ide'.length)
      : url.pathname;
  upstream.search = url.search;
  return upstream;
}

function ideContentSecurityPolicy() {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "connect-src 'self' https://sbbkmdnyzzidywjkdhye.supabase.co",
    "frame-src 'self'",
  ].join('; ');
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!shouldProxyToIde(url.pathname)) return env.ASSETS.fetch(request);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('X-Forwarded-Host', url.host);
  headers.set('X-Forwarded-Proto', url.protocol.slice(0, -1));

  const response = await fetch(ideUrl(url), new Request(request, { headers }));
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Content-Security-Policy', ideContentSecurityPolicy());
  responseHeaders.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
}
