const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' data: blob: https: http:; img-src 'self' data: blob: https: http:; media-src 'self' data: blob: https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline' https:; connect-src 'self' https: http: ws: wss:;",
  );
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE") {
    res.setHeader("Cache-Control", "no-store");
  }
  next();
};

module.exports = securityHeaders;
