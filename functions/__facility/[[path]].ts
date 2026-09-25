/** Static snapshot files are not directly fetchable; use /api/data after login. */
export async function onRequest(): Promise<Response> {
  return new Response(null, { status: 404 });
}
