import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AgeBand } from '@littlegrip/core';
import { AGE_BANDS, createProfile, validateProfileInput } from '@littlegrip/core';
import { useAppStore } from '../state/appStore';
import { parentTheme } from '../ui/theme';
import { ParentRow, PrimaryButton } from '../ui/components';

/**
 * Onboarding (docs/03 section 3.5): parent-addressed, no account, no email,
 * no OS permission prompts. Shows the APP 5 collection summary BEFORE the
 * profile is created (docs/07 section 7.3).
 */
export function OnboardingScreen(): React.JSX.Element {
  const { saveProfile, navigate } = useAppStore();
  const [step, setStep] = useState<'welcome' | 'profile' | 'privacy'>('welcome');
  const [nickname, setNickname] = useState('');
  const [ageBand, setAgeBand] = useState<AgeBand>('3-5');
  const [error, setError] = useState<string | null>(null);
  const theme = parentTheme;

  const errorMessages: Record<string, string> = {
    'nickname-empty': 'Please choose a nickname.',
    'nickname-too-long': 'That nickname is a bit long - 20 characters or fewer.',
    'nickname-looks-like-contact-info':
      'Please use a fun nickname without email addresses or phone numbers.',
    'invalid-age-band': 'Please pick an age range.',
  };

  async function finish(): Promise<void> {
    const input = { nickname, ageBand };
    const problems = validateProfileInput(input);
    if (problems.length > 0) {
      setError(errorMessages[problems[0]!] ?? 'Please check the details.');
      setStep('profile');
      return;
    }
    const profile = createProfile(input, `profile-${Date.now()}`, Date.now());
    await saveProfile(profile);
    navigate({ name: 'home' });
  }

  return (
    <ScrollView style={[styles.root, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      {step === 'welcome' && (
        <View>
          <Text style={styles.h1}>Welcome to Little Grip 🖐️</Text>
          <Text style={styles.body}>
            Playful drawing, tracing, puzzles and games that help build fine-motor skills -
            for children aged 2 to 7.
          </Text>
          <Text style={[styles.body, styles.grownUps]}>
            For grown-ups: set-up takes under a minute. No account. No ads. No chat. Everything
            stays on this device.
          </Text>
          <PrimaryButton label="Set up (for grown-ups)" theme={theme} onPress={() => setStep('profile')} />
        </View>
      )}

      {step === 'profile' && (
        <View>
          <Text style={styles.h1}>Your child</Text>
          <Text style={styles.label}>Nickname (a fun name is perfect)</Text>
          <TextInput
            accessibilityLabel="Child's nickname"
            style={styles.input}
            value={nickname}
            onChangeText={(t) => {
              setNickname(t);
              setError(null);
            }}
            maxLength={20}
            autoCorrect={false}
          />
          <Text style={styles.label}>Age range</Text>
          {AGE_BANDS.map((band) => (
            <ParentRow
              key={band}
              title={`${band} years`}
              theme={theme}
              onPress={() => setAgeBand(band)}
              right={<Text style={styles.radio}>{ageBand === band ? '●' : '○'}</Text>}
            />
          ))}
          {error && (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          )}
          <PrimaryButton label="Next" theme={theme} onPress={() => setStep('privacy')} />
        </View>
      )}

      {step === 'privacy' && (
        <View>
          <Text style={styles.h1}>Privacy, in plain English</Text>
          <Text style={styles.body}>• Your child's play, artwork and progress stay on this device.</Text>
          <Text style={styles.body}>• We store only the nickname and age range you chose - no name, no birthday, no email.</Text>
          <Text style={styles.body}>• No ads, no chat, no sharing, no location.</Text>
          <Text style={styles.body}>• You can delete everything any time in Parent Settings → Privacy & Data.</Text>
          <Text style={styles.body}>The full privacy notice is available in Parent Settings.</Text>
          <PrimaryButton label="Agree and start playing" theme={theme} onPress={() => void finish()} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24 },
  h1: { fontSize: 26, fontWeight: '700', marginBottom: 16, color: '#1F2933' },
  body: { fontSize: 16, lineHeight: 24, marginBottom: 10, color: '#1F2933' },
  grownUps: { fontStyle: 'italic' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4, color: '#1F2933' },
  input: {
    borderWidth: 1,
    borderColor: '#C5CDD4',
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    backgroundColor: '#FFFFFF',
  },
  radio: { fontSize: 22, color: '#2F6F62' },
  error: { color: '#B3261E', fontSize: 15, marginTop: 8 },
});
