import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatTime, initials } from "@/lib/format";
import type { Pedido, Vendedora, CrediarioMovimento, Cliente } from "@/lib/types";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function PainelPage() {
  const desde = startOfToday();

  const [{ data: pedidosHoje }, { data: vendedoras }, { data: movimentos }, { data: clientes }] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select("*, cliente:clientes(nome), vendedora:vendedoras(nome), itens:pedido_itens(nome_produto)")
        .gte("created_at", desde)
        .order("created_at", { ascending: false }),
      supabase.from("vendedoras").select("*"),
      supabase.from("crediario_movimentos").select("*, cliente:clientes(nome)"),
      supabase.from("clientes").select("*"),
    ]);

  const pedidos = (pedidosHoje ?? []) as Pedido[];
  const vends = (vendedoras ?? []) as Vendedora[];
  const movs = (movimentos ?? []) as (CrediarioMovimento & { cliente: { nome: string } | null })[];

  const entrouHoje = pedidos.filter((p) => p.status === "pago").reduce((s, p) => s + p.total, 0);
  const pedidosCount = pedidos.length;
  const ticketMedio = pedidosCount ? entrouHoje / pedidosCount || pedidos.reduce((s, p) => s + p.total, 0) / pedidosCount : 0;

  const comissaoPorVendedora = vends.map((v) => {
    const total = pedidos.filter((p) => p.vendedora_id === v.id).reduce((s, p) => s + p.total, 0);
    return { vendedora: v, total, comissao: (total * v.comissao_percentual) / 100 };
  });
  const comissoesHoje = comissaoPorVendedora.reduce((s, c) => s + c.comissao, 0);

  const saldoPorCliente = new Map<string, { nome: string; saldo: number; ultimaCompra: string | null }>();
  for (const m of movs) {
    const key = m.cliente_id;
    const atual = saldoPorCliente.get(key) ?? { nome: m.cliente?.nome ?? "Cliente", saldo: 0, ultimaCompra: null };
    atual.saldo += m.tipo === "compra" ? m.valor : -m.valor;
    if (m.tipo === "compra" && (!atual.ultimaCompra || m.created_at > atual.ultimaCompra)) {
      atual.ultimaCompra = m.created_at;
    }
    saldoPorCliente.set(key, atual);
  }
  const devedores = Array.from(saldoPorCliente.values())
    .filter((c) => c.saldo > 0.01)
    .sort((a, b) => b.saldo - a.saldo);
  const totalCrediario = devedores.reduce((s, c) => s + c.saldo, 0);

  const origemCount: Record<string, number> = { loja: 0, instagram: 0, whatsapp: 0 };
  for (const p of pedidos) origemCount[p.origem] = (origemCount[p.origem] ?? 0) + 1;
  const totalOrigem = Math.max(1, pedidosCount);

  const hojeRaw = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const hoje = hojeRaw.charAt(0).toUpperCase() + hojeRaw.slice(1);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Ateliê · Painel</div>
          <h1 className="page-title">Bom dia</h1>
          <div className="page-sub">{hoje}. Resumo do dia.</div>
        </div>
        <Link href="/pedidos" className="btn btn-primary">
          + Novo pedido
        </Link>
      </div>

      <div className="grid-cols-5">
        <div className="card">
          <div className="label" style={{ marginBottom: 14 }}>
            Entrou hoje
          </div>
          <div className="serif" style={{ fontSize: 29 }}>
            {formatMoney(entrouHoje)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 6 }}>{pedidosCount} vendas hoje</div>
        </div>
        <div className="card">
          <div className="label" style={{ marginBottom: 14 }}>
            A receber (crediário)
          </div>
          <div className="serif" style={{ fontSize: 29 }}>
            {formatMoney(totalCrediario)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 6 }}>{devedores.length} clientes com saldo aberto</div>
        </div>
        <div className="card">
          <div className="label" style={{ marginBottom: 14 }}>
            Comissões do dia
          </div>
          <div className="serif" style={{ fontSize: 29 }}>
            {formatMoney(comissoesHoje)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 6 }}>
            {comissaoPorVendedora.map((c) => `${c.vendedora.nome} ${formatMoney(c.comissao)}`).join(" · ") || "-"}
          </div>
        </div>
        <div className="card">
          <div className="label" style={{ marginBottom: 14 }}>
            Pedidos hoje
          </div>
          <div className="serif" style={{ fontSize: 29 }}>
            {pedidosCount}
          </div>
        </div>
        <div className="card">
          <div className="label" style={{ marginBottom: 14 }}>
            Ticket médio
          </div>
          <div className="serif" style={{ fontSize: 29 }}>
            {formatMoney(ticketMedio || 0)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 6 }}>por venda, hoje</div>
        </div>
      </div>

      <div className="grid-split-wide">
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Atividade recente</div>
          {pedidos.length === 0 && (
            <div style={{ fontSize: 13.5, color: "var(--ink-soft)", padding: "16px 0" }}>Nenhum pedido ainda hoje.</div>
          )}
          {pedidos.slice(0, 6).map((p) => (
            <div key={p.id} className="row divider-row" style={{ gap: 14, padding: "12px 0" }}>
              <div className="avatar" style={{ background: "oklch(92% 0 0)", color: "var(--ink-soft)" }}>
                {initials(p.cliente?.nome ?? "??")}
              </div>
              <div style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.cliente?.nome ?? "Cliente avulso"}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 2 }}>
                  {p.itens?.map((i) => i.nome_produto).join(", ") || "-"} · {p.vendedora?.nome ?? "-"}
                  {p.origem !== "loja" ? ` · via ${p.origem === "instagram" ? "Instagram" : "WhatsApp"}` : ""}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-softer)", whiteSpace: "nowrap" }}>{formatTime(p.created_at)}</div>
              <div className="serif" style={{ fontSize: 16, fontWeight: 600, minWidth: 82, textAlign: "right" }}>
                {formatMoney(p.total)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Crediário vencendo</div>
            {devedores.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Ninguém deve nada agora.</div>}
            {devedores.slice(0, 3).map((c) => {
              const dias = c.ultimaCompra
                ? Math.max(0, Math.floor((Date.now() - new Date(c.ultimaCompra).getTime()) / 86400000))
                : 0;
              return (
                <div key={c.nome} className="row divider-row" style={{ justifyContent: "space-between", padding: "9px 0" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.nome}</div>
                    <div style={{ fontSize: 11.5, color: "var(--accent-text)" }}>{dias} dias desde a última compra</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{formatMoney(c.saldo)}</div>
                </div>
              );
            })}
            <Link href="/clientes" style={{ display: "block", marginTop: 12, fontSize: 12.5, fontWeight: 600 }}>
              Ver todos os clientes →
            </Link>
          </div>

          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Vendas por origem</div>
            <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${(origemCount.loja / totalOrigem) * 100}%`, background: "oklch(55% 0 0)" }} />
              <div style={{ width: `${(origemCount.instagram / totalOrigem) * 100}%`, background: "var(--accent)" }} />
              <div style={{ width: `${(origemCount.whatsapp / totalOrigem) * 100}%`, background: "var(--positive)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {[
                ["Loja física", origemCount.loja, "oklch(55% 0 0)"],
                ["Instagram", origemCount.instagram, "var(--accent)"],
                ["WhatsApp", origemCount.whatsapp, "var(--positive)"],
              ].map(([label, count, color]) => (
                <div key={label as string} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color as string }} />
                    {label}
                  </div>
                  <span style={{ fontWeight: 600 }}>{count as number} vendas</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
