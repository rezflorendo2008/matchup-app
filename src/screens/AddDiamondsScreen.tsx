import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { Badge, Button, Card, Chip, Dim, ErrorBox, Field, H2, Loading, Row, Screen, T, pts, when } from '../ui';
import type { Club } from '../types';
import { showAlert } from '../dialog';
import { useClubContext } from '../club';

export default function AddDiamondsScreen({ navigation, route }: any) {
  const qc = useQueryClient();
  const clubsQ = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs') });
  const approved = (clubsQ.data ?? []).filter((x) => x.membership === 'approved');
  const [clubId, setClubId] = useState<number | null>(null);
  const { active } = useClubContext();
  const club = approved.find((x) => x.id === (clubId ?? route?.params?.clubId)) ?? approved.find((x) => x.id === active?.id) ?? approved[0];
  const [amount, setAmount] = useState('');

  const reqs = useQuery({ enabled: !!club, queryKey: ['tx', club?.id, 'requests'], queryFn: () => api.get<{ id: number; amount: number; status: string; created_at: string }[]>(`/clubs/${club!.id}/requests`) });
  const request = useMutation({
    mutationFn: () => api.post(`/clubs/${club!.id}/diamonds/request`, { amount: Number(amount) }),
    onSuccess: () => { setAmount(''); qc.invalidateQueries({ queryKey: ['tx'] }); showAlert('Request sent', 'Your club owner will see it. Diamonds appear in your balance when the owner adds them.'); },
    onError: (e) => showAlert('Could not send request', errMsg(e)),
  });
  const n = Number(amount);

  return (
    <Screen title="Get diamonds">
      <Dim style={{ marginBottom: 12 }}>Only your club owner can add diamonds to your account. You can ask for more below, and you can see everything added or claimed in your history.</Dim>
      {clubsQ.isLoading ? <Loading /> : clubsQ.error ? <ErrorBox error={clubsQ.error} onRetry={() => clubsQ.refetch()} />
        : !club ? (
          <Card><T>Join a club and get verified first.</T><Button title="Find a club" style={{ marginTop: 10 }} onPress={() => navigation.navigate('Tabs', { screen: 'Clubs' })} /></Card>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {approved.map((x) => <Chip key={x.id} label={`${x.name} · ${pts(x.balance)}`} active={x.id === club.id} onPress={() => setClubId(x.id)} />)}
            </ScrollView>
            <Card>
              <T style={{ fontWeight: '700', fontSize: 16 }}>🙋 Ask {club.name}</T>
              <Field label="Diamonds" value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="e.g. 500" />
              <Button title="Send request" onPress={() => request.mutate()} loading={request.isPending} disabled={!(n >= 1)} />
            </Card>

            {(reqs.data ?? []).length > 0 ? <H2>My requests</H2> : null}
            {(reqs.data ?? []).slice(0, 10).map((r) => (
              <Card key={r.id}>
                <Row style={{ justifyContent: 'space-between' }}><T>💎 {pts(r.amount)}</T><Badge text={r.status === 'approved' ? 'added' : r.status} /></Row>
                <Dim>{when(r.created_at)}</Dim>
              </Card>
            ))}
          </>
        )}
      <Dim style={{ textAlign: 'center', marginTop: 18 }}>Diamonds are virtual, have no cash value and cannot be bought, withdrawn or exchanged for prizes.</Dim>
    </Screen>
  );
}
