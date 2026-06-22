import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` output is for self-hosting (see the `start` script:
  // `bun .next/standalone/server.js`). On Vercel the platform builds its own output;
  // also emitting a standalone server trace duplicates node_modules — including the
  // large native ML packages below — into /vercel/output, bloating the upload and
  // contributing to the failure at the "Deploying outputs..." step. Vercel sets
  // VERCEL=1 during builds, so only enable standalone when NOT building on Vercel.
  output: process.env.VERCEL ? undefined : "standalone",

  // Keep heavy native packages external (do not bundle them into the JS output).
  serverExternalPackages: ["@lancedb/lancedb", "apache-arrow", "@xenova/transformers", "onnxruntime-node", "sharp"],

  // On Vercel, exclude the large optional ML/vector packages from the serverless
  // function file trace. They are only used by the AI/RAG path (src/lib/vector-db.ts),
  // which is imported lazily and degrades gracefully when the packages are absent.
  // Excluding them keeps each function under Vercel's 250 MB unzipped limit — the most
  // probable cause of the deploy-output failure. Not applied for self-hosting.
  // `sharp` is intentionally NOT excluded (used by Next.js image optimization).
  outputFileTracingExcludes: process.env.VERCEL
    ? {
        "**": [
          "node_modules/@lancedb/**",
          "node_modules/@xenova/**",
          "node_modules/onnxruntime-node/**",
          "node_modules/apache-arrow/**",
        ],
      }
    : undefined,

  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;