"use client";

import { useEffect, useRef } from "react";

export default function TradingViewWidget({ scriptSrc, config, height = 400 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify(config);

    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptSrc, JSON.stringify(config)]);

  return <div className="tradingview-widget-container" ref={containerRef} style={{ height }} />;
}