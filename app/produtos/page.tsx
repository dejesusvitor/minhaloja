"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import type { Produto } from "@/lib/types";

const vazio = {
  nome: "",
  categoria: "",
  estoque: 1,
  custo_fornecedor: 0,
  custo_viagem_valor: 0,
  custo_viagem_alimentacao: 0,
  custo_viagem_pecas: 1,
  diluir_viagem: true,
  embalagem_custo: 4,
  regime_tributario: "simples" as "simples" | "mei",
  imposto_percentual: 6,
  maquininha_percentual: 6,
  margem_percentual: 35,
};

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(vazio);
  const [gerarBarras, setGerarBarras] = useState(true);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase.from("produtos").select("*").order("nome");
    setProdutos((data as Produto[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()));

  const custoViagemPorPeca = form.diluir_viagem
    ? (form.custo_viagem_valor + form.custo_viagem_alimentacao) / Math.max(1, form.custo_viagem_pecas)
    : form.custo_viagem_valor + form.custo_viagem_alimentacao;
  const custoBase = form.custo_fornecedor + custoViagemPorPeca + form.embalagem_custo;

  const impostoEfetivo = form.regime_tributario === "simples" ? form.imposto_percentual : 0;
  const somaPercentuais = impostoEfetivo + form.maquininha_percentual + form.margem_percentual;
  const denominador = 1 - somaPercentuais / 100;
  const formulaValida = denominador > 0.01;
  const precoSugerido = formulaValida ? custoBase / denominador : 0;
  const precoArredondado = Math.round(precoSugerido);
  const markup = custoBase > 0 ? precoSugerido / custoBase : 0;

  const codigoBarras = useMemo(() => {
    return Array.from({ length: 13 }, () => Math.floor(Math.random() * 9)).join("");
  }, [form.nome]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function salvarProduto() {
    if (!form.nome.trim() || !formulaValida) return;
    setSalvando(true);
    await supabase.from("produtos").insert({
      ...form,
      preco: precoArredondado,
      codigo_barras: gerarBarras ? codigoBarras.replace(/(\d{1})(\d{5})(\d{5})(\d{2})/, "$1 $2 $3 $4") : null,
    });
    setForm(vazio);
    setSalvando(false);
    carregar();
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Ateliê · Produtos</div>
          <h1 className="page-title">Produtos</h1>
          <div className="page-sub">Cadastre uma peça e o preço certo sai sozinho.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input className="input" placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14 }}>
            {loading && <div style={{ color: "var(--ink-soft)" }}>Carregando...</div>}
            {filtrados.map((p) => (
              <div key={p.id} className="card" style={{ padding: 16, display: "flex", gap: 14 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 9,
                    flexShrink: 0,
                    background: "linear-gradient(135deg, oklch(90% 0 0), oklch(78% 0 0))",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.nome}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-softer)", marginTop: 2 }}>
                    {p.categoria ?? "-"} · {p.estoque} em estoque
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span className="serif" style={{ fontSize: 17 }}>
                      {formatMoney(p.preco)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ borderRadius: 14, display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="serif" style={{ fontSize: 22, fontStyle: "italic" }}>
            Calculadora de preço
          </div>

          <div>
            <label className="label">Nome do produto</label>
            <input className="input" value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Vestido midi floral" />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Categoria</label>
              <input className="input" value={form.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Vestidos" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Estoque</label>
              <input className="input" type="number" value={form.estoque} onChange={(e) => set("estoque", Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="label">Custo do fornecedor (por peça)</label>
            <input
              className="input"
              type="number"
              value={form.custo_fornecedor}
              onChange={(e) => set("custo_fornecedor", Number(e.target.value))}
            />
          </div>

          <div style={{ background: "oklch(96% 0 0)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Viagem de compra</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-softer)" }}>Passagem, hospedagem e alimentação da viagem ao fornecedor</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="label" style={{ fontSize: 11 }}>
                  Valor da viagem
                </label>
                <input className="input" type="number" value={form.custo_viagem_valor} onChange={(e) => set("custo_viagem_valor", Number(e.target.value))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label" style={{ fontSize: 11 }}>
                  Alimentação
                </label>
                <input
                  className="input"
                  type="number"
                  value={form.custo_viagem_alimentacao}
                  onChange={(e) => set("custo_viagem_alimentacao", Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="label" style={{ fontSize: 11 }}>
                Peças compradas nesta viagem
              </label>
              <input
                className="input"
                type="number"
                value={form.custo_viagem_pecas}
                onChange={(e) => set("custo_viagem_pecas", Number(e.target.value))}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Diluir entre as peças da viagem</div>
              <button className={`toggle${form.diluir_viagem ? " on" : ""}`} onClick={() => set("diluir_viagem", !form.diluir_viagem)}>
                <span className="toggle-knob" />
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-softer)" }}>
              {form.diluir_viagem ? (
                <>
                  Ligado: {formatMoney(form.custo_viagem_valor + form.custo_viagem_alimentacao)} ÷ {form.custo_viagem_pecas} peças ={" "}
                  <strong style={{ color: "var(--ink)" }}>{formatMoney(custoViagemPorPeca)} por peça</strong>
                </>
              ) : (
                "Desligado. O valor cheio da viagem entra só nesta peça."
              )}
            </div>
          </div>

          <div>
            <label className="label">Embalagem e sacola (por venda)</label>
            <input className="input" type="number" value={form.embalagem_custo} onChange={(e) => set("embalagem_custo", Number(e.target.value))} />
            <div style={{ fontSize: 11.5, color: "var(--ink-softer)", marginTop: 6 }}>Sacola, tag, seda e mimo. Costuma ficar entre R$ 3,00 e R$ 6,00.</div>
          </div>

          <div className="row divider-row" style={{ justifyContent: "space-between", padding: "12px 0" }}>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Custo base da peça</div>
            <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>
              {formatMoney(custoBase)}
            </div>
          </div>

          <div>
            <label className="label">Regime tributário</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={`chip${form.regime_tributario === "mei" ? " active" : ""}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => set("regime_tributario", "mei")}
              >
                MEI
              </button>
              <button
                className={`chip${form.regime_tributario === "simples" ? " active" : ""}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => set("regime_tributario", "simples")}
              >
                Simples Nacional
              </button>
            </div>
            {form.regime_tributario === "mei" ? (
              <div style={{ fontSize: 11.5, color: "var(--ink-softer)", marginTop: 8 }}>
                MEI não cobra porcentagem por venda aqui. Lembre do valor fixo mensal (por volta de R$ 70 a R$ 75) nos seus custos fixos da loja.
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <label className="label" style={{ fontSize: 11 }}>
                  Imposto sobre a venda (%)
                </label>
                <input className="input" type="number" value={form.imposto_percentual} onChange={(e) => set("imposto_percentual", Number(e.target.value))} />
                <div style={{ fontSize: 11.5, color: "var(--ink-softer)", marginTop: 6 }}>Simples Nacional, comércio: costuma ficar entre 4% e 7%.</div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Taxa da maquininha (%)</label>
            <input className="input" type="number" value={form.maquininha_percentual} onChange={(e) => set("maquininha_percentual", Number(e.target.value))} />
            <div style={{ fontSize: 11.5, color: "var(--ink-softer)", marginTop: 6 }}>
              Débito e Pix ficam perto de 1% a 2%, crédito à vista de 3% a 5%, parcelado de 8% a 14%. Uma média de 5% a 8% cobre bem o mix de vendas no cartão.
            </div>
          </div>

          <div>
            <label className="label">Lucro desejado (%)</label>
            <input className="input" type="number" value={form.margem_percentual} onChange={(e) => set("margem_percentual", Number(e.target.value))} />
          </div>

          {!formulaValida && (
            <div style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>
              Imposto, maquininha e lucro juntos somam {somaPercentuais}%. Precisam somar menos de 100% para o preço fechar. Reduza algum dos três.
            </div>
          )}

          <div style={{ background: "var(--accent-soft)", borderRadius: 12, padding: 18, textAlign: "center" }}>
            <div className="label" style={{ color: "var(--accent-text)", marginBottom: 6 }}>
              Preço sugerido
            </div>
            <div className="serif" style={{ fontSize: 38, color: "var(--accent-text)" }}>
              {formatMoney(precoSugerido)}
            </div>
            <div style={{ fontSize: 12, color: "var(--accent-text)" }}>
              {formulaValida ? `Markup de ${markup.toFixed(1)}x sobre o custo base. Mercado de moda costuma ficar entre 2,0x e 2,5x.` : "Ajuste os percentuais acima"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Gerar código de barras</div>
            <button className={`toggle${gerarBarras ? " on" : ""}`} onClick={() => setGerarBarras((v) => !v)}>
              <span className="toggle-knob" />
            </button>
          </div>

          <button
            className="btn btn-primary"
            style={{ justifyContent: "center" }}
            onClick={salvarProduto}
            disabled={salvando || !form.nome.trim() || !formulaValida}
          >
            {salvando ? "Salvando..." : "Salvar produto"}
          </button>
        </div>
      </div>
    </>
  );
}
