import { NextRequest, NextResponse } from "next/server";
import { PROVIDERS, isProviderId, metaCredenciaisConfiguradas } from "@/lib/integracoes";

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  if (!isProviderId(provider)) {
    return NextResponse.redirect(`${baseUrl}/configuracoes?integracao=erro&motivo=provedor_desconhecido`);
  }

  if (!metaCredenciaisConfiguradas()) {
    return NextResponse.redirect(`${baseUrl}/configuracoes?integracao=erro&motivo=sem_credenciais&provedor=${provider}`);
  }

  const appId = process.env.META_APP_ID!;
  const redirectUri = `${baseUrl}/api/integracoes/${provider}/callback`;
  const scopes = PROVIDERS[provider].scopes;

  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes.join(","));
  url.searchParams.set("state", provider);
  url.searchParams.set("response_type", "code");

  return NextResponse.redirect(url.toString());
}
