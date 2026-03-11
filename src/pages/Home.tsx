import { motion } from "motion/react";
import { ArrowRight, BarChart3, CheckCircle2, ChevronRight, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../context/LanguageContext";

export default function Home() {
  const { language, t } = useTranslation();
  const isZh = language === "zh";

  return (
    <div className="pt-24">
      <section className="px-4 sm:px-6 lg:px-8 py-20 lg:py-28 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-black mb-6 leading-[1.12]">
            {t("hero_title_1")}
            <br />
            <span className="text-black/40 italic">{t("hero_title_2")}</span>
          </h1>
          <p className="text-lg md:text-xl text-black/60 max-w-3xl mx-auto mb-10">{t("hero_subtitle")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/products/self-hosted"
              className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-full font-bold hover:bg-black/85 transition-all flex items-center justify-center space-x-2 group"
            >
              <span>{t("hero_cta_b")}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/app/cloud"
              className="w-full sm:w-auto px-8 py-4 bg-white text-black border border-black/10 rounded-full font-bold hover:bg-black/5 transition-all"
            >
              {t("hero_cta_c")}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="mt-14 relative rounded-2xl overflow-hidden border border-black/5 shadow-lg bg-zinc-50 max-w-2xl mx-auto h-44 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-grid-black/[0.02] bg-[size:16px_16px]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex space-x-3 mb-5">
              {["Role", "Kit", "Team"].map((item) => (
                <div
                  key={item}
                  className="w-12 h-12 bg-white rounded-lg shadow-sm border border-black/5 flex items-center justify-center font-bold text-sm text-black/70"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="h-1 w-40 bg-black/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-black"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>
      </section>

      <section className="bg-zinc-50 py-24 border-y border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { title: t("val_1_title"), desc: t("val_1_desc"), icon: <Shield className="w-6 h-6" /> },
              { title: t("val_2_title"), desc: t("val_2_desc"), icon: <Zap className="w-6 h-6" /> },
              { title: t("val_3_title"), desc: t("val_3_desc"), icon: <BarChart3 className="w-6 h-6" /> }
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center mb-6">
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold text-black mb-3">{card.title}</h3>
                <p className="text-black/60 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-black mb-4">
            {isZh ? "选择你的交付方式" : "Choose Your Delivery Mode"}
          </h2>
          <p className="text-black/50">
            {isZh
              ? "RS 与 RC 属于同一个 RoleOS 平台，只是在交付方式和运行边界上不同。"
              : "RS and RC are two delivery modes on one RoleOS platform with different operation boundaries."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-10 rounded-3xl border border-black/5 bg-white flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 bg-zinc-100 text-xs font-bold rounded-full uppercase tracking-wider mb-6 inline-block">
                RS · RoleOS Self-Hosted
              </span>
              <h3 className="text-3xl font-bold text-black mb-4">
                {isZh ? "自托管私有部署" : "Self-Hosted Deployment"}
              </h3>
              <p className="text-black/60 mb-8">
                {isZh
                  ? "适合对数据和环境有强控制需求的团队，可部署在本地、私有云或指定服务器。"
                  : "Built for teams that need strong control over data and runtime environment."}
              </p>
              <ul className="space-y-4 mb-10">
                {(isZh
                  ? [
                      "一次性购买（¥199）",
                      "支持 Windows / macOS / Linux",
                      "可接入自有模型与飞书",
                      "完整 Role / Kit / Team 工作流"
                    ]
                  : [
                      "One-time purchase (¥199)",
                      "Windows / macOS / Linux support",
                      "Bring your own model and Feishu",
                      "Full Role / Kit / Team workflow"
                    ]
                ).map((item, i) => (
                  <li key={i} className="flex items-center space-x-3 text-sm text-black/70">
                    <CheckCircle2 className="w-5 h-5 text-black" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/products/self-hosted"
              className="text-black font-bold flex items-center space-x-2 hover:translate-x-1 transition-transform"
            >
              <span>{isZh ? "查看 RS 详情" : "View RS"}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-10 rounded-3xl bg-black text-white flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 bg-white/10 text-xs font-bold rounded-full uppercase tracking-wider mb-6 inline-block text-white/80">
                RC · RoleOS Cloud
              </span>
              <h3 className="text-3xl font-bold mb-4">{isZh ? "托管即用平台" : "Managed Cloud Platform"}</h3>
              <p className="text-white/65 mb-8">
                {isZh
                  ? "注册后直接使用，适合快速验证业务、持续迭代和轻量团队协作。"
                  : "Start immediately after signup, ideal for fast validation and continuous iteration."}
              </p>
              <ul className="space-y-4 mb-10">
                {(isZh
                  ? ["3 天免费试用", "BYOM 免费继续使用", "Managed Model ¥39/月", "内置租户隔离与运行审计"]
                  : [
                      "3-day free trial",
                      "BYOM free after trial",
                      "Managed Model ¥39/mo",
                      "Tenant isolation and run audit built in"
                    ]
                ).map((item, i) => (
                  <li key={i} className="flex items-center space-x-3 text-sm text-white/75">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/app/cloud"
              className="text-white font-bold flex items-center space-x-2 hover:translate-x-1 transition-transform"
            >
              <span>{isZh ? "进入 RC 平台" : "Open RC"}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 bg-zinc-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                {isZh ? "从意图到结果" : "From Intent to Result"}
                <br />
                <span className="text-white/40">{isZh ? "标准化执行路径" : "Standardized Execution Path"}</span>
              </h2>
              <div className="space-y-8">
                {[
                  {
                    step: "01",
                    title: isZh ? "Intent（业务意图）" : "Intent",
                    desc: isZh ? "用户输入目标，系统识别任务边界。" : "User provides goal and constraints."
                  },
                  { step: "02", title: "Role", desc: isZh ? "匹配执行角色。" : "Selects the role for the job." },
                  { step: "03", title: "Kit", desc: isZh ? "启用工具与模板。" : "Enables tools and run templates." },
                  {
                    step: "04",
                    title: "Team",
                    desc: isZh ? "按协作拓扑完成多步骤交付。" : "Coordinates multi-step collaboration."
                  }
                ].map((item, i) => (
                  <div key={i} className="flex space-x-6">
                    <span className="text-2xl font-mono text-white/20">{item.step}</span>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                      <p className="text-white/55">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                <div className="w-3/4 h-3/4 border-2 border-dashed border-white/20 rounded-full animate-[spin_20s_linear_infinite] flex items-center justify-center">
                  <div className="w-1/2 h-1/2 bg-white/10 rounded-full blur-3xl" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-2">Run</div>
                    <div className="text-white/40 text-sm uppercase tracking-widest">Execution</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-black text-white text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-6xl font-bold mb-10">
            {isZh ? "现在就开始你的 RoleOS 路径" : "Start Your RoleOS Path Today"}
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              to="/products/self-hosted"
              className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-all"
            >
              {isZh ? "下载 RS Self-Hosted" : "Get RS Self-Hosted"}
            </Link>
            <Link
              to="/app/cloud"
              className="w-full sm:w-auto px-10 py-5 bg-black border border-white/20 rounded-full font-bold hover:bg-white/10 transition-all"
            >
              {isZh ? "进入 RC Cloud" : "Open RC Cloud"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
