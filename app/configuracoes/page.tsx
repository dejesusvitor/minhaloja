"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney, initials } from "@/lib/format";
import type { Configuracoes, Vendedora } from "@/lib/types";

const cores = ["#111111", "#3a3a3a", "#6b6b6b", "#9c9c9c", "#cfcfcf", "#ffffff"];

const faqs = [
  {
    q: "Como registro uma venda no crediário?",
    a: 'Em Pedidos, escolha "Crediário" como forma de pagamento. O valor entra automaticamente no saldo do cliente, visível em Clientes. Sem precisar anotar em caderno.',
  },
  { q: "Como funciona a comissão das vendedoras?", a: "Cada colaboradora tem uma porcentagem configurada em Colaboradoras. A comissão é calculada automaticamente sobre cada venda dela, visível em Comissões." },
  { q: "Como emito nota fiscal de um pedido?", a: 'Ligue "Emitir nota fiscal" ao criar o pedido em Pedidos. A emissão real depende de conectar um provedor fiscal em Integrações.' },
  { q: "Como calculo o preço considerando custo, imposto e taxa de cartão?", a: "Em Produtos, a calculadora de preço já soma custo do fornecedor, logística diluída, embalagem, imposto e taxa de maquininha, e devolve o preço final pela margem que você definir." },
  { q: "Como faço o fechamento do dia?", a: 'Vá em Fechamento e clique em "Fechar o dia". Ele soma tudo que entrou (dinheiro, pix, cartão, crediário novo) e as comissões do dia.' },
];

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracoes | null>(null);
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novaComissao, setNovaComissao] = useState(10);
  const [faqAberta, setFaqAberta] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function carregarVendedoras() {
    const { data } = await supabase.from("vendedoras").select("*").order("nome");
    setVendedoras((data as Vendedora[]) ?? []);
  }

  useEffect(() => {
    supabase
      .from("configuracoes")
      .select("*")
      .eq("id", true)
      .single()
      .then(({ data }) => setConfig(data as Configuracoes));
    carregarVendedoras();
  }, []);

  function set<K extends keyof Configuracoes>(key: K, value: Configuracoes[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
    setSalvo(false);
  }

  async function salvar() {
    if (!config) return;
    setSalvando(true);
    await supabase
      .from("configuracoes")
      .update({
        nome_empresa: config.nome_empresa,
        cnpj_cpf: config.cnpj_cpf,
        telefone: config.telefone,
        email: config.email,
        endereco: config.endereco,
        cor_principal: config.cor_principal,
        tema: config.tema,
      })
      .eq("id", true);
    setSalvando(false);
    setSalvo(true);
  }

  async function adicionarColaboradora() {
    if (!novoNome.trim()) return;
    const tons = ["#111111", "#3a3a3a", "#565656", "#6b6b6b", "#828282"];
    const cor = tons[vendedoras.length % tons.length];
    await supabase.from("vendedoras").insert({
      nome: novoNome.trim(),
      comissao_percentual: novaComissao,
      cor,
      iniciais: initials(novoNome.trim()),
    });
    setNovoNome("");
    setNovaComissao(10);
    carregarVendedoras();
  }

  async function atualizarComissao(id: string, valor: number) {
    setVendedoras((prev) => prev.map((v) => (v.id === id ? { ...v, comissao_percentual: valor } : v)));
    await supabase.from("vendedoras").update({ comissao_percentual: valor }).eq("id", id);
  }

  async function removerColaboradora(id: string) {
    await supabase.from("vendedoras").delete().eq("id", id);
    carregarVendedoras();
  }

  if (!config) return <div style={{ color: "var(--ink-soft)" }}>Carregando...</div>;

  return (
    <>
      <div>
        <div className="eyebrow">Ateliê · Configurações</div>
        <h1 className="page-title">Configurações</h1>
        <div className="page-sub">Dados da loja, equipe, marca, tema e integrações, tudo num só lugar.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
        <div className="card" style={{ borderRadius: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Dados da empresa</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginBottom: 18 }}>Aparecem na nota fiscal e nos recibos enviados aos clientes</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14 }}>
            <div>
              <label className="label">Nome do ateliê</label>
              <input className="input" value={config.nome_empresa} onChange={(e) => set("nome_empresa", e.target.value)} />
            </div>
            <div>
              <label className="label">CNPJ / CPF</label>
              <input className="input" value={config.cnpj_cpf ?? ""} onChange={(e) => set("cnpj_cpf", e.target.value)} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={config.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input" value={config.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="label">Endereço</label>
              <input className="input" value={config.endereco ?? ""} onChange={(e) => set("endereco", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card" style={{ borderRadius: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Colaboradoras</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginBottom: 16 }}>
            Quem vende na loja. Cada uma aparece em Pedidos para registrar a venda dela, e a comissão sai sozinha em Comissões.
          </div>

          {vendedoras.map((v) => (
            <div key={v.id} className="row divider-row" style={{ gap: 14, padding: "12px 0" }}>
              <div className="avatar" style={{ background: v.cor }}>
                {v.iniciais}
              </div>
              <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{v.nome}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  className="input"
                  type="number"
                  style={{ width: 68, textAlign: "right" }}
                  value={v.comissao_percentual}
                  onChange={(e) => atualizarComissao(v.id, Number(e.target.value))}
                />
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>% de comissão</span>
              </div>
              <button
                onClick={() => removerColaboradora(v.id)}
                style={{ background: "none", border: "none", color: "var(--ink-soft)", fontSize: 13 }}
              >
                remover
              </button>
            </div>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <input className="input" placeholder="Nome da colaboradora" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
            <input
              className="input"
              type="number"
              style={{ width: 100 }}
              value={novaComissao}
              onChange={(e) => setNovaComissao(Number(e.target.value))}
            />
            <button className="btn btn-primary" onClick={adicionarColaboradora} style={{ whiteSpace: "nowrap" }}>
              + Adicionar
            </button>
          </div>
        </div>

        <div className="card" style={{ borderRadius: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Marca da loja</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginBottom: 18 }}>
            Sua cor aparece em todo o sistema. Upload de logo entra assim que ligarmos o armazenamento de arquivos.
          </div>
          <label className="label">Cor principal da loja</label>
          <div style={{ display: "flex", gap: 10 }}>
            {cores.map((c) => (
              <button
                key={c}
                onClick={() => set("cor_principal", c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: c,
                  border: c === "#ffffff" ? "1px solid var(--line)" : "none",
                  boxShadow: config.cor_principal === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c === "#ffffff" ? "var(--line)" : c}` : "none",
                }}
              />
            ))}
          </div>
        </div>

        <div className="card" style={{ borderRadius: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Aparência</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginBottom: 18 }}>Escolha como a Trama aparece pra você</div>
          <div style={{ display: "flex", gap: 14 }}>
            {(["claro", "escuro"] as const).map((t) => (
              <button
                key={t}
                onClick={() => set("tema", t)}
                className="card"
                style={{ flex: 1, border: config.tema === t ? "2px solid var(--accent)" : "1px solid var(--line)", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700, textTransform: "capitalize" }}>{t}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-softer)", marginTop: 10 }}>O modo escuro ainda está sendo pintado nas telas. Por enquanto isso só guarda sua preferência.</div>
        </div>

        <div className="card" style={{ borderRadius: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Integrações</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginBottom: 16 }}>
            Cada uma dessas precisa de credenciais próprias, que só quem administra as contas consegue gerar
          </div>
          {[
            ["Instagram", "Vendas por direct viram pedido automaticamente"],
            ["WhatsApp Business", "Cobrança de crediário e confirmação de pedidos"],
            ["Google Agenda", "Lembretes de retirada e separação de peças"],
            ["Meta Ads & cobrança automática", "Cobra o cliente automaticamente via Pix ou cartão após o pedido"],
          ].map(([nome, desc]) => (
            <div key={nome} className="row divider-row" style={{ justifyContent: "space-between", padding: "13px 0" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{nome}</div>
                <div style={{ fontSize: 12, color: "var(--ink-softer)" }}>{desc}</div>
              </div>
              <span className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: 12.5 }}>
                Conectar
              </span>
            </div>
          ))}
        </div>

        <div className="card" style={{ borderRadius: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Central de dúvidas</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginBottom: 16 }}>Como cada parte da Trama funciona</div>
          {faqs.map((f, i) => (
            <div key={f.q} className="divider-row" style={{ padding: "14px 0" }}>
              <button
                onClick={() => setFaqAberta(faqAberta === i ? -1 : i)}
                style={{ display: "flex", width: "100%", justifyContent: "space-between", background: "none", border: "none", textAlign: "left" }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{f.q}</span>
                <span style={{ color: "var(--ink-soft)" }}>{faqAberta === i ? "︿" : "﹀"}</span>
              </button>
              {faqAberta === i && <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.5 }}>{f.a}</div>}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar dados"}
          </button>
          {salvo && <span style={{ fontSize: 12.5, color: "var(--positive-text)" }}>Salvo!</span>}
        </div>
      </div>
    </>
  );
}
