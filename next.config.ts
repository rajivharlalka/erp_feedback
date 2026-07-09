import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Transpile deck.gl / maplibre so Next's bundler handles their ESM correctly.
  transpilePackages: [
    '@deck.gl/core',
    '@deck.gl/layers',
    '@deck.gl/mapbox',
    'maplibre-gl',
  ],
};

export default nextConfig;
