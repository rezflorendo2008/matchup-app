// Dynamic Expo config, layered on top of app.json.
// Development / preview builds may talk to plain http:// servers (Herd, `php artisan serve`, a LAN address).
// Production builds (EAS profile "production", or PICKARENA_RELEASE=1 for local release builds) are https-only,
// which is what App Store review and Google Play expect.
const fs = require('fs');

module.exports = ({ config: base }) => {
  // Android push notifications need Firebase: put google-services.json in the app folder (or point GOOGLE_SERVICES_JSON at it in EAS).
  const gs = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);
  const config = gs ? { ...base, android: { ...base.android, googleServicesFile: gs } } : base;
  const release = process.env.EAS_BUILD_PROFILE === 'production' || process.env.PICKARENA_RELEASE === '1';
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
