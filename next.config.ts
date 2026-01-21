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
  https://accounts.google.com
  https://apis.google.com
  https://www.gstatic.com
  https://pagead2.googlesyndication.com
  https://partner.googleadservices.com
  https://tpc.googlesyndication.com;

style-src
  'self'
  'unsafe-inline'
  https://accounts.google.com
  https://www.gstatic.com;

style-src-elem
  'self'
  'unsafe-inline'
  https://accounts.google.com
  https://www.gstatic.com;

img-src
  'self'
  data:
  https://lh3.googleusercontent.com
  https://*.gstatic.com
  https://*.googleusercontent.com
  https://googleads.g.doubleclick.net
  https://pagead2.googlesyndication.com;

connect-src
  'self'
  https://accounts.google.com
  https://oauth2.googleapis.com
  https://www.googleapis.com;

frame-src
  https://accounts.google.com
  https://www.google.com
  https://googleads.g.doubleclick.net
  https://tpc.googlesyndication.com;

frame-ancestors 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
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
