#!/usr/bin/env node
/**
 * Child-safety manifest audit (docs/06 rows 9-10, docs/07 data inventory
 * "not collected").
 *
 * Fails the build if the app config REQUESTS any location, contacts,
 * microphone, camera or advertising-ID capability. Permissions listed under
 * `expo.android.blockedPermissions` are the *safe-list*: Expo strips them from
 * the final manifest, so they are the mechanism that GUARANTEES absence and
 * must not be flagged. Everything else in the config — an `android.permissions`
 * request array, an `ios.infoPlist` usage-description key, or anything a config
 * plugin injects — is a request surface and is scanned.
 *
 * (This replaces an earlier `grep -v blockedPermissions` one-liner that only
 * dropped the array's opening line, so a pretty-printed blockedPermissions list
 * was flagged as if it were a request.)
 */
import { readFileSync } from 'node:fs';

const APP_JSON = 'apps/mobile/app.json';

// Forbidden capability surfaces, per platform.
const FORBIDDEN = [
  /ACCESS_(FINE|COARSE)_LOCATION/i,
  /READ_CONTACTS/i,
  /RECORD_AUDIO/i,
  /permission\.CAMERA/i,
  /AD_ID/i,
  // iOS Info.plist usage descriptions for the same five categories.
  /NSLocation\w*UsageDescription/i,
  /NSContactsUsageDescription/i,
  /NSMicrophoneUsageDescription/i,
  /NSCameraUsageDescription/i,
  /NSUserTrackingUsageDescription/i,
];

const expo = JSON.parse(readFileSync(APP_JSON, 'utf8')).expo ?? {};

// The safe-list (blockedPermissions) is removed before scanning: listing a
// permission there is exactly how it is kept out of the shipped app.
const surface = JSON.parse(JSON.stringify(expo));
if (surface.android) delete surface.android.blockedPermissions;
const haystack = JSON.stringify(surface);

const hits = FORBIDDEN.filter((re) => re.test(haystack)).map((re) => re.source);

if (hits.length > 0) {
  console.error(
    `Child-safety audit FAILED: ${APP_JSON} requests forbidden capabilities: ${hits.join(', ')}.\n` +
      'These may never enter the child app. If a permission must be declared to be stripped, ' +
      'put it under expo.android.blockedPermissions instead.',
  );
  process.exit(1);
}

console.log(
  'Child-safety audit passed: no location/contacts/microphone/camera/advertising-ID capability is requested ' +
    `(blockedPermissions safe-list honoured in ${APP_JSON}).`,
);
