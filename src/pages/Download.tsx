import { motion } from "motion/react";
import { CheckCircle2, Download, Server, ShieldCheck, Workflow } from "lucide-react";
import { Link } from "react-router-dom";

export default function DownloadPage() {
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
          RS is the private deployment product of RoleOS. Buy once, deploy in your own
          environment, and keep Role/Kit/Team standards aligned with Rc Cloud.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-14">
        {[
          {
            title: "One-Click Installer",
            desc: "Download installers and setup scripts for Windows, Linux, and macOS.",
            icon: <Download className="w-6 h-6" />
          },
          {
            title: "Own Runtime Control",
            desc: "Deploy in local machine, private cloud, or dedicated server with your own keys.",
            icon: <Server className="w-6 h-6" />
          },
          {
            title: "Production Baseline",
            desc: "Includes starter objects, docs, and audit-ready operation flow.",
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
            Deployment Flow
          </h3>
          <div className="space-y-4">
            {[
              "1. Create account and complete RS checkout.",
              "2. Download installer artifacts from RS console.",
              "3. Fill model/OpenClaw/Feishu config template.",
              "4. Run one-click script and validate with doctor + first team run."
            ].map((line) => (
              <div key={line} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-1 text-emerald-400" />
                <p className="text-sm text-white/80">{line}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-zinc-50 p-8">
          <h3 className="text-2xl font-bold mb-4">Commercial Package</h3>
          <p className="text-black/60 mb-6">
            Current launch price is CNY 199 one-time. Purchase unlocks RS entitlement, artifact
            downloads, config generator, and deployment guide.
          </p>
          <div className="space-y-3">
            <Link
              to="/app/self-hosted"
              className="w-full block text-center py-3 bg-black text-white rounded-xl font-bold"
            >
              Open RS Console
            </Link>
            <Link
              to="/pricing"
              className="w-full block text-center py-3 border border-black/15 rounded-xl font-bold"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

