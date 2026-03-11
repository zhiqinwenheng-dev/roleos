const API_ORIGIN = "https://api.roleos.ai";

function isBodyAllowed(method) {
  const upper = method.toUpperCase();
  return upper !== "GET" && upper !== "HEAD";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const upstreamUrl = new URL(url.pathname.replace(/^\/api/, "") + url.search, API_ORIGIN);
      const headers = new Headers(request.headers);
      headers.set("x-roleos-proxy", "workers");
      const upstreamRequest = new Request(upstreamUrl.toString(), {
        method: request.method,
        headers,
        body: isBodyAllowed(request.method) ? request.body : undefined,
        redirect: "follow"
      });
      return fetch(upstreamRequest);
    }

    return env.ASSETS.fetch(request);
  }
};
