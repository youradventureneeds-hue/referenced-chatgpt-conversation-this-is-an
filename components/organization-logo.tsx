"use client";
import { useState } from "react";
export function OrganizationLogo({ name, src, large = false, darkBackground = false }: {
  name: string; src: string | null; large?: boolean; darkBackground?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name.replace(/\([^)]*\)/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("");
  return <span className={`organization-logo${large ? " organization-logo-large" : ""}${darkBackground && src && !failed ? " organization-logo-dark" : ""}`}>
    {src && !failed ? <img src={src} alt={`${name} logo`} width={large ? 120 : 56} height={large ? 120 : 56}
      loading={large ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} />
      : <span aria-label={`${name}; logo unavailable`} title="Logo unavailable">{initials}</span>}
  </span>;
}
