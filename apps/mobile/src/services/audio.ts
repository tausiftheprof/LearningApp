/**
 * MOCK / ILLUSTRATIVE COMPONENT.
 *
 * Instruction audio playback (FR-014). Production behaviour: play the
 * pack-relative asset through expo-audio, honouring the profile's sound
 * preferences. Per the updated PRD and A-12, every instruction recording is a
 * **soft female voice** (warm, unhurried); voice talent/generation choice and
 * recordings are reviewed in the CMS audio checklist (docs/12) before
 * publishing. In this scaffold the starter pack's audio files are
 * placeholders, so playback is a silent no-op that logs nothing
 * (secure-logging rule: no child data, docs/09).
 */

export interface AudioService {
  playInstruction(assetRef: string): Promise<void>;
  playEffect(name: 'celebrate' | 'gentle-pop' | 'soft-chime'): Promise<void>;
}

class PlaceholderAudioService implements AudioService {
  async playInstruction(_assetRef: string): Promise<void> {
    // Intentionally silent until production audio assets ship via the CMS.
  }
  async playEffect(_name: 'celebrate' | 'gentle-pop' | 'soft-chime'): Promise<void> {
    // Intentionally silent.
  }
}

export const audioService: AudioService = new PlaceholderAudioService();
