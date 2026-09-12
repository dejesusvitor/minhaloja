export type Vendedora = {
  id: string;
  nome: string;
  comissao_percentual: number;
  cor: string;
  iniciais: string;
  created_at: string;
};

export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  created_at: string;
};

export type Produto = {
  id: string;
  nome: string;
  categoria: string | null;
  estoque: number;
  custo_fornecedor: number;
  custo_viagem_valor: number;
  custo_viagem_alimentacao: number;
  custo_viagem_pecas: number;
  diluir_viagem: boolean;
  embalagem_custo: number;
  regime_tributario: "mei" | "simples";
  imposto_percentual: number;
  maquininha_percentual: number;
  margem_percentual: number;
  preco: number;
  codigo_barras: string | null;
  created_at: string;
};

export type Pedido = {
  id: string;
  cliente_id: string | null;
  vendedora_id: string | null;
  forma_pagamento: "a_vista" | "crediario" | "cartao" | "pix";
  origem: "loja" | "instagram" | "whatsapp";
  status: "pago" | "crediario";
  emitir_nf: boolean;
  total: number;
  created_at: string;
  cliente?: Cliente | null;
  vendedora?: Vendedora | null;
  itens?: PedidoItem[];
};

export type PedidoItem = {
  id: string;
  pedido_id: string;
  produto_id: string | null;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
};

export type CrediarioMovimento = {
  id: string;
  cliente_id: string;
  pedido_id: string | null;
  tipo: "compra" | "pagamento";
  valor: number;
  created_at: string;
};

export type Fechamento = {
  id: string;
  data: string;
  total_dinheiro: number;
  total_pix: number;
  total_cartao: number;
  total_crediario_novo: number;
  comissoes: { vendedora: string; valor: number }[];
  fechado_em: string | null;
};

export type Configuracoes = {
  id: true;
  nome_empresa: string;
  cnpj_cpf: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cor_principal: string;
  logo_url: string | null;
  tema: string;
};
