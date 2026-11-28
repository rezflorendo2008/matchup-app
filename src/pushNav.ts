import { useActiveClub } from './club';

type Nav = { navigate: (name: string, params?: any) => void };
export type NoteData = { type?: string; match_id?: number | string; prediction_id?: number | string; club_id?: number | string; [k: string]: any };

/**
 * Where a notification takes the player (a push that was tapped, or a row in the notification centre).
 * One map for both, so they always agree; the website uses the same rules.
 * When the notification belongs to another of the player's clubs, that club becomes the one they're in.
 */
export function openNotification(nav: Nav, type: string | undefined, data: NoteData = {}): void {
  const t = type ?? data.type ?? '';
  const clubId = data.club_id != null ? Number(data.club_id) : null;
  if (clubId && ['membership', 'diamonds', 'wallet', 'referral'].includes(t)) useActiveClub.getState().set(clubId);

  if (data.match_id) return nav.navigate('Prediction', { id: Number(data.match_id) });      // match open / reminder / result, prediction won or lost
  switch (t) {
    case 'prediction': case 'won': case 'lost': case 'refunded': return nav.navigate('Tabs', { screen: 'History' });
    case 'diamonds': case 'wallet': return nav.navigate('Diamonds');
    case 'referral': return nav.navigate('Referral', clubId ? { clubId } : undefined);
    case 'membership': return clubId ? nav.navigate('Club', { id: clubId }) : nav.navigate('Tabs', { screen: 'Clubs' });
    case 'kyc': return nav.navigate('Verify');
    case 'issue': return nav.navigate('Tabs', { screen: 'Profile' });
    default: return nav.navigate('Tabs', { screen: 'Alerts' });                               // anything new: the notification centre
  }
}
