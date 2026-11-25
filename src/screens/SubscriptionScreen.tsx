import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { buyProduct, purchasesAvailable, restorePurchases, setupPurchases } from '../purchases';
import { useAuth } from '../store';
import { Button, Card, Dim, ErrorBox, H1, H2, Loading, Screen, T, c } from '../ui';
import type { Plan, SubStatus } from '../types';

export default function SubscriptionScreen({ navigation }: any) {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user)!;
  const [ready, setReady] = useState(false);
  const status = useQuery({ queryKey: ['sub'], queryFn: () => api.get<SubStatus>('/me/subscription') });
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.get<Plan[]>('/subscription/plans') });

  useEffect(() => { setupPurchases(user.id).then(setReady); }, [user.id]);

  const refresh = useMutation({
    mutationFn: () => api.post<SubStatus>('/me/subscription/refresh'),
    onSuccess: (d) => qc.setQueryData(['sub'], d),
    onError: (e) => Alert.alert('Could not verify purchase', errMsg(e)),
  });
  const buy = useMutation({
    mutationFn: async (p: Plan) => { await buyProduct(p.product_id); return refresh.mutateAsync(); },
    onError: (e: any) => { if (!e?.userCancelled) Alert.alert('Purchase failed', errMsg(e)); },
  });
  const restore = useMutation({
    mutationFn: async () => { await restorePurchases(); return refresh.mutateAsync(); },
    onError: (e) => Alert.alert('Restore failed', errMsg(e)),
  });

  const s = status.data;
  return (
    <Screen>
      <Button title="‹ Back" kind="ghost" onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, marginBottom: 10 }} />
      <H1>Owner subscription</H1>
      {status.isLoading ? <Loading /> : status.error ? <ErrorBox error={status.error} onRetry={() => status.refetch()} /> : s ? (
        <Card>
          <T style={{ fontWeight: '700' }}>{s.subscribed ? `Plan: ${s.plan}` : 'Free plan'}</T>
          <Dim>Matches this month: {s.used}{s.limit === null ? ' (unlimited)' : ` of ${s.limit}`}</Dim>
          <Dim>Clubs: {s.clubs_used}{s.club_limit === null ? ' (unlimited)' : ` of ${s.club_limit}`}</Dim>
          {s.expires_at ? <Dim>Renews / expires {new Date(s.expires_at).toLocaleDateString()}</Dim> : null}
        </Card>
      ) : null}

      <H2>Plans</H2>
      {!purchasesAvailable() || !ready ? (
        <Card style={{ borderColor: c.warn }}><Dim>In-app purchases need a RevenueCat key and an installed build (not Expo Go). See the README section "In-app subscriptions".</Dim></Card>
      ) : null}
      {(plans.data ?? []).map((p) => (
        <Card key={p.id}>
          <T style={{ fontWeight: '700' }}>{p.name}</T>
          <Dim>{p.monthly_match_limit === null ? 'Unlimited matches per month' : `${p.monthly_match_limit} matches per month`} · {p.max_clubs === null ? 'unlimited clubs' : `${p.max_clubs} club${p.max_clubs === 1 ? '' : 's'}`}{p.price_label ? ` · ${p.price_label}` : ''}</Dim>
          <Button title="Subscribe" style={{ marginTop: 10 }} disabled={!ready} loading={buy.isPending && buy.variables?.id === p.id} onPress={() => buy.mutate(p)} />
        </Card>
      ))}
      <Button title="Restore purchases" kind="ghost" onPress={() => restore.mutate()} loading={restore.isPending} disabled={!ready} />
    </Screen>
  );
}
