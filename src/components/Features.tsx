import { motion } from 'motion/react';
import { Users, UserCheck, Wrench, Database } from 'lucide-react';
import { FEATURES } from '../constants';
import { useTranslation } from '../context/LanguageContext';

const ICON_MAP: Record<string, any> = {
  Users,
  UserCheck,
  Wrench,
  Database
};

export const Features = () => {
  const { language } = useTranslation();
  const isZh = language === 'zh';

  return (
    <section className="py-32 relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-grid opacity-[0.02] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-display font-bold mb-6 text-gradient"
          >
            {isZh ? '核心能力' : 'Core Capabilities'}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-500 font-medium"
          >
            {isZh ? '以 Role / Kit / Team 为核心的生产化路径' : 'Production-ready workflow built on Role / Kit / Team'}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature, index) => {
            const Icon = ICON_MAP[feature.icon];
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-10 rounded-[2.5rem] bg-white border border-slate-100 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group shadow-sm"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Icon className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900 group-hover:text-blue-600 transition-colors">
                  {isZh ? feature.title_zh : feature.title}
                </h3>
                <p className="text-slate-500 leading-relaxed text-base">
                  {isZh ? feature.description_zh : feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
