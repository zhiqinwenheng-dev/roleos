import { motion } from 'motion/react';
import { Box, Cpu, Globe, Layers, Users, Zap } from 'lucide-react';

export default function Product() {
  return (
    <div className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-24">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl md:text-7xl font-bold text-black mb-8 leading-tight"
          >
            RoleOS 是什么？
            <br />
            <span className="text-black/40">OpenClaw 之上的工作标准层</span>
          </motion.h1>
          <p className="text-xl text-black/60 leading-relaxed">
            RoleOS 不是新的 runtime，也不是 OpenClaw 的替代品。它负责把复杂能力变成可理解、可复用、可运营的工作对象，
            并通过 RS 与 Rc 两种交付方式服务不同阶段用户。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-32">
          {[
            {
              title: 'Role（谁执行）',
              desc: '定义角色目标、输入输出、约束与能力边界，是执行任务的核心身份。',
              icon: <Users className="w-8 h-8" />,
              color: 'bg-blue-500'
            },
            {
              title: 'Kit（怎么启动）',
              desc: '定义工具链、模型策略、安装目标与运行模板，保证任务可复现。',
              icon: <Box className="w-8 h-8" />,
              color: 'bg-emerald-500'
            },
            {
              title: 'Team（怎么协作）',
              desc: '定义多个角色之间的交接、检查点与成功标准，支撑复杂任务闭环。',
              icon: <Layers className="w-8 h-8" />,
              color: 'bg-amber-500'
            }
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-10 rounded-3xl border border-black/5 bg-white shadow-sm"
            >
              <div className={`w-16 h-16 ${item.color} text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg`}>
                {item.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
              <p className="text-black/60 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <section className="bg-black text-white rounded-[3rem] p-12 md:p-20 mb-32 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent" />
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">RS / Rc 同核声明</h2>
            <p className="text-xl text-white/65 mb-10 leading-relaxed">
              RS（RoleOS Self-Hosted）与 Rc（RoleOS Cloud）共用同一套 Role / Kit / Team 标准，
              对象语义、生命周期、适配契约保持一致，避免平台分叉。
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div className="flex items-center space-x-3">
                <Zap className="w-6 h-6 text-emerald-400" />
                <span className="font-bold">标准同步</span>
              </div>
              <div className="flex items-center space-x-3">
                <Globe className="w-6 h-6 text-blue-400" />
                <span className="font-bold">可迁移执行</span>
              </div>
            </div>
          </div>
        </section>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-16">生态与扩展</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: 'Feishu / Lark', icon: <Globe className="w-7 h-7" /> },
              { name: 'OpenClaw Adapter', icon: <Cpu className="w-7 h-7" /> },
              { name: 'Market Catalog', icon: <Layers className="w-7 h-7" /> },
              { name: 'Custom SDK', icon: <Box className="w-7 h-7" /> }
            ].map((item) => (
              <div key={item.name} className="p-8 rounded-2xl border border-black/5 bg-zinc-50 hover:bg-white hover:shadow-md transition-all">
                <div className="mb-4 flex justify-center text-black/70">{item.icon}</div>
                <div className="font-bold text-black/80">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
