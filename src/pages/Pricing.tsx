import { motion } from "motion/react";
import { Check, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../context/LanguageContext";

export default function Pricing() {
  const { language } = useTranslation();
  const isZh = language === "zh";

  const plans = [
    {
      name: "RS · RoleOS Self-Hosted",
      price: "199",
      period: isZh ? "一次性" : "one-time",
      desc: isZh
        ? "购买后下载部署包并在你的环境运行，适合私有化与可控生产。"
        : "Buy once, deploy in your own environment, suitable for private and controlled production.",
      features: isZh
        ? ["一键安装器与部署脚本", "支持 Windows / macOS / Linux", "Role / Kit / Team Starter Pack", "部署文档与配置模板", "长期可用授权"]
        : [
            "One-click installer and deploy scripts",
            "Windows / macOS / Linux support",
            "Role / Kit / Team starter pack",
            "Deployment docs and config template",
            "Long-term usable license"
          ],
      cta: isZh ? "购买 RS" : "Buy RS",
      link: "/products/self-hosted",
      highlight: false
    },
    {
      name: "RC · Cloud BYOM",
      price: "0",
      period: isZh ? "试用后可继续免费" : "free after trial",
      desc: isZh ? "3 天免费试用，接入自有模型，适合快速上手与轻运营团队。" : "3-day free trial with your own model, great for quick onboarding.",
      features: isZh
        ? ["注册即用，无需部署", "3 天完整试用", "BYOM（自带模型）", "基础运行与审计能力", "可升级 Managed Model"]
        : [
            "Signup and use immediately",
            "3-day full trial",
            "BYOM (bring your own model)",
            "Built-in run and audit baseline",
            "Upgradeable to Managed Model"
          ],
      cta: isZh ? "开始 RC 试用" : "Start RC Trial",
      link: "/app/cloud",
      highlight: true
    },
    {
      name: "RC · Managed Model",
      price: "39",
      period: isZh ? "每月" : "per month",
      desc: isZh ? "平台托管模型与运行策略，减少模型配置与运维成本。" : "Platform-managed model and runtime policy with lower setup burden.",
      features: isZh
        ? ["包含 BYOM 全部能力", "平台模型套餐", "持续更新与运维支持", "优先支持与稳定策略", "面向商用持续使用"]
        : [
            "Includes all BYOM capabilities",
            "Platform model package",
            "Continuous updates and ops support",
            "Priority support and stable policy",
            "Designed for continuous commercial usage"
          ],
      cta: isZh ? "订阅 RC 套餐" : "Subscribe RC Plan",
      link: "/app/cloud",
      highlight: false
    }
  ];

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-20">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold text-black mb-6"
        >
          {isZh ? "清晰可执行的定价" : "Clear and Actionable Pricing"}
        </motion.h1>
        <p className="text-xl text-black/50 max-w-2xl mx-auto">
          {isZh
            ? "一个 RoleOS 平台，两条商业路径：RS 面向自托管，RC 面向托管即用。"
            : "One RoleOS platform with two commercial paths: RS for self-hosted, RC for cloud."}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-20">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative p-8 rounded-3xl border ${
              plan.highlight ? "border-black bg-black text-white shadow-xl scale-105 z-10" : "border-black/5 bg-white text-black"
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-widest">
                {isZh ? "推荐起步" : "Recommended"}
              </span>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-bold">¥{plan.price}</span>
                <span className={`text-sm ${plan.highlight ? "text-white/60" : "text-black/40"}`}>/{plan.period}</span>
              </div>
              <p className={`mt-4 text-sm ${plan.highlight ? "text-white/60" : "text-black/50"}`}>{plan.desc}</p>
            </div>

            <ul className="space-y-4 mb-10">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start space-x-3 text-sm">
                  <Check className={`w-5 h-5 shrink-0 ${plan.highlight ? "text-emerald-400" : "text-emerald-600"}`} />
                  <span className={plan.highlight ? "text-white/80" : "text-black/70"}>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              to={plan.link}
              className={`block w-full py-4 rounded-xl font-bold text-center transition-all ${
                plan.highlight ? "bg-white text-black hover:bg-zinc-200" : "bg-black text-white hover:bg-black/85"
              }`}
            >
              {plan.cta}
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="bg-zinc-50 rounded-3xl p-8 md:p-12 border border-black/5">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-black text-white rounded-xl">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-bold mb-4">{isZh ? "计费模式说明" : "Billing Mode Notes"}</h4>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h5 className="font-bold mb-2">API Token</h5>
                <p className="text-sm text-black/60 leading-relaxed">
                  {isZh
                    ? "用户提供自己的大模型 API 凭证（如 OpenAI、Anthropic、DeepSeek 等），平台主要收取软件与服务费用。"
                    : "Users provide model API credentials (such as OpenAI / Anthropic / DeepSeek) and pay platform software/service fees."}
                </p>
              </div>
              <div>
                <h5 className="font-bold mb-2">{isZh ? "算力 Token" : "Compute Token"}</h5>
                <p className="text-sm text-black/60 leading-relaxed">
                  {isZh
                    ? "使用 RC 托管模型与算力，无需自行配置模型供应商，按订阅与运行策略使用。"
                    : "Use RC managed model/compute without configuring model vendors by yourself."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
