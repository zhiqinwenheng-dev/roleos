import { useEffect, useState } from "react";
import { fetchMe, readSession } from "../lib/roleosApi";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<unknown>(null);

  useEffect(() => {
    const session = readSession();
    if (!session.token) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError("");
      try {
        const me = await fetchMe();
        setPayload(me);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load account.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!readSession().token) {
    return (
      <div className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-black/10 bg-white p-8">
          <h1 className="text-2xl font-bold mb-2">Account</h1>
          <p className="text-black/60">Please login first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-black text-white p-8 mb-6">
        <h1 className="text-3xl font-bold">Account Center</h1>
        <p className="text-white/60 mt-2">Unified account across RS and Rc.</p>
      </section>

      {loading ? <p className="text-sm text-black/60">Loading...</p> : null}
      {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
      <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-xl text-xs overflow-auto min-h-[280px]">
        {payload ? JSON.stringify(payload, null, 2) : "No account payload"}
      </pre>
    </div>
  );
}

