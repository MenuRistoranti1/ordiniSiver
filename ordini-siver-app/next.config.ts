import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  /*
    pdfjs va lasciato fuori dal bundle del server: impacchettandolo, il suo
    worker interno non viene più trovato a runtime e la lettura dei PDF
    fallisce con "Setting up fake worker failed".
  */
  serverExternalPackages: ["pdfjs-dist"],

  allowedDevOrigins: ["192.168.1.141", "192.168.2.41"],

  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;