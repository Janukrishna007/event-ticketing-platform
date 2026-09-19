import { ArrowLeft, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

export default function AccessDeniedPage() {
  return <><SiteHeader /><main className="center-state"><div className="center-state-icon"><LockKeyhole /></div><p className="section-kicker">Protected workspace</p><h1>This area belongs to another role.</h1><p>Your account is signed in, but it does not have permission to open this workspace.</p><Button asChild className="rounded-full"><a href="/"><ArrowLeft /> Return to events</a></Button></main></>;
}
