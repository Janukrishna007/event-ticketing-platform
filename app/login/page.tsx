import { ArrowLeft, CheckCircle2, ShieldCheck, Ticket } from "lucide-react";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/google-sign-in";
import { getCurrentUser } from "@/lib/auth";

function safeNext(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(nextPath);
  return <main className="login-page"><a className="login-back" href="/"><ArrowLeft /> Back to events</a><section className="login-card"><div className="login-brand"><span className="brand-mark"><Ticket /></span><span className="brand-name">events <small>by</small> µlearn</span></div><div className="login-copy"><p className="section-kicker">One account, every event</p><h1>Welcome in.</h1><p>Use your Google account to register faster, keep your tickets together, or manage events securely.</p></div><GoogleSignIn nextPath={nextPath} /><div className="login-assurances"><span><CheckCircle2 /> Attendees see only their tickets</span><span><ShieldCheck /> Organizer tools are role-protected</span></div><p className="login-legal">By continuing, you agree to use the platform responsibly. We only store the profile details required to operate your account.</p></section><aside className="login-visual" aria-hidden="true"><div className="login-orbit login-orbit-one"/><div className="login-orbit login-orbit-two"/><div className="login-pass"><div><span>events by µlearn</span><Ticket /></div><p>YOUR EVENT PASS</p><strong>Everything you&apos;re joining.<br/>One beautiful place.</strong><span className="login-pass-code">GOOGLE · VERIFIED · SECURE</span></div></aside></main>;
}
