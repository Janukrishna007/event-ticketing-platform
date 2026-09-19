import { Mail, ShieldCheck, UserRound } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requirePageUser(undefined, "/account");
  return <><SiteHeader /><main className="account-page"><section className="account-hero"><p className="section-kicker">Your account</p><h1>{user.name}</h1><p>Your verified Google profile powers your event access across events by µlearn.</p></section><section className="account-profile-card"><div className="account-profile-icon"><UserRound /></div><div><span>Name</span><strong>{user.name}</strong></div><div><span>Email</span><strong><Mail /> {user.email}</strong></div><div><span>Access</span><strong><ShieldCheck /> {user.role}</strong></div><div className="account-menu-preview"><span>Account controls</span><AccountMenu user={user} /></div></section></main></>;
}
