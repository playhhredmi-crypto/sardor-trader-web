"use client";

import { useState } from "react";

export default function Logo({ label = "Sardor Trader" }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="flex items-center gap-2.5">
      {!failed ? (
        <img
          src="/logo.png"
          alt={label}
          className="w-7 h-7 rounded-md object-cover"
          style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="w-2 h-2 rounded-full bg-gold" />
      )}
      <span className="font-mono text-sm tracking-widest uppercase text-muted">{label}</span>
    </span>
  );
}
