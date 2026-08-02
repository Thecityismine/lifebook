import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { reauthenticateParent } from '@/services/auth';
import {
  createFamilyInvite,
  familyInviteUrl,
  removeFamilyMember,
  revokeFamilyInvite,
  shareFamilyInvite,
  subscribeToFamilyInvites,
  subscribeToFamilyMembers,
  transferFamilyOwnership,
  updateFamilyMemberRole,
  type CollaborationRole,
  type FamilyInvite,
  type FamilyMember,
  type InviteRole,
} from '@/services/collaboration';

const roleCopy: Record<CollaborationRole, { label: string; detail: string; color: string; soft: string }> = {
  owner: { label: 'Owner', detail: 'Controls access, privacy, exports, and ownership.', color: AppColors.violet, soft: AppColors.violetSoft },
  guardian: { label: 'Guardian', detail: 'Can read and, when enabled, contribute to the archive.', color: AppColors.mint, soft: AppColors.mintSoft },
  member: { label: 'Viewer', detail: 'Can read the private family archive without editing.', color: AppColors.sky, soft: AppColors.skySoft },
};

function dateLabel(value: FamilyInvite['expiresAt']) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value.toDate()) : 'soon';
}

export default function FamilyAccessScreen() {
  const router = useRouter();
  const { user, setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('guardian');
  const [lastInviteUrl, setLastInviteUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removeTarget, setRemoveTarget] = useState('');
  const [transferTarget, setTransferTarget] = useState<FamilyMember | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [openedAt] = useState(() => Date.now());
  const currentMember = useMemo(
    () => members.find((member) => member.userId === user?.uid) || null,
    [members, user?.uid],
  );
  const isOwner = currentMember?.role === 'owner';
  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === 'pending' && (invite.expiresAt?.toMillis() || 0) > openedAt),
    [invites, openedAt],
  );

  useEffect(() => {
    if (!familyId) return;
    return subscribeToFamilyMembers(
      familyId,
      (value) => { setMembers(value); setLoading(false); },
      (message) => { setError(message); setLoading(false); },
    );
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !isOwner) {
      return;
    }
    return subscribeToFamilyInvites(familyId, setInvites, setError);
  }, [familyId, isOwner]);

  function resetMessages() {
    setError('');
    setNotice('');
  }

  async function handleCreateInvite() {
    resetMessages();
    setBusy('invite');
    const result = await createFamilyInvite(familyId, email, inviteRole);
    setBusy('');
    if (!result.ok) { setError(result.message); return; }
    const url = familyInviteUrl(result.token);
    setLastInviteUrl(url);
    setEmail('');
    const shareResult = await shareFamilyInvite(url);
    if (!shareResult.ok) { setNotice('Invitation created. Copy the link shown below.'); return; }
    setNotice(shareResult.copied ? 'Invitation created and copied.' : 'Invitation created and ready to share.');
  }

  async function handleShareAgain() {
    resetMessages();
    const result = await shareFamilyInvite(lastInviteUrl);
    if (!result.ok) { setError(result.message); return; }
    setNotice(result.copied ? 'Invitation link copied.' : 'Invitation link shared.');
  }

  async function handleRevoke(inviteId: string) {
    resetMessages(); setBusy(`invite-${inviteId}`);
    const result = await revokeFamilyInvite(familyId, inviteId);
    setBusy('');
    if (!result.ok) { setError(result.message); return; }
    setNotice('Invitation revoked. Its link can no longer be accepted.');
  }

  async function handleRole(member: FamilyMember) {
    const role: InviteRole = member.role === 'guardian' ? 'member' : 'guardian';
    resetMessages(); setBusy(`member-${member.userId}`);
    const result = await updateFamilyMemberRole(familyId, member.userId, role);
    setBusy('');
    if (!result.ok) { setError(result.message); return; }
    setNotice(`${member.displayName} is now a ${roleCopy[role].label.toLowerCase()}.`);
  }

  async function handleRemove(member: FamilyMember) {
    if (removeTarget !== member.userId) { setRemoveTarget(member.userId); return; }
    resetMessages(); setBusy(`member-${member.userId}`);
    const result = await removeFamilyMember(familyId, member.userId);
    setBusy(''); setRemoveTarget('');
    if (!result.ok) { setError(result.message); return; }
    setNotice(`${member.displayName} no longer has access. They can be invited again later.`);
  }

  async function handleTransfer() {
    if (!transferTarget || !password) return;
    resetMessages(); setBusy('transfer');
    const authResult = await reauthenticateParent(password);
    if (!authResult.ok) { setBusy(''); setError(authResult.message); return; }
    const result = await transferFamilyOwnership(familyId, transferTarget.userId);
    setBusy(''); setPassword('');
    if (!result.ok) { setError(result.message); return; }
    setTransferTarget(null);
    setNotice('Ownership transferred. You remain in the family as a guardian.');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color={AppColors.ink} /></Pressable>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>Private collaboration</Text><Text style={styles.title}>Family access</Text><Text style={styles.subtitle}>Invite trusted adults, choose what they can do, and keep one accountable owner.</Text></View>
        </View>

        <View style={styles.hero}><View style={styles.heroIcon}><Ionicons name="people" size={31} color={AppColors.violet} /></View><View style={styles.heroCopy}><Text style={styles.heroTitle}>Access stays invitation-only</Text><Text style={styles.heroText}>Links expire after seven days, work once, and must match a verified email address. Family records never become public.</Text></View></View>

        {loading ? <ActivityIndicator color={AppColors.violet} /> : null}

        {isOwner ? (
          <View style={styles.card}>
            <View><Text style={styles.sectionTitle}>Invite someone</Text><Text style={styles.helper}>A Guardian may contribute when guardian editing is enabled. A Viewer has read-only access.</Text></View>
            <FormField label="Email address" placeholder="trusted-adult@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" value={email} onChangeText={(value) => { setEmail(value); resetMessages(); }} />
            <View accessibilityRole="radiogroup" style={styles.rolePicker}>{(['guardian', 'member'] as InviteRole[]).map((role) => <Pressable key={role} accessibilityRole="radio" accessibilityState={{ checked: inviteRole === role }} onPress={() => setInviteRole(role)} style={[styles.roleOption, inviteRole === role && styles.roleOptionSelected]}><View style={[styles.roleDot, { backgroundColor: roleCopy[role].soft }]}><Ionicons name={role === 'guardian' ? 'create-outline' : 'eye-outline'} size={19} color={roleCopy[role].color} /></View><Text style={styles.roleLabel}>{roleCopy[role].label}</Text><Text style={styles.roleDetail}>{roleCopy[role].detail}</Text></Pressable>)}</View>
            <PrimaryButton label="Create secure invitation" icon="person-add" loading={busy === 'invite'} disabled={!/^\S+@\S+\.\S+$/.test(email.trim())} onPress={() => void handleCreateInvite()} />
            {lastInviteUrl ? <View style={styles.linkBox}><Text style={styles.linkLabel}>Newest invitation link</Text><Text selectable numberOfLines={3} style={styles.linkValue}>{lastInviteUrl}</Text><Pressable accessibilityRole="button" onPress={() => void handleShareAgain()} style={styles.textButton}><Ionicons name="share-outline" size={18} color={AppColors.violet} /><Text style={styles.textButtonLabel}>Copy or share again</Text></Pressable></View> : null}
          </View>
        ) : (
          <View style={styles.infoCard}><Ionicons name="information-circle" size={24} color={AppColors.sky} /><Text style={styles.infoText}>Only the current owner can invite people or change family access. Your current role is {currentMember ? roleCopy[currentMember.role].label : 'being loaded'}.</Text></View>
        )}

        {isOwner && pendingInvites.length ? <View style={styles.card}><Text style={styles.sectionTitle}>Pending invitations</Text>{pendingInvites.map((invite, index) => <View key={invite.id}>{index ? <View style={styles.divider} /> : null}<View style={styles.inviteRow}><View style={styles.memberCopy}><Text style={styles.memberName}>{invite.email}</Text><Text style={styles.memberMeta}>{roleCopy[invite.role].label} · expires {dateLabel(invite.expiresAt)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Revoke invitation for ${invite.email}`} disabled={busy === `invite-${invite.id}`} onPress={() => void handleRevoke(invite.id)} style={styles.smallDanger}><Text style={styles.smallDangerText}>{busy === `invite-${invite.id}` ? 'Revoking…' : 'Revoke'}</Text></Pressable></View></View>)}</View> : null}

        <View style={styles.card}>
          <View><Text style={styles.sectionTitle}>Family members</Text><Text style={styles.helper}>{members.length} verified {members.length === 1 ? 'account has' : 'accounts have'} access.</Text></View>
          {members.map((member, index) => {
            const visual = roleCopy[member.role];
            const canManage = isOwner && member.role !== 'owner';
            return <View key={member.userId}>{index ? <View style={styles.divider} /> : null}<View style={styles.memberRow}><View style={[styles.avatar, { backgroundColor: visual.soft }]}><Text style={[styles.avatarText, { color: visual.color }]}>{(member.displayName || member.email).charAt(0).toUpperCase()}</Text></View><View style={styles.memberCopy}><Text style={styles.memberName}>{member.displayName}{member.userId === user?.uid ? ' (you)' : ''}</Text><Text style={styles.memberMeta}>{member.email}</Text><View style={[styles.badge, { backgroundColor: visual.soft }]}><Text style={[styles.badgeText, { color: visual.color }]}>{visual.label}</Text></View></View></View>{canManage ? <View style={styles.memberActions}><Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={() => void handleRole(member)} style={styles.actionButton}><Text style={styles.actionLabel}>Make {member.role === 'guardian' ? 'Viewer' : 'Guardian'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setTransferTarget(member); setRemoveTarget(''); resetMessages(); }} style={styles.actionButton}><Text style={styles.actionLabel}>Transfer ownership</Text></Pressable><Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={() => void handleRemove(member)} style={[styles.actionButton, removeTarget === member.userId && styles.confirmButton]}><Text style={[styles.actionLabel, styles.removeLabel]}>{removeTarget === member.userId ? 'Confirm removal' : 'Remove'}</Text></Pressable></View> : null}</View>;
          })}
        </View>

        {transferTarget ? <View style={styles.transferCard}><View style={styles.transferHeading}><Ionicons name="key-outline" size={25} color={AppColors.sun} /><View style={styles.memberCopy}><Text style={styles.transferTitle}>Transfer ownership to {transferTarget.displayName}?</Text><Text style={styles.helper}>They will control access and privacy. You will become a Guardian. Confirm your password to continue.</Text></View></View><FormField label="Confirm your password" placeholder="Your account password" secureTextEntry autoCapitalize="none" autoComplete="password" textContentType="password" value={password} onChangeText={(value) => { setPassword(value); resetMessages(); }} /><PrimaryButton label="Transfer family ownership" icon="key" loading={busy === 'transfer'} disabled={!password} onPress={() => void handleTransfer()} /><Pressable accessibilityRole="button" onPress={() => { setTransferTarget(null); setPassword(''); }} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel transfer</Text></Pressable></View> : null}

        {error ? <View accessibilityRole="alert" style={styles.errorBox}><Ionicons name="alert-circle" size={19} color={AppColors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
        {notice ? <View accessibilityRole="alert" style={styles.noticeBox}><Ionicons name="checkmark-circle" size={19} color={AppColors.mint} /><Text style={styles.noticeText}>{notice}</Text></View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.cloud }, content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl, paddingBottom: Spacing.section, gap: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg }, iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, headerCopy: { flex: 1 }, eyebrow: { color: AppColors.violet, fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' }, title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 30, fontWeight: '800', marginTop: 3 }, subtitle: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  hero: { flexDirection: 'row', gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.xl, backgroundColor: AppColors.ink, ...Shadow.card }, heroIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: AppColors.paper }, heroCopy: { flex: 1 }, heroTitle: { color: AppColors.paper, fontSize: 18, fontWeight: '800' }, heroText: { color: '#C9D0E0', fontSize: 13, lineHeight: 20, marginTop: 5 },
  card: { gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card }, sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '800' }, helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  rolePicker: { flexDirection: 'row', gap: Spacing.md }, roleOption: { flex: 1, minHeight: 132, padding: Spacing.md, borderWidth: 1, borderColor: AppColors.line, borderRadius: Radius.lg }, roleOptionSelected: { borderColor: AppColors.violet, backgroundColor: AppColors.violetSoft }, roleDot: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md }, roleLabel: { color: AppColors.ink, fontSize: 14, fontWeight: '800', marginTop: Spacing.sm }, roleDetail: { color: AppColors.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  linkBox: { padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.violetSoft, gap: Spacing.sm }, linkLabel: { color: AppColors.violet, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }, linkValue: { color: AppColors.ink, fontSize: 12, lineHeight: 18 }, textButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, textButtonLabel: { color: AppColors.violet, fontSize: 13, fontWeight: '800' },
  infoCard: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.skySoft }, infoText: { flex: 1, color: AppColors.ink, fontSize: 13, lineHeight: 20 }, inviteRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, smallDanger: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: AppColors.blushSoft }, smallDangerText: { color: AppColors.danger, fontSize: 12, fontWeight: '800' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, avatar: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full }, avatarText: { fontSize: 18, fontWeight: '800' }, memberCopy: { flex: 1 }, memberName: { color: AppColors.ink, fontSize: 14, fontWeight: '800' }, memberMeta: { color: AppColors.inkMuted, fontSize: 12, marginTop: 3 }, badge: { alignSelf: 'flex-start', marginTop: Spacing.sm, paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.full }, badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }, divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line },
  memberActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginLeft: 58 }, actionButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: Radius.full, borderWidth: 1, borderColor: AppColors.line }, confirmButton: { backgroundColor: AppColors.blushSoft, borderColor: '#F4C8D3' }, actionLabel: { color: AppColors.violet, fontSize: 11, fontWeight: '800' }, removeLabel: { color: AppColors.danger },
  transferCard: { gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.sunSoft, borderWidth: 1, borderColor: '#F1D78E' }, transferHeading: { flexDirection: 'row', gap: Spacing.md }, transferTitle: { color: AppColors.ink, fontSize: 16, fontWeight: '800' }, cancelButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: AppColors.inkMuted, fontSize: 13, fontWeight: '800' },
  errorBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft }, errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 }, noticeBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.mintSoft }, noticeText: { flex: 1, color: AppColors.ink, fontSize: 13, lineHeight: 19 },
});
