import { motion } from 'motion/react';
import { Check, Cpu, Wrench } from 'lucide-react';
import { useTranslation } from '../App';

export const Pricing = () => {
  const { t } = useTranslation();

  const serviceCards = [
    {
      id: 'openclaw-service',
      icon: Wrench,
      title: t.pricing.service1Title,
      slogan: t.pricing.service1Slogan,
      description: t.pricing.service1Desc,
      items: [
        t.pricing.service1Item1,
        t.pricing.service1Item2,
        t.pricing.service1Item3,
        t.pricing.service1Item4
      ],
      cta: t.pricing.ctaPrimary,
      highlighted: true,
      cardClass:
        'bg-blue-600 border-blue-500 shadow-[0_20px_50px_-15px_rgba(37,99,235,0.4)] text-white scale-[1.02]',
      iconWrapClass: 'bg-white/20 text-white',
      itemDotClass: 'bg-white/20 text-white',
      buttonClass: 'bg-white text-blue-600 hover:bg-blue-50'
    },
    {
      id: 'compute-service',
      icon: Cpu,
      title: t.pricing.service2Title,
      slogan: t.pricing.service2Slogan,
      description: t.pricing.service2Desc,
      items: [
        t.pricing.service2Item1,
        t.pricing.service2Item2,
        t.pricing.service2Item3,
        t.pricing.service2Item4
      ],
      cta: t.pricing.ctaSecondary,
      highlighted: false,
      cardClass: 'bg-white border-slate-100 text-slate-900 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/50',
      iconWrapClass: 'bg-blue-50 text-blue-600',
      itemDotClass: 'bg-blue-50 text-blue-600',
      buttonClass: 'bg-slate-900 text-white hover:bg-slate-800'
    }
  ];

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
            {t.pricing.title}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-500 font-medium"
          >
            {t.pricing.subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {serviceCards.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`p-12 rounded-[3rem] border relative flex flex-col transition-all duration-500 ${service.cardClass}`}
            >
              {service.highlighted && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-[0.2em] shadow-xl">
                  {t.pricing.badge}
                </div>
              )}

              <div className="mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${service.iconWrapClass}`}>
                  <service.icon className="w-8 h-8" />
                </div>
                <h3 className={`text-3xl font-black mb-3 ${service.highlighted ? 'text-white' : 'text-slate-900'}`}>
                  {service.title}
                </h3>
                <p className={`text-base font-semibold ${service.highlighted ? 'text-blue-100' : 'text-blue-600'}`}>
                  {service.slogan}
                </p>
                <p className={`text-base leading-relaxed mt-5 ${service.highlighted ? 'text-blue-50' : 'text-slate-500'}`}>
                  {service.description}
                </p>
              </div>

              <ul className="space-y-5 mb-12 flex-grow">
                {service.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-3">
                    <div className={`mt-1 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${service.itemDotClass}`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className={`text-base font-medium ${service.highlighted ? 'text-blue-50' : 'text-slate-600'}`}>{item}</span>
                  </li>
                ))}
              </ul>

              <button className={`w-full py-5 rounded-2xl font-black transition-all active:scale-95 shadow-lg ${service.buttonClass}`}>
                {service.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
