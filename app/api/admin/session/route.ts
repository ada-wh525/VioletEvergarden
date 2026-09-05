import { clearAdminSessionCookie, createAdminSessionCookie, isAdminRequest, verifyAdminPassword } from "../../../../lib/admin-session";

export async function GET(request: Request) {
  return Response.json({ authenticated: await isAdminRequest(request) });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { password?: string };
    if (!(await verifyAdminPassword(payload.password ?? ""))) {
      return Response.json({ error: "审核口令不正确" }, { status: 401 });
    }

    return Response.json(
      { authenticated: true },
      { headers: { "set-cookie": await createAdminSessionCookie(request) } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "审核登录暂不可用";
    return Response.json({ error: message }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  return Response.json(
    { authenticated: false },
    { headers: { "set-cookie": clearAdminSessionCookie(request) } },
  );
}
