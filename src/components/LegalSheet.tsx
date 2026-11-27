import React from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, errMsg } from '../api';
import { Button, Notice } from '../ui';
import { colors, radius } from '../theme';

/** One piece of a page from GET /pages/{slug}: text, or { tag, children, href? } (headings, paragraphs, lists, bold, links). */
type Node = string | { tag: string; children: Node[]; href?: string };
type Page = { title: string; updated_at: string | null; blocks: Node[] };
export type LegalSlug = 'privacy' | 'terms';

const BLOCKS = new Set(['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'blockquote']);
const textColor = '#C9D4E8';

/** Inline text (bold, italic, code, links) inside a <Text>. */
function inline(nodes: Node[], key = 'i'): React.ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}-${i}`;
    if (typeof n === 'string') return n;
    if (n.tag === 'br') return '\n';
    if (n.tag === 'strong') return <Text key={k} style={{ fontWeight: '800', color: colors.text }}>{inline(n.children, k)}</Text>;
    if (n.tag === 'em') return <Text key={k} style={{ fontStyle: 'italic' }}>{inline(n.children, k)}</Text>;
    if (n.tag === 'code') return <Text key={k} style={{ fontFamily: 'monospace', color: colors.text }}>{inline(n.children, k)}</Text>;
    if (n.tag === 'a') return <Text key={k} style={{ color: colors.primarySoft, textDecorationLine: 'underline' }} onPress={() => n.href && Linking.openURL(n.href)}>{inline(n.children, k)}</Text>;
    return <Text key={k}>{inline(n.children, k)}</Text>;   // a block inside a list item: keep its text
  });
}

/** Headings, paragraphs, lists and callouts. */
function blocks(nodes: Node[], key = 'b'): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let loose: Node[] = [];   // inline pieces between blocks
  const flush = () => { if (loose.length) { out.push(<Text key={`${key}-t${out.length}`} style={{ color: textColor, fontSize: 14.5, lineHeight: 22, marginBottom: 10 }}>{inline(loose, `${key}-t${out.length}`)}</Text>); loose = []; } };
  nodes.forEach((n, i) => {
    const k = `${key}-${i}`;
    if (typeof n === 'string' || !BLOCKS.has(n.tag)) { loose.push(n); return; }
    flush();
    if (/^h[1-4]$/.test(n.tag)) out.push(<Text key={k} accessibilityRole="header" style={{ color: colors.text, fontSize: 16.5, fontWeight: '800', marginTop: 14, marginBottom: 6 }}>{inline(n.children, k)}</Text>);
    else if (n.tag === 'p') out.push(<Text key={k} style={{ color: textColor, fontSize: 14.5, lineHeight: 22, marginBottom: 10 }}>{inline(n.children, k)}</Text>);
    else if (n.tag === 'ul' || n.tag === 'ol') {
      out.push(<View key={k} style={{ marginBottom: 10 }}>{n.children.filter((c) => typeof c !== 'string').map((li, j) => (
        <View key={`${k}-${j}`} style={{ flexDirection: 'row', marginBottom: 6 }}>
          <Text style={{ color: textColor, fontSize: 14.5, lineHeight: 22, width: 22 }}>{n.tag === 'ol' ? `${j + 1}.` : '•'}</Text>
          <Text style={{ flex: 1, color: textColor, fontSize: 14.5, lineHeight: 22 }}>{inline(typeof li === 'string' ? [li] : li.children, `${k}-${j}`)}</Text>
        </View>
      ))}</View>);
    } else if (n.tag === 'blockquote') out.push(<View key={k} style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, backgroundColor: colors.primary + '12', borderRadius: 8, padding: 10, marginBottom: 10 }}>{blocks(n.children, k)}</View>);
    else out.push(<Text key={k} style={{ color: textColor, fontSize: 14.5, lineHeight: 22, marginBottom: 10 }}>{inline(n.children, k)}</Text>);
  });
  flush();
  return out;
}

/** Privacy policy / Terms of use in a sheet inside the app (instead of opening the browser). */
export function LegalSheet({ slug, onClose }: { slug: LegalSlug | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const q = useQuery({ queryKey: ['page', slug], queryFn: () => api.get<Page>(`/pages/${slug}`), enabled: !!slug, staleTime: 10 * 60 * 1000 });
  if (!slug) return null;
  const title = slug === 'terms' ? 'Terms of use' : 'Privacy policy';
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }}>
        <View style={{ height: '88%', backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingBottom: insets.bottom + 12 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: 10 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
            <Text accessibilityRole="header" style={{ flex: 1, color: colors.text, fontSize: 20, fontWeight: '800' }}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}
              style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            {q.isLoading ? <ActivityIndicator color={colors.primarySoft} style={{ marginTop: 30 }} />
              : q.error ? <Notice tone="error">{errMsg(q.error)}</Notice>
              : <>
                  {blocks(q.data?.blocks ?? [])}
                  {q.data?.updated_at ? <Text style={{ color: colors.dim, fontSize: 12.5, marginTop: 6 }}>Last updated {new Date(q.data.updated_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}</Text> : null}
                </>}
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}><Button title="Close" kind="ghost" onPress={onClose} /></View>
        </View>
      </View>
    </Modal>
  );
}
