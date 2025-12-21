import { MetadataRoute } from "next";


export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
        },
        sitemap: "https://quizmintai.com/sitemap.xml",
    };
}