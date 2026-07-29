// Owner clay UI button art (home / back / next / save), mirroring the web demo's
// clayBtn(). Metro resolves only literal require() paths, so each is listed here.
type ArtMap = Record<string, number>;

export const UI_ART: ArtMap = {
  home: require('../../../../assets/images/home-icon.png'),
  back: require('../../../../assets/images/back-icon.png'),
  next: require('../../../../assets/images/next-icon.png'),
  save: require('../../../../assets/images/save-with-label.png'),
  replay: require('../../../../assets/images/ui-replay.png'),
};
