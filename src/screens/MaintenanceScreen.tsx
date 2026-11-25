import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Dim, Logo, Screen, T, c } from '../ui';
import { BASE } from '../config';
import { useMaint } from '../maintenance';

/** Shown instead of the whole app while the admin has maintenance mode on. Checks the server and returns by itself. */
export default function MaintenanceScreen() {
  const info = useMaint((s) => s.info);
  const clear = useMaint((s) => s.clear);

  const check = async () => {
    try {
      const r = await fetch(`${BASE}/status`, { headers: { Accept: 'application/json' } });
      const s = await r.json();
      if (!s.maintenance) clear();
    } catch { /* still unreachable, keep waiting */ }
  };
  useEffect(() => { const t = setInterval(check, 15000); return () => clearInterval(t); }, []);

  const eta = info.eta ? new Date(info.eta) : null;
  const etaText = eta && eta.getTime() > Date.now() ? `Expected back about ${eta.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : null;

  return (
    <Screen hideBar>
      <View style={{ minHeight: 560, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 }}>
        <Logo size={30} />
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginTop: 28, marginBottom: 22 }}>
          <Text style={{ fontSize: 34 }}>🛠️</Text>
        </View>
        <Text style={{ color: c.text, fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 }}>{info.title || "We'll be right back"}</Text>
        <Dim style={{ textAlign: 'center', marginTop: 10, fontSize: 16, lineHeight: 23 }}>{info.message || 'PickArena is being updated. Please check back in a few minutes.'}</Dim>
        {etaText ? <Card style={{ marginTop: 16, paddingVertical: 8 }}><T style={{ color: c.brand, fontWeight: '700' }}>{etaText}</T></Card> : null}
        <View style={{ alignSelf: 'stretch', marginTop: 24 }}><Button title="Check again" onPress={check} /></View>
        <Dim style={{ textAlign: 'center', marginTop: 18, fontSize: 12 }}>Your diamonds and predictions are safe. This screen updates by itself.</Dim>
      </View>
    </Screen>
  );
}
