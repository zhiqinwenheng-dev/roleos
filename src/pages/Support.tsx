import { useTranslation } from "../context/LanguageContext";

export default function SupportPage() {
  const { language } = useTranslation();
  const isZh = language === "zh";

  return (
    <div className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-black text-white p-8 mb-6">
        <h1 className="text-3xl font-bold">{isZh ? "支持中心" : "Support Center"}</h1>
        <p className="text-white/60 mt-2">
          {isZh
            ? "提供 RoleOS 的部署、计费与云端运行支持。"
            : "Deployment, billing, and cloud operation support for RoleOS."}
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          {
            title: isZh ? "RS 部署支持" : "RS Deployment",
            desc: isZh
              ? "安装包下载、配置生成与一键部署故障排查。"
              : "Installer download, config generation, and one-click deployment troubleshooting."
          },
          {
            title: isZh ? "RC Cloud 支持" : "RC Cloud",
            desc: isZh
              ? "注册登录、run 失败、套餐升级与工作空间隔离检查。"
              : "Signup/login issues, run failures, plan upgrade, and workspace isolation checks."
          },
          {
            title: isZh ? "商业化运营支持" : "Commercial Ops",
            desc: isZh
              ? "订单状态、结算回调验证与 Admin 审计流程。"
              : "Order status, checkout callback validation, and admin audit process."
          }
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-black/10 bg-white p-5">
            <h2 className="font-bold mb-2">{item.title}</h2>
            <p className="text-sm text-black/60">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
        <h3 className="font-bold mb-2">{isZh ? "响应 SLA" : "Response SLA"}</h3>
        <p className="text-sm text-black/60">
          {isZh
            ? "MVP 阶段默认支持窗口：阻塞性故障 24 小时内响应，一般产品问题 72 小时内响应。"
            : "MVP stage default support window is 24 hours for blocking incidents and 72 hours for general product questions."}
        </p>
      </section>
    </div>
  );
}
