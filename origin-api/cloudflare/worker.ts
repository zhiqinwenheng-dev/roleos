export interface Env {
  ORIGIN_API_URL: string;
  EDGE_SHARED_SECRET?: string;
}

const securityHeaders: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-xss-protection": "1; mode=block",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload"
};

function unauthorized(): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      message: "Unauthorized at edge."
    }),
    {
      status: 401,
      headers: {
        "content-type": "application/json"
      }
    }
  );
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function shouldRequireEdgeSecret(pathname: string): boolean {
  return pathname.startsWith("/admin/") || pathname.startsWith("/billing/webhooks/");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withSecurityHeaders(
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
            "access-control-allow-headers":
              "Content-Type,Authorization,Idempotency-Key,x-roleos-admin-key,x-roleos-webhook-secret,x-roleos-signature,x-edge-secret"
          }
        })
      );
    }

    if (shouldRequireEdgeSecret(url.pathname) && env.EDGE_SHARED_SECRET) {
      const secret = request.headers.get("x-edge-secret");
      if (!secret || secret !== env.EDGE_SHARED_SECRET) {
        return withSecurityHeaders(unauthorized());
      }
    }

    const origin = env.ORIGIN_API_URL.replace(/\/+$/, "");
    const target = `${origin}${url.pathname}${url.search}`;
    const originRequest = new Request(target, request);
    const response = await fetch(originRequest);

    const proxied = withSecurityHeaders(response);
    const headers = new Headers(proxied.headers);
    headers.set("access-control-allow-origin", "*");
    return new Response(proxied.body, {
      status: proxied.status,
      statusText: proxied.statusText,
      headers
    });
  }
};
