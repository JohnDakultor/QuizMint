import { MetadataRoute } from "next";


export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin-login", "/api/"],
      },
    ],
    host: "https://www.quizmintai.com",
    sitemap: "https://www.quizmintai.com/sitemap.xml",
  };
}
