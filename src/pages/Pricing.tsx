import { motion } from 'motion/react';
import { Check, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'RS · RoleOS Self-Hosted',
    price: '199',
    period: '一次性',
    desc: '购买后下载部署包并在你的环境运行，适合私有化与可控生产。',
    features: [
      '一键安装器与部署脚本',
      '支持 Windows / macOS / Linux',
      'Role / Kit / Team Starter Pack',
      '部署文档与配置模板',
      '长期可用授权'
    ],
    cta: '购买 RS',
    link: '/products/self-hosted',
    highlight: false
  },
  {
    name: 'Rc · Cloud BYOM',
    price: '0',
    period: '试用后可继续免费',
    desc: '3 天免费试用，接入自有模型，适合快速上手与轻运营团队。',
    features: [
      '注册即用，无需部署',
      '3 天完整试用',
      'BYOM（自带模型）',
      '基础运行与审计能力',
      '可随时升级 Managed Model'
    ],
    cta: '开始 Rc 试用',
    link: '/app/cloud',
    highlight: true
  },
  {
    name: 'Rc · Managed Model',
    price: '39',
    period: '每月',
    desc: '平台托管模型与运行策略，减少模型配置和运维成本。',
    features: [
      '包含 BYOM 方案全部能力',
      '平台模型套餐',
      '持续更新与运行维护',
      '优先支持与稳定策略',
      '面向商业化持续使用'
    ],
    cta: '订阅 Rc 套餐',
    link: '/app/cloud',
    highlight: false
  }
];

export default function Pricing() {
  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-20">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold text-black mb-6"
        >
          清晰可执行的定价
        </motion.h1>
        <p className="text-xl text-black/50 max-w-2xl mx-auto">
          一个 RoleOS 平台，两条商业路径：RS 面向自托管，Rc 面向托管即用。
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
              plan.highlight ? 'border-black bg-black text-white shadow-xl scale-105 z-10' : 'border-black/5 bg-white text-black'
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-widest">
                推荐起步
              </span>
            )}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-bold">¥{plan.price}</span>
                <span className={`text-sm ${plan.highlight ? 'text-white/60' : 'text-black/40'}`}>/{plan.period}</span>
              </div>
              <p className={`mt-4 text-sm ${plan.highlight ? 'text-white/60' : 'text-black/50'}`}>{plan.desc}</p>
            </div>

            <ul className="space-y-4 mb-10">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start space-x-3 text-sm">
                  <Check className={`w-5 h-5 shrink-0 ${plan.highlight ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span className={plan.highlight ? 'text-white/80' : 'text-black/70'}>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              to={plan.link}
              className={`block w-full py-4 rounded-xl font-bold text-center transition-all ${
                plan.highlight ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-black/85'
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
            <h4 className="text-xl font-bold mb-4">计费模式说明</h4>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h5 className="font-bold mb-2">API Token 模式</h5>
                <p className="text-sm text-black/60 leading-relaxed">
                  用户提供自己的大模型 API 凭证（如 OpenAI、Anthropic、DeepSeek 等），平台主要收取软件与服务费用。
                </p>
              </div>
              <div>
                <h5 className="font-bold mb-2">算力 Token 模式</h5>
                <p className="text-sm text-black/60 leading-relaxed">
                  使用 Rc 托管模型和算力，无需自行配置模型供应商，按订阅与运行策略使用。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
