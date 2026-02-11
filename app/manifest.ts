import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Photo Vault",
    short_name: "Vault",
    description: "A personal photo vault experience.",
    start_url: "/gallery",
    scope: "/",
    display: "standalone",
    background_color: "#080810",
    theme_color: "#080810",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/512?purpose=maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

