'use strict';

/** FastAPI ScanAndSave base (no trailing slash). */
function scanServiceBase() {
  return String(process.env.SCAN_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
}

/** Safe hints for /api/health — no secrets. */
function scanProxyHealthMeta() {
  const raw = scanServiceBase();
  try {
    const u = new URL(raw);
    const h = u.hostname;
    let normalizedHost = h;
    // Stryker disable next-line all: equivalent mutants for bracket stripping guard.
    if (normalizedHost.startsWith('[') && normalizedHost.endsWith(']')) {
      normalizedHost = normalizedHost.slice(1, -1);
    }
    const misconfigured =
      normalizedHost === '127.0.0.1' ||
      normalizedHost === 'localhost' ||
      normalizedHost === '::1' ||
      normalizedHost === '0.0.0.0';
    const origin = `${u.protocol}//${h}${u.port ? `:${u.port}` : ''}`;
    return {
      scan_api_target: origin,
      receipt_scan_proxy_ok: !misconfigured,
      ...(misconfigured
        ? {
            receipt_scan_hint:
              'On cloud hosts, set SCAN_API_URL to your public ScanAndSave HTTPS origin (e.g. a second Render web service). Localhost here only works when Kitchen and ScanAndSave run on the same machine.',
          }
        : {}),
    };
  } catch {
    return {
      scan_api_target: '(invalid SCAN_API_URL)',
      receipt_scan_proxy_ok: false,
      receipt_scan_hint: 'Set SCAN_API_URL to a valid http(s) origin with no path.',
    };
  }
}

module.exports = { scanServiceBase, scanProxyHealthMeta };
