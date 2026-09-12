"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import type { Fechamento, Pedido, Vendedora } from "@/lib/types";

function inicioDoDia(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function FechamentoPage() {
  const [pedidosHoje, setPedidosHoje] = useState<Pedido[]>([]);
  const [pedidosOntem, setPedidosOntem] = useState<Pedido[]>([]);
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([]);
  const [fechamentoHoje, setFechamentoHoje] = useState<Fechamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechando, setFechando] = useState(false);

  async function carregar() {
    setLoading(true);
    const hoje = inicioDoDia();
    const ontem = inicioDoDia(new Date(Date.now() - 86400000));
    const [{ data: ph }, { data: po }, { data: v }, { data: f }] = await Promise.all([
      supabase.from("pedidos").select("*").gte("created_at", hoje.toISOString()),
      supabase.from("pedidos").select("*").gte("created_at", ontem.toISOString()).lt("created_at", hoje.toISOString()),
      supabase.from("vendedoras").select("*"),
      supabase.from("fechamentos").select("*").eq("data", hoje.toISOString().slice(0, 10)).maybeSingle(),
    ]);
    setPedidosHoje((ph as Pedido[]) ?? []);
    setPedidosOntem((po as Pedido[]) ?? []);
    setVendedoras((v as Vendedora[]) ?? []);
    setFechamentoHoje((f as Fechamento) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const somaPorForma = (lista: Pedido[], forma: string) => lista.filter((p) => p.forma_pagamento === forma).reduce((s, p) => s + p.total, 0);

  const dinheiro = somaPorForma(pedidosHoje, "a_vista");
  const pix = somaPorForma(pedidosHoje, "pix");
  const cartao = somaPorForma(pedidosHoje, "cartao");
  const crediarioNovo = somaPorForma(pedidosHoje, "crediario");
  const totalHoje = dinheiro + pix + cartao + crediarioNovo;
  const totalOntem = pedidosOntem.reduce((s, p) => s + p.total, 0);
  const variacao = totalOntem > 0 ? ((totalHoje - totalOntem) / totalOntem) * 100 : 0;

  const comissoes = vendedoras.map((v) => {
    const total = pedidosHoje.filter((p) => p.vendedora_id === v.id).reduce((s, p) => s + p.total, 0);
    return { vendedora: v.nome, valor: (total * v.comissao_percentual) / 100 };
  });

  async function fecharDia() {
    setFechando(true);
    const hojeStr = inicioDoDia().toISOString().slice(0, 10);
    await supabase.from("fechamentos").upsert(
      {
        data: hojeStr,
        total_dinheiro: dinheiro,
        total_pix: pix,
        total_cartao: cartao,
        total_crediario_novo: crediarioNovo,
        comissoes,
        fechado_em: new Date().toISOString(),
      },
      { onConflict: "data" }
    );
    setFechando(false);
    carregar();
  }

  const total = Math.max(1, totalHoje);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Ateliê · Fechamento</div>
          <h1 className="page-title">Fechamento do dia</h1>
          <div className="page-sub">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}. Confira e feche o caixa em 1 minuto.
          </div>
        </div>
        <button className="btn btn-primary" onClick={fecharDia} disabled={fechando || loading}>
          {fechamentoHoje ? "Fechado, fechar de novo" : fechando ? "Fechando..." : "Fechar o dia"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ borderRadius: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Total do dia</div>
              <div className="serif" style={{ fontSize: 28 }}>
                {formatMoney(totalHoje)}
              </div>
            </div>
            <div style={{ display: "flex", height: 12, borderRadius: 7, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ width: `${(dinheiro / total) * 100}%`, background: "var(--positive)" }} />
              <div style={{ width: `${(pix / total) * 100}%`, background: "oklch(45% 0 0)" }} />
              <div style={{ width: `${(cartao / total) * 100}%`, background: "var(--accent)" }} />
              <div style={{ width: `${(crediarioNovo / total) * 100}%`, background: "oklch(82% 0 0)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
              {[
                ["Dinheiro", dinheiro, "var(--positive)"],
                ["Pix", pix, "oklch(45% 0 0)"],
                ["Cartão", cartao, "var(--accent)"],
                ["Crediário novo", crediarioNovo, "oklch(82% 0 0)"],
              ].map(([label, valor, cor]) => (
                <div key={label as string}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-soft)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor as string }} />
                    {label}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{formatMoney(valor as number)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Comissões a pagar hoje</div>
            {comissoes.map((c) => (
              <div key={c.vendedora} className="row divider-row" style={{ justifyContent: "space-between", padding: "10px 0" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.vendedora}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{formatMoney(c.valor)}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Ontem vs. hoje</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Ontem</div>
                <div className="serif" style={{ fontSize: 22, color: "var(--ink-soft)" }}>
                  {formatMoney(totalOntem)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Hoje</div>
                <div className="serif" style={{ fontSize: 22, color: "var(--positive-text)" }}>
                  {formatMoney(totalHoje)}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--positive-text)" }}>
              {variacao >= 0 ? "↑" : "↓"} {Math.abs(variacao).toFixed(0)}% {variacao >= 0 ? "de aumento" : "de queda"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
