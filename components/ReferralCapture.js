"use client";

import { useEffect } from "react";

export default function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) window.localStorage.setItem("pending_referral_code", ref);
  }, []);
  return null;
}