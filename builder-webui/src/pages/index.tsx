import React from "react";
import dynamic from "next/dynamic";
import { ReactFlowProvider } from "@xyflow/react";

const Builder = dynamic(() => import("../components/Builder"), { ssr: false });

export default function Home() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}
