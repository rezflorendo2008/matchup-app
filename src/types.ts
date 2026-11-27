export interface User {
  id: number; /** 7-digit Player ID players give their club owner */ player_id?: string | null; name: string; phone: string | null; email: string | null;
  phone_verified: boolean; kyc_status: string; can_predict: boolean; verified?: boolean; id_required?: boolean; is_owner: boolean;
  /** when the display name can next be changed (null = now) */
  name_change_at?: string | null;
  /** clubs still deciding on this player's join request */
  pending_clubs?: string[];
  /** account settings: verified mobile (required when the admin switches it on) and an email change waiting for its code */
  mobile_verified?: boolean; mobile_required?: boolean; pending_email?: string | null;
  /** one of the player's clubs has Refer & earn switched on */
  referral_enabled?: boolean;
}
export interface Category { id: number; name: string; slug: string; icon: string | null }
export interface LiveVideo { url: string; provider: 'youtube' | 'facebook' | 'twitch' | 'link'; embed_url: string | null }
export interface Match {
  id: number; club_id: number; club: string; title: string; club_logo: string | null; club_verified: boolean; event_id: number | null; event: string | null; event_starts_at: string | null; category_id: number | null; category: string | null;
  category_icon: string | null; side_a: string; side_b: string; status: 'upcoming' | 'open' | 'paused' | 'closed' | 'settled';
  predictions_open: boolean; scheduled_at: string | null; max_diamonds: number | null; multiplier_a: number | null; multiplier_b: number | null;
  /** club + platform fee, % of a winner's profit (for the 'You could win' preview) */
  fee_pct?: number;
  result: string | null; mode: 'peer' | 'club'; open_a: number | null; open_b: number | null; my_diamonds?: number; has_score?: boolean; score_a?: number | null; score_b?: number | null; live_video?: LiveVideo | null;
  /** club owner or match agent: may close predictions and set the winner */
  can_manage?: boolean;
}
export interface Prediction {
  id: number; match_id: number; match: string; club_id: number; side: 'a' | 'b'; amount: number; matched_amount: number;
  status: string; reward: number | null; can_edit: boolean; created_at: string;
  /** player vs player: who it was matched against (in order), what came back unmatched, and the amount first predicted */
  matched_with?: { name: string; amount: number; self?: boolean }[]; unmatched_refund?: number | null; original_amount?: number;
}
export interface Club {
  id: number; name: string; club_code: string; logo: string | null; banner?: string | null; id_required?: boolean; referral?: { text: string } | null; club_pays: boolean; commission_pct: number; status: string;
  membership: string | null; balance: number | null;
}
export interface ClubProfile extends Club {
  tagline: string | null; can_predict: boolean;
  stats: { club_predictions: number; members: number; matches: number; my_predictions: number; my_active: number; my_won: number; my_lost: number };
  my_current: { id: number; match_id: number; match: string; side_name: string; amount: number; matched_amount: number; created_at: string }[];
  current_matches: Match[]; past_matches: Match[]; join_link?: string | null; join_qr_svg?: string | null;
}
export interface Promo {
  id: number; type: 'promo' | 'ad'; title: string; subtitle: string | null; sponsor: string | null; image: string | null;
  link_type: 'none' | 'url' | 'match' | 'club'; link_value: string | null;
  /** show just the picture: title and text hidden (ads keep the Sponsored label) */
  image_only?: boolean;
}
export interface EventItem {
  id: number; title: string; description: string | null; location: string | null; image: string | null;
  starts_at: string; ends_at: string | null; category: string | null; category_icon: string | null;
}
export interface FeaturedClub {
  id: number; name: string; club_code: string; tagline: string | null; logo: string | null; club_pays: boolean;
  members: number; membership: string | null;
}
export interface Home { featured_clubs: FeaturedClub[]; promos: Promo[]; ads: Promo[]; events: EventItem[]; has_clubs: boolean }
export interface WalletRow { club_id: number; club: string; balance: number }
export interface Tx { id: number; type: string; amount: number; balance_after: number; note: string | null; created_at: string; /** lost predictions: diamonds lost */ lost_amount?: number }
export interface Req { id: number; type: 'diamonds_request'; amount: number; status: string; note: string | null; created_at: string }
export interface SubStatus { subscribed: boolean; plan: string | null; expires_at: string | null; limit: number | null; used: number; remaining: number | null; club_limit: number | null; clubs_used: number }
export interface Plan { id: number; name: string; product_id: string; monthly_match_limit: number | null; max_clubs: number | null; price_label: string | null }
