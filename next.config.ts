import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

function getLanHostnames(): string[] {
  const interfaces = networkInterfaces();
  const hosts = Object.values(interfaces)
    .flatMap((iface) => iface ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address.trim())
    .filter(Boolean);

  return Array.from(new Set(hosts));
}

function getEnvAllowedOrigins(): string[] {
  const raw = process.env.NEXT_ALLOWED_DEV_ORIGINS;
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const NGROK_WILDCARDS = ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.io", "*.ngrok.app"];

const allowedDevOrigins = Array.from(
  new Set([...getLanHostnames(), ...getEnvAllowedOrigins(), ...NGROK_WILDCARDS])
);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;

