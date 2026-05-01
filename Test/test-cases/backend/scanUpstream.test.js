'use strict';

const path = require('path');

const modulePath = path.resolve(__dirname, '../../mutation-targets/scanUpstream.js');

function loadFresh() {
  delete require.cache[modulePath];
  return require(modulePath);
}

describe('scanUpstream config helpers', () => {
  const originalScanApiUrl = process.env.SCAN_API_URL;

  afterEach(() => {
    if (originalScanApiUrl === undefined) {
      delete process.env.SCAN_API_URL;
    } else {
      process.env.SCAN_API_URL = originalScanApiUrl;
    }
    delete require.cache[modulePath];
  });

  test('scanServiceBase defaults to localhost:8000', () => {
    delete process.env.SCAN_API_URL;
    const { scanServiceBase } = loadFresh();
    expect(scanServiceBase()).toBe('http://127.0.0.1:8000');
  });

  test('scanServiceBase trims one trailing slash', () => {
    process.env.SCAN_API_URL = 'https://cook-as-u-go-scan.onrender.com/';
    const { scanServiceBase } = loadFresh();
    expect(scanServiceBase()).toBe('https://cook-as-u-go-scan.onrender.com');
  });

  test('scanProxyHealthMeta marks localhost as misconfigured', () => {
    process.env.SCAN_API_URL = 'http://127.0.0.1:8000';
    const { scanProxyHealthMeta } = loadFresh();
    const out = scanProxyHealthMeta();
    expect(out.scan_api_target).toBe('http://127.0.0.1:8000');
    expect(out.receipt_scan_proxy_ok).toBe(false);
    expect(out.receipt_scan_hint).toContain('set SCAN_API_URL');
  });

  test('scanProxyHealthMeta marks hostname localhost as misconfigured', () => {
    process.env.SCAN_API_URL = 'http://localhost:8000';
    const { scanProxyHealthMeta } = loadFresh();
    const out = scanProxyHealthMeta();
    expect(out.receipt_scan_proxy_ok).toBe(false);
    expect(out.receipt_scan_hint).toContain('set SCAN_API_URL');
  });

  test('scanProxyHealthMeta marks IPv6 loopback as misconfigured', () => {
    process.env.SCAN_API_URL = 'http://[::1]:8000';
    const { scanProxyHealthMeta } = loadFresh();
    const out = scanProxyHealthMeta();
    expect(out.receipt_scan_proxy_ok).toBe(false);
    expect(out.receipt_scan_hint).toContain('set SCAN_API_URL');
  });

  test('scanProxyHealthMeta marks 0.0.0.0 as misconfigured', () => {
    process.env.SCAN_API_URL = 'http://0.0.0.0:8000';
    const { scanProxyHealthMeta } = loadFresh();
    const out = scanProxyHealthMeta();
    expect(out.receipt_scan_proxy_ok).toBe(false);
    expect(out.receipt_scan_hint).toContain('set SCAN_API_URL');
  });

  test('scanProxyHealthMeta accepts public HTTPS host', () => {
    process.env.SCAN_API_URL = 'https://cook-as-u-go-scan.onrender.com';
    const { scanProxyHealthMeta } = loadFresh();
    const out = scanProxyHealthMeta();
    expect(out.scan_api_target).toBe('https://cook-as-u-go-scan.onrender.com');
    expect(out.receipt_scan_proxy_ok).toBe(true);
    expect(out.receipt_scan_hint).toBeUndefined();
  });

  test('scanProxyHealthMeta handles invalid SCAN_API_URL', () => {
    process.env.SCAN_API_URL = 'not-a-valid-url';
    const { scanProxyHealthMeta } = loadFresh();
    const out = scanProxyHealthMeta();
    expect(out.scan_api_target).toBe('(invalid SCAN_API_URL)');
    expect(out.receipt_scan_proxy_ok).toBe(false);
    expect(out.receipt_scan_hint).toContain('valid http(s) origin');
  });
});
