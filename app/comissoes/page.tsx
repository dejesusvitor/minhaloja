import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate } from "@/lib/format";
import type { Pedido, Vendedora } from "@/lib/types";

function inicioDaSemana() {
  const d = new Date();
  const dia = d.getDay();
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1);
  const seg = new Date(d.setDate(diff));
  seg.setHours(0, 0, 0, 0);
  return seg.toISOString();
}

export default async function ComissoesPage() {
  const desde = inicioDaSemana();
  const [{ data: vendedoras }, { data: pedidos }] = await Promise.all([
    supabase.from("vendedoras").select("*").order("nome"),
    supabase
      .from("pedidos")
      .select("*, cliente:clientes(nome), vendedora:vendedoras(nome), itens:pedido_itens(nome_produto)")
      .gte("created_at", desde)
      .order("created_at", { ascending: false }),
  ]);

  const vends = (vendedoras ?? []) as Vendedora[];
  const peds = (pedidos ?? []) as Pedido[];
  const meta = 5000;

  const porVendedora = vends.map((v) => {
    const vendas = peds.filter((p) => p.vendedora_id === v.id);
    const total = vendas.reduce((s, p) => s + p.total, 0);
    const comissao = (total * v.comissao_percentual) / 100;
    const ticketMedio = vendas.length ? total / vendas.length : 0;
    return { vendedora: v, vendas, total, comissao, ticketMedio };
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Ateliê · Comissões</div>
          <h1 className="page-title">Comissões</h1>
          <div className="page-sub">Quanto cada vendedora vendeu e quanto ela tem a receber, esta semana</div>
        </div>
      </div>

      <div className="grid-cols-auto">
        {porVendedora.map(({ vendedora, total, comissao, ticketMedio }) => (
          <div key={vendedora.id} className="card" style={{ borderRadius: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="avatar" style={{ width: 46, height: 46, fontSize: 16, background: vendedora.cor }}>
                {vendedora.iniciais}
              </div>
              <div>
                <div className="serif" style={{ fontSize: 21 }}>
                  {vendedora.nome}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-softer)" }}>Comissão de {vendedora.comissao_percentual}% por venda</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
              <div style={{ flex: 1 }}>
                <div className="label">Vendeu</div>
                <div className="serif" style={{ fontSize: 26, marginTop: 4 }}>
                  {formatMoney(total)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="label">A receber</div>
                <div className="serif" style={{ fontSize: 26, marginTop: 4, color: "var(--positive-text)" }}>
                  {formatMoney(comissao)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="label">Ticket médio</div>
                <div className="serif" style={{ fontSize: 26, marginTop: 4 }}>
                  {formatMoney(ticketMedio)}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>
                <span>Meta da semana</span>
                <span>
                  {formatMoney(total)} / {formatMoney(meta)}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 5, background: "oklch(92% 0 0)", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (total / meta) * 100)}%`, height: "100%", background: vendedora.cor }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "6px 22px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, padding: "16px 0 4px" }}>Vendas detalhadas</div>
        <table className="data">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente / item</th>
              <th>Vendedora</th>
              <th style={{ textAlign: "right" }}>Valor venda</th>
              <th style={{ textAlign: "right" }}>Comissão</th>
            </tr>
          </thead>
          <tbody>
            {peds.map((p) => {
              const v = vends.find((v) => v.id === p.vendedora_id);
              return (
                <tr key={p.id}>
                  <td>{formatDate(p.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>
                    {p.cliente?.nome ?? "Cliente avulso"} · {p.itens?.map((i) => i.nome_produto).join(", ")}
                  </td>
                  <td>{p.vendedora?.nome ?? "-"}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{formatMoney(p.total)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, color: "var(--positive-text)" }}>
                    {formatMoney(v ? (p.total * v.comissao_percentual) / 100 : 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {peds.length === 0 && <div style={{ padding: "20px 0", color: "var(--ink-soft)" }}>Nenhuma venda esta semana ainda.</div>}
      </div>
    </>
  );
}
