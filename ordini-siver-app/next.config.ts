import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  allowedDevOrigins: ["192.168.1.141"],

  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;