import Link from "next/link";
export function SiteHeader() { return <header className="header"><Link className="brand" href="/">The Great Indian Outdoors</Link><nav><Link href="/jobs">Find jobs</Link><Link href="/organizations">Organizations</Link><Link href="/employers">For employers</Link><Link className="button small" href="/employers">Employer sign in</Link></nav></header>; }
