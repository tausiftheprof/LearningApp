import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../../state/appStore';
import { parentTheme } from '../../ui/theme';

/**
 * Parental gate (FR-017, docs/03 section 3.4). Word-form arithmetic answered
 * on a keypad; 3 misses -> 60s calm pause; unlock navigates to the parent
 * dashboard. Core state machine: @littlehands/core parentalGate.
 */
export function GateScreen(): React.JSX.Element {
  const { gate, gateBegin, gateSubmit, navigate } = useAppStore();
  const [entry, setEntry] = useState('');
  const theme = parentTheme;

  useEffect(() => {
    gateBegin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gate.status === 'unlocked') navigate({ name: 'parent', section: 'dashboard' });
  }, [gate.status, navigate]);

  function press(digit: string): void {
    if (digit === '⌫') {
      setEntry(entry.slice(0, -1));
      return;
    }
    if (digit === '✓') {
      const answer = Number(entry);
      setEntry('');
      if (!Number.isNaN(answer)) gateSubmit(answer);
      return;
    }
    if (entry.length < 3) setEntry(entry + digit);
  }

  const lockedOut = gate.status === 'lockout';

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to child home" onPress={() => navigate({ name: 'home' })} style={styles.back}>
        <Text style={styles.backText}>← Back to play</Text>
      </Pressable>
      <Text style={styles.title}>For grown-ups</Text>
      {lockedOut ? (
        <Text style={styles.lockout}>
          Let's take a little break. Please try again in a minute.
        </Text>
      ) : (
        <>
          <Text style={styles.subtitle}>To continue, answer in digits:</Text>
          <Text style={styles.question} accessibilityLabel={`Question: ${gate.challenge?.question ?? ''}`}>
            {gate.challenge?.question ?? '…'}
          </Text>
          <Text style={styles.entry}>{entry || ' '}</Text>
          <View style={styles.pad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === '⌫' ? 'Delete' : key === '✓' ? 'Submit answer' : key}
                onPress={() => press(key)}
                style={styles.key}
              >
                <Text style={styles.keyText}>{key}</Text>
              </Pressable>
            ))}
          </View>
          {gate.failedAttempts > 0 && (
            <Text accessibilityLiveRegion="polite" style={styles.tryAgain}>
              Not quite - here's a new question.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', padding: 24 },
  back: { alignSelf: 'flex-start', padding: 8 },
  backText: { fontSize: 16, color: '#2F6F62' },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2933', marginTop: 12 },
  subtitle: { fontSize: 15, color: '#1F2933', marginTop: 16 },
  question: { fontSize: 22, fontWeight: '700', color: '#1F2933', marginVertical: 12 },
  entry: { fontSize: 32, fontWeight: '800', color: '#2F6F62', minHeight: 44 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'center' },
  key: { width: 72, height: 60, margin: 4, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 24, color: '#1F2933' },
  tryAgain: { marginTop: 12, fontSize: 15, color: '#1F2933' },
  lockout: { fontSize: 18, color: '#1F2933', marginTop: 32, textAlign: 'center' },
});
