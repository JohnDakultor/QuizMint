import { MetadataRoute } from "next";


export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    host: "https://quizmintai.com",
    sitemap: "https://quizmintai.com/sitemap.xml",
  };
}
