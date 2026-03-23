import type { Metadata } from "next";
import TourBuilderClient from "@/components/TourBuilderClient";

export const metadata: Metadata = { title: "Tour Builder" };

export default function Page() {
  return <TourBuilderClient />;
}
