import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isProviderId } from "@/lib/integracoes";

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const erroMeta = req.nextUrl.searchParams.get("error_description") || req.nextUrl.searchParams.get("error");

  if (erroMeta) {
    return NextResponse.redirect(`${baseUrl}/configuracoes?integracao=erro&motivo=${encodeURIComponent(erroMeta)}`);
  }

  if (!code || !isProviderId(provider)) {
    return NextResponse.redirect(`${baseUrl}/configuracoes?integracao=erro&motivo=codigo_ausente`);
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(`${baseUrl}/configuracoes?integracao=erro&motivo=sem_credenciais&provedor=${provider}`);
  }

  const redirectUri = `${baseUrl}/api/integracoes/${provider}/callback`;
  const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  const resp = await fetch(tokenUrl.toString());
  const data = await resp.json();

  if (!resp.ok || !data.access_token) {
    return NextResponse.redirect(`${baseUrl}/configuracoes?integracao=erro&motivo=token_invalido&provedor=${provider}`);
  }

  await supabase.from("integracoes").upsert({
    provedor: provider,
    conectado: true,
    access_token: data.access_token,
    expira_em: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    atualizado_em: new Date().toISOString(),
  });

  return NextResponse.redirect(`${baseUrl}/configuracoes?integracao=sucesso&provedor=${provider}`);
}
