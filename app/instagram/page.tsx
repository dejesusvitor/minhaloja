import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate, formatTime, initials } from "@/lib/format";
import type { Pedido } from "@/lib/types";

export default async function InstagramPage() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [{ data: doMes }, { data: geral }] = await Promise.all([
    supabase
      .from("pedidos")
      .select("*, cliente:clientes(nome), itens:pedido_itens(nome_produto)")
      .eq("origem", "instagram")
      .gte("created_at", inicioMes.toISOString())
      .order("created_at", { ascending: false }),
    supabase.from("pedidos").select("total, origem").gte("created_at", inicioMes.toISOString()),
  ]);

  const pedidos = (doMes ?? []) as Pedido[];
  const todos = geral ?? [];
  const totalMes = pedidos.reduce((s, p) => s + p.total, 0);
  const totalGeral = todos.reduce((s, p) => s + p.total, 0);
  const fatia = totalGeral ? Math.round((totalMes / totalGeral) * 100) : 0;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Ateliê · Instagram</div>
          <h1 className="page-title">Vendas pelo Instagram</h1>
          <div className="page-sub">Toda venda que nasce numa conversa de direct, sem se perder</div>
        </div>
        <Link href="/pedidos" className="btn btn-primary">
          + Registrar venda do Instagram
        </Link>
      </div>

      <div className="card" style={{ background: "var(--accent-soft)", borderColor: "transparent" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--accent-text)", marginBottom: 4 }}>
          Captura automática ainda não conectada
        </div>
        <div style={{ fontSize: 13, color: "var(--accent-text)" }}>
          Pra ler os directs automaticamente e sugerir pedidos sozinha, a Trama precisa de uma conexão com a API oficial do
          Instagram/Meta. Isso exige um app aprovado pela Meta, que só você (ou quem administra a conta comercial) pode
          criar. Enquanto isso, registre a venda manualmente em <Link href="/pedidos">Pedidos</Link> escolhendo{" "}
          <strong>Origem: Instagram</strong>. Ela aparece aqui do mesmo jeito. Configure a conexão em{" "}
          <Link href="/configuracoes">Configurações → Integrações</Link> quando tiver as credenciais.
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Vendas via Instagram este mês</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div className="serif" style={{ fontSize: 34 }}>
            {formatMoney(totalMes)}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--positive-text)" }}>{fatia}% de tudo que a loja vendeu</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 6 }}>{pedidos.length} pedidos</div>
      </div>

      <div className="card" style={{ padding: "6px 22px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, padding: "16px 0 4px" }}>Pedidos deste mês</div>
        {pedidos.length === 0 && <div style={{ padding: "16px 0", color: "var(--ink-soft)" }}>Nenhuma venda pelo Instagram ainda este mês.</div>}
        {pedidos.map((p) => (
          <div key={p.id} className="row divider-row" style={{ gap: 12, padding: "14px 0" }}>
            <div className="avatar" style={{ background: "oklch(92% 0 0)", color: "var(--ink-soft)" }}>
              {initials(p.cliente?.nome ?? "??")}
            </div>
            <div style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.cliente?.nome ?? "Cliente avulso"}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 2 }}>{p.itens?.map((i) => i.nome_produto).join(", ")}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-softer)" }}>
              {formatDate(p.created_at)} {formatTime(p.created_at)}
            </div>
            <div className="serif" style={{ fontSize: 16, fontWeight: 600, minWidth: 82, textAlign: "right" }}>
              {formatMoney(p.total)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
