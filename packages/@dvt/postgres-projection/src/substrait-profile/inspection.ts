/** An unsupported bounded profile is not a verdict on general Substrait validity. */
export type UnsupportedProfile = Readonly<{ ok: false; reason: string }>;
export type ProfileCheck = Readonly<{ ok: true }> | UnsupportedProfile;
export type ProfileInspection<T> = Readonly<{ ok: true; value: T }> | UnsupportedProfile;

export function unsupportedProfile(reason: string): UnsupportedProfile {
  return { ok: false, reason };
}
