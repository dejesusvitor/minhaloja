"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate, initials } from "@/lib/format";
import type { Cliente, CrediarioMovimento, Pedido } from "@/lib/types";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [movimentos, setMovimentos] = useState<CrediarioMovimento[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "recorrentes" | "atraso">("todos");
  const [novoNome, setNovoNome] = useState("");
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    const [{ data: c }, { data: m }, { data: p }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("crediario_movimentos").select("*").order("created_at", { ascending: false }),
      supabase.from("pedidos").select("*, itens:pedido_itens(*)").order("created_at", { ascending: false }),
    ]);
    setClientes((c as Cliente[]) ?? []);
    setMovimentos((m as CrediarioMovimento[]) ?? []);
    setPedidos((p as Pedido[]) ?? []);
    if (c && c.length && !selecionadoId) setSelecionadoId(c[0].id);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dados = useMemo(() => {
    return clientes.map((c) => {
      const movs = movimentos.filter((m) => m.cliente_id === c.id);
      const saldo = movs.reduce((s, m) => s + (m.tipo === "compra" ? m.valor : -m.valor), 0);
      const compras = pedidos.filter((p) => p.cliente_id === c.id);
      const ultimaCompra = movs.filter((m) => m.tipo === "compra").sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
      const dias = ultimaCompra ? Math.max(0, Math.floor((Date.now() - new Date(ultimaCompra.created_at).getTime()) / 86400000)) : 0;
      return { cliente: c, saldo, totalComprado: compras.reduce((s, p) => s + p.total, 0), numCompras: compras.length, dias };
    });
  }, [clientes, movimentos, pedidos]);

  const filtrados = dados.filter((d) => {
    if (filtro === "recorrentes") return d.numCompras >= 3;
    if (filtro === "atraso") return d.saldo > 0.01;
    return true;
  });

  const selecionado = dados.find((d) => d.cliente.id === selecionadoId);
  const historico = [
    ...pedidos
      .filter((p) => p.cliente_id === selecionadoId)
      .map((p) => ({
        tipo: "compra" as const,
        data: p.created_at,
        texto: `${p.itens?.map((i) => i.nome_produto).join(", ") || "Compra"}${p.origem !== "loja" ? ` · via ${p.origem}` : ""}`,
        valor: p.total,
        positivo: false,
      })),
    ...movimentos
      .filter((m) => m.cliente_id === selecionadoId && m.tipo === "pagamento")
      .map((m) => ({ tipo: "pagamento" as const, data: m.created_at, texto: "Pagamento recebido", valor: m.valor, positivo: true })),
  ].sort((a, b) => (a.data < b.data ? 1 : -1));

  async function criarCliente() {
    if (!novoNome.trim()) return;
    const { data } = await supabase.from("clientes").insert({ nome: novoNome.trim() }).select().single();
    setNovoNome("");
    await carregar();
    if (data) setSelecionadoId(data.id);
  }

  async function registrarPagamento() {
    if (!selecionado || selecionado.saldo <= 0) return;
    const valor = window.prompt(`Valor recebido de ${selecionado.cliente.nome} (saldo: ${formatMoney(selecionado.saldo)})`, selecionado.saldo.toFixed(2));
    if (!valor) return;
    const num = Number(valor.replace(",", "."));
    if (!num || num <= 0) return;
    await supabase.from("crediario_movimentos").insert({ cliente_id: selecionado.cliente.id, tipo: "pagamento", valor: num });
    carregar();
  }

  function cobrarWhatsapp() {
    if (!selecionado?.cliente.telefone) return;
    const fone = selecionado.cliente.telefone.replace(/\D/g, "");
    const texto = encodeURIComponent(
      `Oi, ${selecionado.cliente.nome}! Passando pra lembrar do saldo de ${formatMoney(selecionado.saldo)} no crediário. Qualquer coisa é só chamar :)`
    );
    window.open(`https://wa.me/55${fone}?text=${texto}`, "_blank");
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Ateliê · Clientes</div>
          <h1 className="page-title">Clientes</h1>
          <div className="page-sub">Compras, crediário e contato de cada cliente, tudo num só lugar.</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {(["todos", "recorrentes", "atraso"] as const).map((f) => (
          <button key={f} className={`chip${filtro === f ? " active" : ""}`} onClick={() => setFiltro(f)}>
            {f === "todos" ? "Todos" : f === "recorrentes" ? "Recorrentes" : "Crediário em atraso"}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input className="input" placeholder="Nova cliente..." value={novoNome} onChange={(e) => setNovoNome(e.target.value)} style={{ width: 200 }} />
          <button className="btn btn-primary" onClick={criarCliente}>
            + Nova cliente
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="card" style={{ padding: "6px 22px" }}>
          {loading && <div style={{ padding: "20px 0", color: "var(--ink-soft)" }}>Carregando...</div>}
          {filtrados.map((d) => (
            <button
              key={d.cliente.id}
              onClick={() => setSelecionadoId(d.cliente.id)}
              className="row divider-row"
              style={{
                gap: 14,
                padding: "14px 8px",
                width: "100%",
                background: selecionadoId === d.cliente.id ? "oklch(95% 0 0)" : "transparent",
                border: "none",
                borderRadius: 8,
                textAlign: "left",
              }}
            >
              <div className="avatar" style={{ background: d.saldo > 0 ? "var(--ink)" : "oklch(92% 0 0)", color: d.saldo > 0 ? "var(--surface)" : "var(--ink-soft)" }}>
                {initials(d.cliente.nome)}
              </div>
              <div style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{d.cliente.nome}</span>
                  {d.numCompras >= 3 && <span style={{ color: "var(--accent-text)", fontSize: 12 }}>↻</span>}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 2 }}>
                  {d.cliente.telefone ?? "sem telefone"} · {d.numCompras} compras
                </div>
              </div>
              <span className={`badge ${d.saldo > 0.01 ? "badge-accent" : "badge-positive"}`}>
                {d.saldo > 0.01 ? `Atrasado · ${d.dias}d` : "Em dia"}
              </span>
              <div className="serif" style={{ fontSize: 17, fontWeight: 600, minWidth: 82, textAlign: "right" }}>
                {formatMoney(d.saldo)}
              </div>
            </button>
          ))}
        </div>

        {selecionado && (
          <div className="card" style={{ borderRadius: 14, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: 17 }}>
                {initials(selecionado.cliente.nome)}
              </div>
              <div>
                <div className="serif" style={{ fontSize: 22 }}>
                  {selecionado.cliente.nome}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 2 }}>{selecionado.cliente.telefone ?? "sem telefone"}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, background: "var(--positive-soft)", borderRadius: 10, padding: 14 }}>
                <div className="label" style={{ color: "var(--positive-text)", marginBottom: 4 }}>
                  Saldo
                </div>
                <div className="serif" style={{ fontSize: 22, color: "var(--positive-text)" }}>
                  {formatMoney(selecionado.saldo)}
                </div>
              </div>
              <div style={{ flex: 1, background: "oklch(94% 0 0)", borderRadius: 10, padding: 14 }}>
                <div className="label" style={{ marginBottom: 4 }}>
                  Total comprado
                </div>
                <div className="serif" style={{ fontSize: 22 }}>
                  {formatMoney(selecionado.totalComprado)}
                </div>
              </div>
            </div>

            <div>
              <div className="label">Histórico</div>
              {historico.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Sem movimentações ainda.</div>}
              {historico.slice(0, 8).map((h, idx) => (
                <div key={idx} className="row divider-row" style={{ gap: 12, padding: "10px 0" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: h.positivo ? "var(--positive)" : "var(--accent)", marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, marginLeft: 12 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{h.texto}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-softer)", marginTop: 2 }}>{formatDate(h.data)}</div>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: h.positivo ? "var(--positive-text)" : "var(--ink)" }}>
                    {h.positivo ? "+ " : ""}
                    {formatMoney(h.valor)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={registrarPagamento}>
                Registrar pagamento
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={cobrarWhatsapp}>
                Cobrar no WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
