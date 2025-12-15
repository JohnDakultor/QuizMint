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

const ContentSecurityPolicy = `
  default-src 'self';
  script-src
    'self'
    'unsafe-inline'
    'unsafe-eval'
    https://pagead2.googlesyndication.com
    https://partner.googleadservices.com;
  style-src
    'self'
    'unsafe-inline';
  img-src
    'self'
    data:
    https://*.gstatic.com
    https://*.google.com;
  font-src
    'self'
    data:;
  connect-src
    'self'
    https:;
  frame-src
    https://pagead2.googlesyndication.com
    https://googleads.g.doubleclick.net;
  frame-ancestors 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  media-src 'self';
  worker-src 'self';
  manifest-src 'self';
`;

const nextConfig: NextConfig = {
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
        ],
      },
    ];
  },
};

export default nextConfig;
