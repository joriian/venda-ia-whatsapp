async function iniciarSessao() {
  const params = new URLSearchParams(window.location.search);

  const tokenUrl = params.get("token");
  const clienteUrl = params.get("cliente");

  if (tokenUrl && clienteUrl) {
    localStorage.setItem("clienteToken", tokenUrl);
    localStorage.setItem("clienteId", clienteUrl);
  }

  const token = tokenUrl || localStorage.getItem("clienteToken");

  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const res = await fetch("/api/cliente/sessao", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      limparSessaoLocal();
      window.location.href = "/login";
      return;
    }

    const id = data.clienteId;
    const instance = `cliente_${id.replace(/-/g, "")}`;

    setClienteId(id);
    setClienteToken(token);
    setInstanceName(instance);

    localStorage.setItem("clienteId", id);
    localStorage.setItem("clienteNome", data.nome || "");
    localStorage.setItem("clienteEmail", data.email || "");

    await iniciar(id, token, instance);

    const interval = setInterval(() => {
      verificarStatus(instance);
    }, 5000);

    return () => clearInterval(interval);
  } catch (error) {
    console.error(error);
    limparSessaoLocal();
    window.location.href = "/login";
  }
}