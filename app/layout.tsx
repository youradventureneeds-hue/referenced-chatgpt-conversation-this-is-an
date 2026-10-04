import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
export const metadata: Metadata = { title: "The Great Indian Outdoors | Outdoor careers worldwide", description: "Find meaningful work, gap-year roles and outdoor opportunities worldwide." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SiteHeader />{children}<footer>The Great Indian Outdoors · Global outdoor careers and gap-year opportunities</footer></body></html>; }
