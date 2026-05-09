async function excluirServico(id: string) {
  const confirmar = confirm(
    "Deseja realmente excluir este serviço? Os planos vinculados também serão excluídos se não estiverem em uso."
  );

  if (!confirmar) return;

  try {
    const res = await fetch("/api/admin/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "excluir_servico",
        id,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || "Erro ao excluir serviço.");
      return;
    }

    alert("Serviço excluído.");
    await carregarCatalogo(adminToken);
  } catch (error) {
    console.log(error);
    alert("Erro ao excluir serviço.");
  }
}

async function excluirPlano(id: string) {
  const confirmar = confirm(
    "Deseja realmente excluir este plano?"
  );

  if (!confirmar) return;

  try {
    const res = await fetch("/api/admin/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "excluir_plano",
        id,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || "Erro ao excluir plano.");
      return;
    }

    alert("Plano excluído.");
    await carregarCatalogo(adminToken);
  } catch (error) {
    console.log(error);
    alert("Erro ao excluir plano.");
  }
}