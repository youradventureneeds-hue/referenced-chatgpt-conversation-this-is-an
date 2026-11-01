import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
export const metadata: Metadata = { title: "The Great Indian Outdoors | Outdoor careers worldwide", description: "Find meaningful work, gap-year roles and outdoor opportunities worldwide." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SiteHeader />{children}<footer>The Great Indian Outdoors · Global outdoor careers and gap-year opportunities <span style={{display:"inline-flex",gap:16,marginLeft:20}}><Link href="/privacy">Instagram privacy</Link><Link href="/data-deletion">Data requests</Link></span></footer></body></html>; }
