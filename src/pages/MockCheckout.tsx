import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmMockCheckout, readSession } from "../lib/roleosApi";
import { useTranslation } from "../context/LanguageContext";

type PaymentChannel = "wechat" | "alipay" | "manual";

function randomTxnId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

export default function MockCheckoutPage() {
  const { language } = useTranslation();
  const isZh = language === "zh";
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const workspaceId = params.get("workspaceId") ?? "";
  const orderId = params.get("orderId") ?? "";
  const planCode = params.get("planCode") ?? "";
  const amountUsd = params.get("amountUsd") ?? "";

  const [channel, setChannel] = useState<PaymentChannel>("wechat");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const targetPath = useMemo(() => {
    if (planCode === "rs-self-hosted") {
      return "/app/self-hosted";
    }
    return "/app/cloud";
  }, [planCode]);

  const session = readSession();
  const authed = Boolean(session.token);

  async function confirm(status: "paid" | "failed") {
    if (!workspaceId || !orderId) {
      setMessage(isZh ? "缺少订单参数。" : "Missing checkout parameters.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await confirmMockCheckout(workspaceId, {
        orderId,
        status,
        channel,
        providerTransactionId: randomTxnId()
      });
      if (status === "paid") {
        const subscriptionText = result.subscription
          ? `${result.subscription.planCode}/${result.subscription.status}`
          : "-";
        const rsText = result.selfHostedEntitlement
          ? `${result.selfHostedEntitlement.packageCode}/${result.selfHostedEntitlement.status}`
          : "-";
        setMessage(
          isZh
            ? `模拟支付成功。订单已更新，RC: ${subscriptionText}，RS: ${rsText}。`
            : `Mock payment success. Order updated. RC: ${subscriptionText}, RS: ${rsText}.`
        );
        setDone(true);
      } else {
        setMessage(isZh ? "已模拟支付失败。" : "Mock payment failed.");
      }
    } catch (error) {
      const fallback = isZh
        ? "支付确认失败。若提示 404，请先更新 origin-api 到最新版本以启用 mock-checkout 接口。"
        : "Payment confirmation failed. If you see 404, upgrade origin-api to enable mock-checkout endpoint.";
      if (error instanceof Error) {
        if (error.message.includes("404")) {
          setMessage(fallback);
        } else {
          setMessage(error.message);
        }
      } else {
        setMessage(fallback);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!authed) {
    return (
      <div className="pt-28 pb-20 max-w-2xl mx-auto px-4">
        <div className="rounded-2xl bg-black text-white p-8">
          <h1 className="text-2xl font-bold mb-3">{isZh ? "请先登录" : "Login Required"}</h1>
          <p className="text-white/70 mb-4">
            {isZh ? "模拟支付页面需要登录态。" : "Mock checkout requires an authenticated session."}
          </p>
          <Link to="/login" className="inline-block px-4 py-2 rounded-lg bg-white text-black font-semibold">
            {isZh ? "去登录" : "Go to Login"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-16 max-w-3xl mx-auto px-4">
      <section className="rounded-3xl bg-black text-white p-8 mb-6">
        <h1 className="text-3xl font-bold">{isZh ? "模拟支付结算" : "Mock Checkout"}</h1>
        <p className="text-white/65 mt-2">
          {isZh
            ? "这是测试环境支付页，用于演示微信/支付宝支付流程与回调授权。"
            : "This is a test checkout page to simulate WeChat/Alipay payment and callback authorization."}
        </p>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-zinc-50 border border-black/10 p-3">
            <p className="text-black/50 mb-1">orderId</p>
            <p className="font-mono break-all">{orderId || "-"}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 border border-black/10 p-3">
            <p className="text-black/50 mb-1">workspaceId</p>
            <p className="font-mono break-all">{workspaceId || "-"}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 border border-black/10 p-3">
            <p className="text-black/50 mb-1">{isZh ? "套餐" : "Plan"}</p>
            <p className="font-semibold">{planCode || "-"}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 border border-black/10 p-3">
            <p className="text-black/50 mb-1">{isZh ? "金额" : "Amount"}</p>
            <p className="font-semibold">${amountUsd || "-"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6 mb-6">
        <h2 className="font-bold mb-3">{isZh ? "选择支付方式" : "Select Payment Method"}</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { id: "wechat" as const, labelZh: "微信支付", labelEn: "WeChat Pay" },
            { id: "alipay" as const, labelZh: "支付宝", labelEn: "Alipay" },
            { id: "manual" as const, labelZh: "人工确认", labelEn: "Manual Confirm" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setChannel(item.id)}
              className={`border rounded-xl px-4 py-3 text-sm font-semibold ${
                channel === item.id ? "bg-black text-white border-black" : "border-black/15"
              }`}
            >
              {isZh ? item.labelZh : item.labelEn}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="font-bold mb-3">{isZh ? "支付动作（模拟）" : "Mock Payment Actions"}</h2>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy}
            onClick={() => void confirm("paid")}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
          >
            {isZh ? "模拟支付成功" : "Simulate Paid"}
          </button>
          <button
            disabled={busy}
            onClick={() => void confirm("failed")}
            className="px-4 py-2 rounded-lg border border-black/20 text-sm font-semibold disabled:opacity-50"
          >
            {isZh ? "模拟支付失败" : "Simulate Failed"}
          </button>
          {done ? (
            <button
              onClick={() => navigate(targetPath)}
              className="px-4 py-2 rounded-lg border border-emerald-500 text-emerald-700 text-sm font-semibold"
            >
              {isZh ? "返回业务页面" : "Back to Console"}
            </button>
          ) : null}
        </div>

        {message ? (
          <div className="mt-4 rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm">{message}</div>
        ) : null}
      </section>
    </div>
  );
}
