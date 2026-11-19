import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Votepaddie",
    short_name: "Votepaddie",
    description: "Voter readiness and result trust for Nigerian elections.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060507",
    theme_color: "#060507",
    categories: ["utilities", "news", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scan result sheet", url: "/scan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My polling unit", url: "/unit", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
