// Default import, not named/namespace: verified directly against this exact runtime (`node
// --input-type=module -e "..."`) that both named imports (`import { NepaliDate }`) and namespace
// imports (`import * as ns`) resolve `.NepaliDate` to `undefined` here — Node's cjs-module-lexer
// fails to detect this package's named exports on this install. The default import alone
// reliably resolves to the full CJS `module.exports` object at runtime. The package's own .d.ts
// types the default export as the class itself (`export default NepaliDate`), which doesn't
// match that runtime shape, hence the cast below.
import nepaliDateLibrary from 'nepali-date-library';
import type { NepaliDate as NepaliDateClass } from 'nepali-date-library';
import type { JurisdictionProfile } from '@quote-engine/engine';

const { NepaliDate } = nepaliDateLibrary as unknown as { NepaliDate: typeof NepaliDateClass };

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * Today's date formatted the way the given jurisdiction's own calendar expects
 * (DD/MM/YYYY gregorian, YYYY/MM/DD bikram_sambat) — used only for the dashboard's
 * "next quote number" preview. Actual quote numbers always derive their fiscal year from the
 * quote's own date field, not from this.
 */
export function todayInProfileCalendar(profile: JurisdictionProfile): string {
  if (profile.calendar.system === 'bikram_sambat') {
    const today = new NepaliDate();
    return `${today.getYear()}/${pad2(today.getMonth() + 1)}/${pad2(today.getDate())}`;
  }
  const today = new Date();
  return `${pad2(today.getDate())}/${pad2(today.getMonth() + 1)}/${today.getFullYear()}`;
}
