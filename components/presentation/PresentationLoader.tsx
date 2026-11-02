"use client";

import dynamic from "next/dynamic";
import Loader from "@/components/ui/Loader";

const Presentation = dynamic(() => import("./Presentation"), { ssr: false, loading: () => <Loader /> });

export default function PresentationLoader() {
  return <Presentation />;
}