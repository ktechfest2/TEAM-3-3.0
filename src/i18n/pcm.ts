import type { MessageKey } from "./en";
// Nigerian Pidgin - machine-assisted draft. NEEDS NATIVE-SPEAKER REVIEW before real-world use.
export const pcm: Partial<Record<MessageKey, string>> = {
  "common.loading": "E dey load…", "common.retry": "Try again", "common.error": "Something happen. Try again.",
  "common.empty": "Nothing dey here yet", "common.offline": "You no get network. We go send am when network come back.",
  "auth.title": "Sign in to Votepaddie", "auth.email": "Your email", "auth.sendCode": "Send code", "auth.verify": "Confirm", "auth.resend": "Send code again",
  "home.hello": "How far", "home.ready": "Get ready for election", "home.guide": "How voting dey work", "home.facts": "Fact-checks",
  "home.factsSignIn": "Sign in to see fact-checks", "home.factsSignInBody": "Sign in so you fit see verified news and fact-checks.",
  "home.listen": "Listen", "home.translate": "Translate", "home.machineTranslated": "Machine translate am - mistake fit dey",
  "home.unitMoved": "Polling units fit move. Confirm yours with INEC before election day.",
  "unit.title": "Your polling unit", "unit.search": "Search unit, ward or LGA", "unit.moved": "Polling units fit move. Confirm yours with INEC before election day.",
  "unit.waiting": "Dey wait", "unit.accredited": "Don accredit", "unit.voted": "Don vote", "unit.join": "Join line", "unit.leave": "Leave line",
  "unit.iAccredited": "Dem don accredit me", "unit.iVoted": "I don vote",
  "unit.unofficial": "No be official. INEC no dey run this line. No comot from the real queue unless officials tell you.",
  "scan.title": "Scan result sheet", "scan.capture": "Snap the sheet",
  "scan.limits": "The photo fingerprint show say this exact photo dey for this time. E no prove say the sheet na correct one.",
  "help.title": "Help board", "help.need": "I need help", "help.offer": "I fit help",
  "help.safety": "No send money, and no share your phone number or house address. Meet only for the polling unit.",
  "me.title": "Me", "me.language": "Language", "me.theme": "Theme", "me.delete": "Delete my account", "me.langNote": "Machine translate am - mistake fit dey.",
};
