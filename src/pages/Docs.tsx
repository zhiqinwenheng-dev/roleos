import { useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { BookOpen, Cloud, FileText, Layers, Server, Sparkles } from "lucide-react";
import { useTranslation } from "../context/LanguageContext";

type DocKey = "overview" | "rs" | "rc" | "standards" | "ops";

interface DocSection {
  key: DocKey;
  title: { zh: string; en: string };
  subtitle: { zh: string; en: string };
  icon: ReactNode;
}

const sections: DocSection[] = [
  {
    key: "overview",
    title: { zh: "总览", en: "Overview" },
    subtitle: { zh: "先理解平台，再开始执行", en: "Understand first, execute next" },
    icon: <BookOpen className="w-4 h-4" />
  },
  {
    key: "rs",
    title: { zh: "RS 文档", en: "RS Docs" },
    subtitle: { zh: "Self-Hosted 部署与配置", en: "Self-Hosted setup and config" },
    icon: <Server className="w-4 h-4" />
  },
  {
    key: "rc",
    title: { zh: "RC 文档", en: "RC Docs" },
    subtitle: { zh: "Cloud 上手与操作路径", en: "Cloud onboarding and usage" },
    icon: <Cloud className="w-4 h-4" />
  },
  {
    key: "standards",
    title: { zh: "对象标准", en: "Object Standard" },
    subtitle: { zh: "Role / Kit / Team 规范", en: "Role / Kit / Team specs" },
    icon: <Layers className="w-4 h-4" />
  },
  {
    key: "ops",
    title: { zh: "运营与计费", en: "Ops & Billing" },
    subtitle: { zh: "监控、审计、订阅与成本", en: "Metrics, audit, subscription, cost" },
    icon: <FileText className="w-4 h-4" />
  }
];

export default function Docs() {
  const { language } = useTranslation();
  const isZh = language === "zh";
  const [active, setActive] = useState<DocKey>("overview");

  const content = useMemo(() => {
    if (active === "overview") {
      return {
        title: isZh ? "RoleOS 文档中心" : "RoleOS Docs Center",
        summary: isZh
          ? "文档不是概念展示，而是让用户在最短路径内完成“理解 → 部署 → 运行 → 运营”。"
          : "Docs are built for execution: understand, deploy, run, and operate quickly.",
        blocks: [
          {
            heading: isZh ? "平台定义" : "Platform Definition",
            points: isZh
              ? [
                  "RS = RoleOS Self-Hosted（自托管交付）",
                  "RC = RoleOS Cloud（托管交付）",
                  "RS 与 RC 共享一套 Role / Kit / Team 标准"
                ]
              : [
                  "RS = RoleOS Self-Hosted",
                  "RC = RoleOS Cloud",
                  "RS and RC share one Role / Kit / Team standard"
                ]
          },
          {
            heading: isZh ? "推荐阅读顺序" : "Recommended Reading Path",
            points: isZh
              ? ["1. 先读对象标准", "2. 再读 RS 或 RC 路径", "3. 最后看运营与计费"]
              : ["1. Read object standards first", "2. Then choose RS or RC path", "3. Finish with operations and billing"]
          }
        ]
      };
    }

    if (active === "rs") {
      return {
        title: "RS · RoleOS Self-Hosted",
        summary: isZh
          ? "适用于需要私有化部署与运行时控制的团队。"
          : "Best for teams requiring private deployment and runtime control.",
        blocks: [
          {
            heading: isZh ? "部署前准备" : "Before Deployment",
            points: isZh
              ? ["准备服务器或本地机器", "配置模型 API 凭证", "配置飞书 / 机器人凭证"]
              : ["Prepare server or local machine", "Configure model API credentials", "Configure Feishu/bot credentials"]
          },
          {
            heading: isZh ? "标准流程" : "Standard Flow",
            points: ["`/roleos setup`", "`/roleos doctor`", "`/roleos team <teamId> --intent \"<text>\"`"]
          }
        ]
      };
    }

    if (active === "rc") {
      return {
        title: "RC · RoleOS Cloud",
        summary: isZh ? "注册即用，适合快速试用、持续运行与商业转化。" : "Sign up and use immediately for trial and conversion.",
        blocks: [
          {
            heading: isZh ? "入口路径" : "Entry Path",
            points: ["`/signup` -> `/app/cloud`", "`/app/cloud/onboarding`", "`/app/cloud/session`"]
          },
          {
            heading: isZh ? "当前 MVP 范围" : "Current MVP Scope",
            points: ["one channel (Feishu)", "one starter Role / Kit / Team", "one model policy"]
          }
        ]
      };
    }

    if (active === "standards") {
      return {
        title: isZh ? "Role / Kit / Team 对象标准" : "Role / Kit / Team Standard",
        summary: isZh
          ? "这是 RS 与 RC 共用的语义层，也是后续市场化扩展的基础。"
          : "This shared semantic layer powers both RS and RC and future expansion.",
        blocks: [
          {
            heading: "Role",
            points: isZh ? ["定义目标、输入输出、约束", "对应“谁来执行”"] : ["Defines goals, I/O, and constraints", "Represents who executes"]
          },
          {
            heading: "Kit",
            points: isZh ? ["定义依赖资产、安装目标、模型策略", "对应“如何启动”"] : ["Defines assets, install target, model policy", "Represents how work starts"]
          },
          {
            heading: "Team",
            points: isZh ? ["定义协作、交接、检查点", "对应“如何协同执行”"] : ["Defines collaboration, handoff, checkpoints", "Represents coordinated execution"]
          }
        ]
      };
    }

    return {
      title: isZh ? "运营与计费文档" : "Operations & Billing",
      summary: isZh
        ? "围绕商用上线设计：审计、重试、订阅、成本与指标。"
        : "Designed for commercial go-live: audit, retry, subscription, cost and metrics.",
      blocks: [
        {
          heading: isZh ? "关键观测项" : "Key Metrics",
          points: isZh
            ? ["run 成功率", "租户级审计日志", "订阅状态与成本统计"]
            : ["run success rate", "tenant-level audit logs", "subscription and cost stats"]
        },
        {
          heading: isZh ? "后续扩展位（预留）" : "Reserved for Future",
          points: isZh
            ? ["多通道接入", "更多 Team 模板", "更细粒度计费规则"]
            : ["multi-channel integration", "more Team templates", "finer-grained billing rules"]
        }
      ]
    };
  }, [active, isZh]);

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-black/60 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RoleOS Docs</span>
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold text-black">
            {isZh ? "RS / RC 统一文档" : "Unified Docs for RS / RC"}
          </h1>
          <p className="mt-4 text-black/55 max-w-3xl mx-auto leading-relaxed">
            {isZh
              ? "文档结构采用“先认知、再执行”的路径：先理解对象标准，再进入 RS 或 RC 的落地流程。"
              : "The docs follow an understanding-first path: learn standards first, then execute with RS or RC."}
          </p>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-4 md:p-6 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {sections.map((section) => {
              const selected = section.key === active;
              return (
                <button
                  key={section.key}
                  onClick={() => setActive(section.key)}
                  className={`text-left rounded-2xl border p-3 transition-all ${
                    selected
                      ? "bg-black text-white border-black shadow"
                      : "bg-zinc-50 border-black/10 text-black/70 hover:bg-black/5"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    {section.icon}
                    <span>{section.title[language]}</span>
                  </div>
                  <p className={`mt-2 text-xs leading-relaxed ${selected ? "text-white/75" : "text-black/45"}`}>
                    {section.subtitle[language]}
                  </p>
                </button>
              );
            })}
          </div>

          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-8"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-black text-center">{content.title}</h2>
            <p className="mt-3 text-black/55 text-center max-w-3xl mx-auto leading-relaxed">{content.summary}</p>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              {content.blocks.map((block) => (
                <article key={block.heading} className="rounded-2xl border border-black/10 bg-zinc-50 p-5">
                  <h3 className="font-bold text-black mb-3">{block.heading}</h3>
                  <ul className="space-y-2">
                    {block.points.map((point) => (
                      <li key={point} className="text-sm text-black/65 leading-relaxed">
                        • {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="mt-10 text-center">
          <p className="text-sm text-black/45">
            {isZh
              ? "后续将继续补充：行业模板、案例库、迁移指引、开放 API 示例。"
              : "More sections coming soon: industry templates, case library, migration guide, and open API examples."}
          </p>
        </section>
      </div>
    </div>
  );
}
