/**
 * Limits where we attach `Authorization` so tokens are not sent to arbitrary absolute URLs.
 * Relative URLs must sit under `apiBaseUrl` when it is set (e.g. `/api/...`); when empty, any
 * same-origin relative path is allowed (production build often uses same-origin `/api` routing).
 */
export function shouldAttachBearerToRequest(
  requestUrl: string,
  apiBaseUrl: string,
): boolean {
  const apiBase = apiBaseUrl.replace(/\/$/, '');
  const absolute =
    /^https?:\/\//i.test(requestUrl) || requestUrl.startsWith('//');

  if (!absolute) {
    if (apiBase === '') {
      return requestUrl.startsWith('/');
    }
    return requestUrl === apiBase || requestUrl.startsWith(`${apiBase}/`);
  }

  if (apiBase === '' || apiBase.startsWith('/')) {
    return false;
  }

  try {
    const requestParsed = new URL(requestUrl);
    const baseParsed = new URL(apiBase);
    let basePath = baseParsed.pathname;
    if (basePath.length > 1 && basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1);
    }
    if (!requestParsed.origin || requestParsed.origin !== baseParsed.origin) {
      return false;
    }
    if (basePath === '' || basePath === '/') {
      return true;
    }
    return (
      requestParsed.pathname === basePath ||
      requestParsed.pathname.startsWith(`${basePath}/`)
    );
  } catch {
    return false;
  }
}
