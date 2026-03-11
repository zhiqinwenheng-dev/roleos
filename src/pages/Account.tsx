import { useEffect, useState } from "react";
import { clearSession, fetchMe, readSession } from "../lib/roleosApi";
import { useTranslation } from "../context/LanguageContext";

interface MePayload {
  user: {
    id: string;
    email: string;
    createdAt?: string;
  };
  workspaceStatuses: Array<{
    workspaceId: string;
    workspaceName: string;
    subscription: { planCode: string; status: string } | null;
    selfHosted: { status: string; packageCode: string } | null;
  }>;
}

export default function AccountPage() {
  const { language } = useTranslation();
  const isZh = language === "zh";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<MePayload | null>(null);

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
        setError(err instanceof Error ? err.message : isZh ? "加载账户失败。" : "Failed to load account.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!readSession().token) {
    return (
      <div className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-black/10 bg-white p-8">
          <h1 className="text-2xl font-bold mb-2">{isZh ? "账户" : "Account"}</h1>
          <p className="text-black/60">{isZh ? "请先登录。" : "Please login first."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-black text-white p-8 mb-6">
        <h1 className="text-3xl font-bold">{isZh ? "账户中心" : "Account Center"}</h1>
        <p className="text-white/60 mt-2">
          {isZh ? "RS 与 RC 使用同一套账号体系。" : "Unified account across RS and RC."}
        </p>
      </section>

      {loading ? <p className="text-sm text-black/60">{isZh ? "加载中..." : "Loading..."}</p> : null}
      {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}

      {payload ? (
        <>
          <section className="rounded-2xl border border-black/10 bg-white p-6 mb-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-zinc-50 border border-black/10 p-4">
                <p className="text-xs text-black/50 mb-1">Email</p>
                <p className="font-semibold break-all">{payload.user.email}</p>
              </div>
              <div className="rounded-xl bg-zinc-50 border border-black/10 p-4">
                <p className="text-xs text-black/50 mb-1">{isZh ? "用户 ID" : "User ID"}</p>
                <p className="font-semibold break-all">{payload.user.id}</p>
              </div>
              <div className="rounded-xl bg-zinc-50 border border-black/10 p-4">
                <p className="text-xs text-black/50 mb-1">{isZh ? "注册时间" : "Created At"}</p>
                <p className="font-semibold">{payload.user.createdAt ?? "-"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6 mb-6">
            <h2 className="font-bold mb-4">{isZh ? "工作空间状态" : "Workspace Status"}</h2>
            <div className="space-y-3">
              {payload.workspaceStatuses.map((item) => (
                <div key={item.workspaceId} className="rounded-xl border border-black/10 p-4">
                  <p className="font-semibold">{item.workspaceName}</p>
                  <p className="text-xs text-black/50 break-all">{item.workspaceId}</p>
                  <p className="text-sm mt-2">
                    RC: {item.subscription ? `${item.subscription.planCode} (${item.subscription.status})` : "-"}
                  </p>
                  <p className="text-sm">
                    RS: {item.selfHosted ? `${item.selfHosted.packageCode} (${item.selfHosted.status})` : "-"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <button
          onClick={() => {
            clearSession();
            window.location.href = "/login";
          }}
          className="px-4 py-2 rounded-lg border border-black/20 text-sm font-semibold hover:bg-black/5"
        >
          {isZh ? "退出登录" : "Logout"}
        </button>
      </section>
    </div>
  );
}
