import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nimia Games",
    short_name: "Nimia",
    description:
      "Independent Game Development, Animation & Digital Assets Studio.",

    start_url: "/",

    display: "standalone",

    background_color: "#07070A",

    theme_color: "#07070A",

    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}