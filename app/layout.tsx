import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Trama · OS da Loja",
  description: "Sistema de gestão para o ateliê",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: config } = await supabase
    .from("configuracoes")
    .select("nome_empresa")
    .eq("id", true)
    .single();

  const nomeEmpresa = config?.nome_empresa ?? "Minha Loja";

  return (
    <html lang="pt-BR">
      <body>
        <div className="app-shell">
          <Sidebar nomeEmpresa={nomeEmpresa} />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
