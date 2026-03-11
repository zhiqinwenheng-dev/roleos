import { motion } from "motion/react";
import { CheckCircle2, Download, Server, ShieldCheck, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../context/LanguageContext";

export default function DownloadPage() {
  const { language } = useTranslation();
  const isZh = language === "zh";

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mb-16">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-black mb-6"
        >
          RoleOS Self-Hosted (RS)
        </motion.h1>
        <p className="text-xl text-black/50">
          {isZh
            ? "RS 是 RoleOS 的私有化交付产品。购买后可下载并部署到你自己的环境，同时与 RC 保持同一套 Role / Kit / Team 标准。"
            : "RS is the private deployment product of RoleOS. Buy once, deploy in your own environment, and keep Role / Kit / Team standards aligned with RC Cloud."}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-14">
        {[
          {
            title: isZh ? "一键安装包" : "One-Click Installer",
            desc: isZh
              ? "提供 Windows、Linux、macOS 的安装包与部署脚本。"
              : "Download installers and setup scripts for Windows, Linux, and macOS.",
            icon: <Download className="w-6 h-6" />
          },
          {
            title: isZh ? "运行环境可控" : "Own Runtime Control",
            desc: isZh
              ? "可部署在本地、私有云或专属服务器，密钥由你掌控。"
              : "Deploy in local machine, private cloud, or dedicated server with your own keys.",
            icon: <Server className="w-6 h-6" />
          },
          {
            title: isZh ? "商用基线能力" : "Production Baseline",
            desc: isZh
              ? "包含 starter 对象、部署文档与审计友好的操作流程。"
              : "Includes starter objects, docs, and audit-ready operation flow.",
            icon: <ShieldCheck className="w-6 h-6" />
          }
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mb-4">
              {item.icon}
            </div>
            <h3 className="text-lg font-bold mb-2">{item.title}</h3>
            <p className="text-sm text-black/55">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="rounded-3xl bg-zinc-900 text-white p-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Workflow className="w-6 h-6 text-emerald-400" />
            {isZh ? "部署流程" : "Deployment Flow"}
          </h3>
          <div className="space-y-4">
            {(isZh
              ? [
                  "1. 注册账号并完成 RS 支付。",
                  "2. 在 RS 控制台下载安装包。",
                  "3. 填写模型 / OpenClaw / 飞书配置。",
                  "4. 运行一键脚本并完成 doctor + 首次 team run。"
                ]
              : [
                  "1. Create account and complete RS checkout.",
                  "2. Download installer artifacts from RS console.",
                  "3. Fill model / OpenClaw / Feishu config template.",
                  "4. Run one-click script and validate with doctor + first team run."
                ]
            ).map((line) => (
              <div key={line} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-1 text-emerald-400" />
                <p className="text-sm text-white/80">{line}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-zinc-50 p-8">
          <h3 className="text-2xl font-bold mb-4">{isZh ? "商用套餐" : "Commercial Package"}</h3>
          <p className="text-black/60 mb-6">
            {isZh
              ? "当前上线价为一次性 ¥199。支付后解锁 RS 授权、安装包下载、配置生成器和部署文档。"
              : "Current launch price is CNY 199 one-time. Purchase unlocks RS entitlement, artifact downloads, config generator, and deployment guide."}
          </p>
          <div className="space-y-3">
            <Link
              to="/app/self-hosted"
              className="w-full block text-center py-3 bg-black text-white rounded-xl font-bold"
            >
              {isZh ? "进入 RS 控制台" : "Open RS Console"}
            </Link>
            <Link
              to="/pricing"
              className="w-full block text-center py-3 border border-black/15 rounded-xl font-bold"
            >
              {isZh ? "查看定价" : "View Pricing"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
