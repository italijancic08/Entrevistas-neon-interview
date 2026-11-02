"use client";

import { useEffect, useState } from "react";

export interface Device {
  portrait: boolean;
  lowPower: boolean;
  reduced: boolean;
}

function read(): Device {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return {
    portrait: window.innerWidth < 700 || window.innerWidth / window.innerHeight < 1,
    lowPower: coarse || (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2,
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

export function useDevice(): Device {
  const [d, setD] = useState<Device>(read);
  useEffect(() => {
    const on = () =>
      setD((prev) => {
        const n = read();
        return n.portrait === prev.portrait && n.lowPower === prev.lowPower && n.reduced === prev.reduced ? prev : n;
      });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return d;
}