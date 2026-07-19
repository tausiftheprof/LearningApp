/**
 * App audio (FR-014).
 *
 * Sound EFFECTS are real: short, self-contained tones bundled with the app
 * (`assets/sounds/`), played through expo-audio. They are procedurally
 * generated (a soft completion chime and a gentle interaction pop) — no voice,
 * no network, no recording — so they ship offline with the child experience.
 *
 * Instruction VOICE playback is still a placeholder: the starter pack's
 * per-activity narration recordings arrive later via the CMS audio pipeline
 * (docs/12, reviewed for the PRD's soft-female-voice requirement, A-12), so
 * `playInstruction` is a deliberate silent no-op until those assets exist. It
 * never logs (secure-logging rule: no child data, docs/09).
 *
 * Playback only — expo-audio is added WITHOUT its config plugin, so no
 * microphone/RECORD_AUDIO permission is introduced (that permission also stays
 * in app.json's `blockedPermissions`, keeping the child-safety audit green).
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export interface AudioService {
  playInstruction(assetRef: string): Promise<void>;
  playEffect(name: 'celebrate' | 'gentle-pop' | 'soft-chime'): Promise<void>;
}

// Bundled effect sources (require paths are resolved by Metro at build time).
const EFFECT_SOURCES = {
  'soft-chime': require('../../assets/sounds/chime.wav'),
  celebrate: require('../../assets/sounds/chime.wav'),
  'gentle-pop': require('../../assets/sounds/pop.wav'),
} as const;

class ExpoAudioService implements AudioService {
  private players: Partial<Record<keyof typeof EFFECT_SOURCES, AudioPlayer>> = {};
  private audioModeSet = false;

  async playInstruction(_assetRef: string): Promise<void> {
    // Intentionally silent until production voice assets ship via the CMS.
  }

  async playEffect(name: 'celebrate' | 'gentle-pop' | 'soft-chime'): Promise<void> {
    try {
      if (!this.audioModeSet) {
        // Mix with other audio; never force playback in silent mode.
        await setAudioModeAsync({ playsInSilentMode: false });
        this.audioModeSet = true;
      }
      let player = this.players[name];
      if (!player) {
        player = createAudioPlayer(EFFECT_SOURCES[name]);
        this.players[name] = player;
      }
      // Rewind so rapid repeats (e.g. successive pops) always retrigger.
      player.seekTo(0);
      player.play();
    } catch {
      // Effects are non-essential; never let a sound failure break play.
    }
  }
}

export const audioService: AudioService = new ExpoAudioService();
