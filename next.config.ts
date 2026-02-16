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

// const ContentSecurityPolicy = `
//   default-src 'self';

//   script-src
//     'self'
//     'unsafe-inline'
//     'unsafe-eval'
//     https://www.paypal.com
//     https://pagead2.googlesyndication.com
//     https://partner.googleadservices.com
//     https://accounts.google.com
//     https://apis.google.com
//     https://ep2.adtrafficquality.google;

//   style-src
//     'self'
//     'unsafe-inline'
//     https://accounts.google.com/gsi;

//   img-src
//     'self'
//     data:
//     https://*.gstatic.com
//     https://*.google.com
//     https://lh3.googleusercontent.com;

//   font-src
//     'self'
//     data:;

//   connect-src
//     'self'
//     https://accounts.google.com
//     https:;

//   frame-src
//     https://www.paypal.com
//     https://pagead2.googlesyndication.com
//     https://googleads.g.doubleclick.net
//     https://accounts.google.com
//     https://ep2.adtrafficquality.google;

//   frame-ancestors 'self';
//   object-src 'none';
//   base-uri 'self';
//   form-action 'self';
//   media-src 'self';
//   worker-src 'self';
//   manifest-src 'self';
// `;
const ContentSecurityPolicy = `
  default-src 'self' https://*.google.com https://*.gstatic.com https://ep2.adtrafficquality.google;
  
  script-src
    'self'
    'unsafe-inline'
    'unsafe-eval'
    https://*.google.com
    https://*.gstatic.com
    https://ep2.adtrafficquality.google
    https://ep1.adtrafficquality.google
    https://accounts.google.com
    https://apis.google.com
    https://www.gstatic.com
    https://pagead2.googlesyndication.com
    https://partner.googleadservices.com
    https://www.googletagmanager.com
    https://googleads.g.doubleclick.net
    blob:;
  
  style-src
    'self'
    'unsafe-inline'
    https://*.google.com
    https://*.gstatic.com
    https://accounts.google.com
    https://fonts.googleapis.com;
  
  img-src
    'self'
    data:
    blob:
    https://*
    http://*;
  
  font-src
    'self'
    data:
    https://*.gstatic.com
    https://fonts.gstatic.com;
  
  connect-src
    'self'
    https://*
    wss://*
    https://ep2.adtrafficquality.google
    https://ep1.adtrafficquality.google;
  
  frame-src
    'self'
    https://*
    http://*
    blob:;
  
  child-src
    'self'
    https://*
    http://*
    blob:;
  
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  media-src 'self' https://*;
  worker-src 'self' blob:;
  manifest-src 'self';
`;

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
        ],
      },
    ];
  },
};

export default nextConfig;
