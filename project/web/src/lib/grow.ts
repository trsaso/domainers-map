/** Point-earning actions shown on the Grow page. `done` marks actions the seed profile has already completed. */
export interface GrowAction {
  id: string;
  t: string;
  s: string;
  pts: number;
  action?: string;
  isNew?: boolean;
  done?: boolean;
}

export const GROW: GrowAction[] = [
  { id: "post_link", t: "Post with your link", s: "+10 per post, up to 3 a day, plus its replies and likes. Then verify.", pts: 10, action: "Post →", isNew: true },
  { id: "say_hi", t: "Say hi to a match", s: "A company or domainer the matcher paired you with", pts: 10, action: "Meet →" },
  { id: "meetup", t: "Organize a meetup", s: "Domainers near you get notified", pts: 150, action: "Plan it →" },
  { id: "x_bio", t: "Your page in your X bio", s: "+5 a day while your pinned post has the link", pts: 5, done: true },
  { id: "lander", t: "Badge on your domain landers", s: "+1 a day per site, up to 3 sites", pts: 3, done: true },
  { id: "dns", t: "Verify ownership by DNS", s: "+15 per listed domain, up to 10 — unlocks the DNS tier", pts: 15, action: "Verify →" },
  { id: "priced", t: "List a domain with a price", s: "+5 each; priced listings get 3× the offers", pts: 5, done: true },
  { id: "attest", t: "Attest a completed deal", s: "+100 when the counterparty confirms — unlocks the Attested tier", pts: 100, action: "Attest →" },
  { id: "review", t: "Review a broker", s: "One you have actually worked with", pts: 20, action: "Review →", isNew: true },
  { id: "email", t: "Confirm your email", s: "Tap the link in the email we sent you", pts: 25, action: "Resend →", isNew: true },
  { id: "intro", t: "Your intro post", s: "Found: you’re X-verified", pts: 0, done: true },
];

export const isDone = (a: GrowAction, actions: Record<string, boolean>) => !!a.done || !!actions[a.id];

/** Members ranked inside this band are visible worldwide (zoom ≤ 3). */
export const TOP_N = 20;
