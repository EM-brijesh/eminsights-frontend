import { Suspense } from "react";
import ChannelConfigClient from "./ChannelConfigClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0e12] text-white p-8">Loading...</div>}>
      <ChannelConfigClient />
    </Suspense>
  );
}
