import bcrypt from "bcryptjs";

export async function GET() {
  const email = process.env.ADMIN_EMAIL;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const testPassword = "x1311973X!";

  let bcryptResult: string = "not tested";
  try {
    if (hash) {
      const ok = await bcrypt.compare(testPassword, hash);
      bcryptResult = ok ? "MATCH" : "NO_MATCH";
    }
  } catch (e) {
    bcryptResult = `error: ${(e as Error).message}`;
  }

  return Response.json({
    email: email ?? null,
    emailLen: email?.length,
    hashPresent: !!hash,
    hashLen: hash?.length,
    hashStart: hash?.slice(0, 7),
    hashEnd: hash?.slice(-7),
    bcryptResult,
    authSecretPresent: !!process.env.AUTH_SECRET,
  });
}
