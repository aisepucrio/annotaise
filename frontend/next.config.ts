import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // O projeto roda em container Linux com bind mount vindo do sistema de
  // arquivos do Windows. Eventos de inotify não atravessam essa fronteira, e
  // sem isso o hot reload nunca dispara: o container recebe o arquivo novo mas
  // o Next.js não percebe e continua servindo a versão já compilada.
  // Com pollIntervalMs o watcher confere os arquivos por conta própria — vale
  // para webpack e Turbopack. Só afeta o modo de desenvolvimento.
  watchOptions: {
    pollIntervalMs: 1000,
  },
};

export default nextConfig;
