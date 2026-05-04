"use client";

import { Suspense } from "react";
import SucessoContent from "./SucessoContent";

export default function Page() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <SucessoContent />
    </Suspense>
  );
}