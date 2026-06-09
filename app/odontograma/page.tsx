import { Suspense } from "react";
import OdontogramaCanvas from "./OdontogramaCanvas";

export default function OdontogramaPage() {
  return (
    <Suspense fallback={null}>
      <OdontogramaCanvas />
    </Suspense>
  );
}
