"use client";

import { useEffect } from "react";
import LoginPremium from "@/components/login/LoginPremium";

export default function LoginClientePage() {
  useEffect(() => {
    const token = localStorage.getItem("clienteToken");

    if (token) {
      window.location.href = "/cliente";
    }
  }, []);

  return <LoginPremium />;
}