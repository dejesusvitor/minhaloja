"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatTime } from "@/lib/format";
import type { Cliente, Pedido, Produto, Vendedora } from "@/lib/types";

type ItemCarrinho = { produto_id: string; nome: string; preco: number; quantidade: number };

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"hoje" | "todos" | "crediario" | "pago">("hoje");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [produtoParaAdicionar, setProdutoParaAdicionar] = useState("");
  const [vendedoraId, setVendedoraId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<"a_vista" | "crediario" | "cartao">("a_vista");
  const [origem, setOrigem] = useState<"loja" | "instagram" | "whatsapp">("loja");
  const [emitirNf, setEmitirNf] = useState(true);

  async function carregar() {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: pr }, { data: v }] = await Promise.all([
      supabase
        .from("pedidos")
        .select("*, cliente:clientes(*), vendedora:vendedoras(*), itens:pedido_itens(*)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("produtos").select("*").order("nome"),
      supabase.from("vendedoras").select("*").order("nome"),
    ]);
    setPedidos((p as Pedido[]) ?? []);
    setClientes((c as Cliente[]) ?? []);
    setProdutos((pr as Produto[]) ?? []);
    setVendedoras((v as Vendedora[]) ?? []);
    if (v && v.length && !vendedoraId) setVendedoraId(v[0].id);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clienteSelecionado = clientes.find((c) => c.id === clienteId);
  const comprasDoCliente = useMemo(
    () => (clienteId ? pedidos.filter((p) => p.cliente_id === clienteId).length : 0),
    [clienteId, pedidos]
  );
  const gastoMedioCliente = useMemo(() => {
    const doCliente = pedidos.filter((p) => p.cliente_id === clienteId);
    if (!doCliente.length) return 0;
    return doCliente.reduce((s, p) => s + p.total, 0) / doCliente.length;
  }, [clienteId, pedidos]);

  const total = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtro === "hoje") {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      return new Date(p.created_at) >= hoje;
    }
    if (filtro === "crediario") return p.status === "crediario";
    if (filtro === "pago") return p.status === "pago";
    return true;
  });

  function adicionarProduto() {
    const prod = produtos.find((p) => p.id === produtoParaAdicionar);
    if (!prod) return;
    setItens((prev) => {
      const existente = prev.find((i) => i.produto_id === prod.id);
      if (existente) {
        return prev.map((i) => (i.produto_id === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i));
      }
      return [...prev, { produto_id: prod.id, nome: prod.nome, preco: prod.preco, quantidade: 1 }];
    });
    setProdutoParaAdicionar("");
  }

  function removerItem(produto_id: string) {
    setItens((prev) => prev.filter((i) => i.produto_id !== produto_id));
  }

  async function salvarPedido() {
    setMsg(null);
    let cid = clienteId;
    if (!cid && novoClienteNome.trim()) {
      const { data: novo, error } = await supabase
        .from("clientes")
        .insert({ nome: novoClienteNome.trim() })
        .select()
        .single();
      if (error) {
        setMsg("Erro ao criar cliente: " + error.message);
        return;
      }
      cid = novo!.id;
    }
    if (!cid || itens.length === 0 || !vendedoraId) {
      setMsg("Escolha cliente, ao menos um produto e a vendedora.");
      return;
    }
    setSalvando(true);
    const status = formaPagamento === "crediario" ? "crediario" : "pago";
    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: cid,
        vendedora_id: vendedoraId,
        forma_pagamento: formaPagamento,
        origem,
        status,
        emitir_nf: emitirNf,
        total,
      })
      .select()
      .single();

    if (error || !pedido) {
      setMsg("Erro ao salvar pedido: " + error?.message);
      setSalvando(false);
      return;
    }

    await supabase.from("pedido_itens").insert(
      itens.map((i) => ({
        pedido_id: pedido.id,
        produto_id: i.produto_id,
        nome_produto: i.nome,
        quantidade: i.quantidade,
        preco_unitario: i.preco,
      }))
    );

    if (status === "crediario") {
      await supabase.from("crediario_movimentos").insert({
        cliente_id: cid,
        pedido_id: pedido.id,
        tipo: "compra",
        valor: total,
      });
    }

    setItens([]);
    setClienteId("");
    setNovoClienteNome("");
    setSalvando(false);
    setMsg("Pedido salvo!");
    carregar();
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Ateliê · Pedidos</div>
          <h1 className="page-title">Pedidos</h1>
          <div className="page-sub">Sem caderno, sem papel perdido. Cada venda registrada em segundos.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["hoje", "todos", "crediario", "pago"] as const).map((f) => (
              <button key={f} className={`chip${filtro === f ? " active" : ""}`} onClick={() => setFiltro(f)}>
                {f === "hoje" ? "Hoje" : f === "todos" ? "Todos" : f === "crediario" ? "Crediário" : "Pago"}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: "6px 22px" }}>
            {loading && <div style={{ padding: "20px 0", color: "var(--ink-soft)" }}>Carregando...</div>}
            {!loading && pedidosFiltrados.length === 0 && (
              <div style={{ padding: "20px 0", color: "var(--ink-soft)" }}>Nenhum pedido por aqui ainda.</div>
            )}
            {pedidosFiltrados.map((p) => (
              <div key={p.id} className="row divider-row" style={{ gap: 12, padding: "14px 0" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.cliente?.nome ?? "Cliente avulso"}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 2 }}>
                    {p.itens?.map((i) => i.nome_produto).join(", ") || "-"} · {p.vendedora?.nome ?? "-"}
                  </div>
                </div>
                <span className={`badge ${p.status === "pago" ? "badge-positive" : "badge-accent"}`}>
                  {p.status === "pago" ? "Pago" : "Crediário"}
                </span>
                <div style={{ fontSize: 12, color: "var(--ink-softer)", width: 44 }}>{formatTime(p.created_at)}</div>
                <div className="serif" style={{ fontSize: 16, fontWeight: 600, minWidth: 82, textAlign: "right" }}>
                  {formatMoney(p.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ borderRadius: 14, display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="serif" style={{ fontSize: 22, fontStyle: "italic" }}>
            Novo pedido
          </div>

          <div>
            <label className="label">Cliente</label>
            <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Selecione ou crie abaixo...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {!clienteId && (
              <input
                className="input"
                style={{ marginTop: 8 }}
                placeholder="Ou digite o nome da nova cliente"
                value={novoClienteNome}
                onChange={(e) => setNovoClienteNome(e.target.value)}
              />
            )}
            {clienteId && comprasDoCliente > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--positive-soft)",
                  borderRadius: 9,
                  padding: "10px 12px",
                  marginTop: 10,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--positive-text)" }}>
                  <strong>Cliente recorrente:</strong> {comprasDoCliente + 1}ª compra, gasta em média {formatMoney(gastoMedioCliente)}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Produtos</label>
            {itens.map((i) => (
              <div key={i.produto_id} className="row divider-row" style={{ justifyContent: "space-between", padding: "9px 0" }}>
                <div style={{ fontSize: 13.5 }}>
                  {i.nome} <span style={{ color: "var(--ink-softer)" }}>× {i.quantidade}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{formatMoney(i.preco * i.quantidade)}</span>
                  <button onClick={() => removerItem(i.produto_id)} style={{ background: "none", border: "none", color: "var(--ink-soft)" }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <select className="input" value={produtoParaAdicionar} onChange={(e) => setProdutoParaAdicionar(e.target.value)}>
                <option value="">Escolher produto...</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} · {formatMoney(p.preco)}
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost" onClick={adicionarProduto} disabled={!produtoParaAdicionar}>
                + Add
              </button>
            </div>
          </div>

          <div>
            <label className="label">Vendedora</label>
            <div style={{ display: "flex", gap: 8 }}>
              {vendedoras.map((v) => (
                <button
                  key={v.id}
                  className={`chip${vendedoraId === v.id ? " active" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setVendedoraId(v.id)}
                >
                  {v.nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Forma de pagamento</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                ["a_vista", "À vista"],
                ["crediario", "Crediário"],
                ["cartao", "Cartão"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  className={`chip${formaPagamento === v ? " active" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setFormaPagamento(v as typeof formaPagamento)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Origem</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                ["loja", "Loja"],
                ["instagram", "Instagram"],
                ["whatsapp", "WhatsApp"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  className={`chip${origem === v ? " active" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setOrigem(v as typeof origem)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Emitir nota fiscal</div>
            <button className={`toggle${emitirNf ? " on" : ""}`} onClick={() => setEmitirNf((v) => !v)}>
              <span className="toggle-knob" />
            </button>
          </div>

          <div className="row divider-row" style={{ justifyContent: "space-between", paddingTop: 8 }}>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Total do pedido</div>
            <div className="serif" style={{ fontSize: 26 }}>
              {formatMoney(total)}
            </div>
          </div>

          {msg && <div style={{ fontSize: 12.5, color: "var(--accent-text)" }}>{msg}</div>}

          <button className="btn btn-primary" style={{ justifyContent: "center" }} onClick={salvarPedido} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar pedido"}
          </button>
        </div>
      </div>
    </>
  );
}
