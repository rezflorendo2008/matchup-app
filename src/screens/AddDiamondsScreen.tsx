import { useEffect } from 'react';

/** Old route: shows My diamonds with the request popup open (asking is now a popup, not a page). */
export default function AddDiamondsScreen({ navigation }: any) {
  useEffect(() => { navigation.replace('Diamonds', { request: true }); }, []);
  return null;
}
