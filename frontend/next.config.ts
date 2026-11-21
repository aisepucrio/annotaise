import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Eventos de inotify não atravessam o bind mount Windows -> container Linux,
  // então sem polling o hot reload nunca dispara. Só afeta desenvolvimento.
  watchOptions: {
    pollIntervalMs: 1000,
  },
};

export default nextConfig;
