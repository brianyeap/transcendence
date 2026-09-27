import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // let the dev server accept requests coming through an ngrok tunnel,
  // and from private LAN IPs (e.g. http://10.13.8.2:3000 on the 42 network,
  // 192.168.x.x at home). Used by run_lan.sh.
  // Without this, Next blocks its own JS files and the page never becomes interactive.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "10.*.*.*", "172.*.*.*", "192.168.*.*"],
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);