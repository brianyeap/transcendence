import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // let the dev server accept requests coming through an ngrok tunnel
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev"],
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);