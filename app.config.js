// Dynamic Expo config, layered on top of app.json.
// Development / preview builds may talk to plain http:// servers (Herd, `php artisan serve`, a LAN address).
// Production builds (EAS profile "production", or MATCHUP_RELEASE=1 for local release builds) are https-only,
// which is what App Store review and Google Play expect.
module.exports = ({ config }) => {
  const release = process.env.EAS_BUILD_PROFILE === 'production' || process.env.MATCHUP_RELEASE === '1';
  if (release) return config;

  const name = (p) => (Array.isArray(p) ? p[0] : p);
  const plugins = (config.plugins || []).map((p) => {
    if (name(p) !== 'expo-build-properties') return p;
    const opts = Array.isArray(p) ? p[1] || {} : {};
    return ['expo-build-properties', { ...opts, android: { ...(opts.android || {}), usesCleartextTraffic: true } }];
  });
  return {
    ...config,
    ios: { ...config.ios, infoPlist: { ...(config.ios?.infoPlist || {}), NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } },
    plugins,
  };
};
