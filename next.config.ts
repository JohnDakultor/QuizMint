// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   async headers() {
//     return [
//       {
//         source: "/(.*)",
//         headers: [
//           {
//             key: "Content-Security-Policy",
//             value: [
//               "default-src 'self';",
//               "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://partner.googleadservices.com;",
//               "style-src 'self' 'unsafe-inline';",
//               "img-src 'self' data: https://*.gstatic.com https://*.google.com;",
//               "font-src 'self' data:;",
//               "connect-src 'self' https:;",
//               "frame-src https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net;",
//               "frame-ancestors 'self';"
//             ].join(" "),
//           },
//           { key: "X-Content-Type-Options", value: "nosniff" },
//           { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
//           { key: "X-Frame-Options", value: "DENY" },
//         ],
//       },
//     ];
//   },
// };

// export default nextConfig;


import type { NextConfig } from "next";

const IS_PROD =
  process.env.VERCEL_ENV === "production" ||
  process.env.APP_ENV === "production" ||
  process.env.NODE_ENV === "production";

function buildCsp() {
  // Keep this list explicit; avoid wildcard domains in production.
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(IS_PROD ? [] : ["'unsafe-eval'"]),
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://www.gstatic.com",
    "https://www.googletagmanager.com",
    "https://pagead2.googlesyndication.com",
    "https://partner.googleadservices.com",
    "https://googleads.g.doubleclick.net",
    "https://ep1.adtrafficquality.google",
    "https://ep2.adtrafficquality.google",
    "https://quge5.com",
    "https://*.quge5.com",
    "https://5gvci.com",
    "https://*.5gvci.com",
    "https://www.paypal.com",
    "https://www.sandbox.paypal.com",
    "https://www.paypalobjects.com",
    "https://checkout-v2.paymongo.com",
    "https://js.stripe.com",
    "blob:",
  ];

  const styleSrc = [
    "'self'",
    "'unsafe-inline'",
    "https://accounts.google.com",
    "https://fonts.googleapis.com",
  ];

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https://lh3.googleusercontent.com",
    "https://*.gstatic.com",
    "https://*.google.com",
    "https://pagead2.googlesyndication.com",
    "https://googleads.g.doubleclick.net",
    "https://quge5.com",
    "https://*.quge5.com",
    "https://5gvci.com",
    "https://*.5gvci.com",
  ];

  const connectSrc = [
    "'self'",
    "https://accounts.google.com",
    "https://www.googleapis.com",
    "https://www.paypal.com",
    "https://www.sandbox.paypal.com",
    "https://api.paymongo.com",
    "https://checkout-v2.paymongo.com",
    "https://api.stripe.com",
    "https://ep1.adtrafficquality.google",
    "https://ep2.adtrafficquality.google",
    "https://quge5.com",
    "https://*.quge5.com",
    "https://5gvci.com",
    "https://*.5gvci.com",
    ...(IS_PROD ? [] : ["ws://localhost:3000", "ws://127.0.0.1:3000"]),
  ];

  const frameSrc = [
    "'self'",
    "https://accounts.google.com",
    "https://www.paypal.com",
    "https://www.sandbox.paypal.com",
    "https://checkout-v2.paymongo.com",
    "https://js.stripe.com",
    "https://pagead2.googlesyndication.com",
    "https://googleads.g.doubleclick.net",
    "https://quge5.com",
    "https://*.quge5.com",
    "https://5gvci.com",
    "https://*.5gvci.com",
    "blob:",
  ];

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    `img-src ${imgSrc.join(" ")}`,
    `font-src 'self' data: https://fonts.gstatic.com https://*.gstatic.com`,
    `connect-src ${connectSrc.join(" ")}`,
    `frame-src ${frameSrc.join(" ")}`,
    `child-src ${frameSrc.join(" ")}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `media-src 'self'`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `frame-ancestors 'self'`,
  ];

  return directives.join("; ");
}

const ContentSecurityPolicy = buildCsp();

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "fontkit"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy.replace(/\s{2,}/g, " ").trim(),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
