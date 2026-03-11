import { motion } from 'motion/react';
import { Quote } from 'lucide-react';
import { TESTIMONIALS } from '../constants';
import { useTranslation } from '../context/LanguageContext';

export const Testimonials = () => {
  const { language } = useTranslation();
  const isZh = language === 'zh';

  return (
    <section className="py-32 relative overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-display font-bold mb-6 text-gradient"
          >
            {isZh ? '用户反馈' : 'What Teams Say'}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-500 font-medium"
          >
            {isZh ? '来自真实使用场景的评价' : 'Feedback from real production usage'}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-12 rounded-[3rem] bg-white border border-slate-100 relative group hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all shadow-sm"
            >
              <Quote className="w-16 h-16 text-blue-500/5 absolute top-10 right-10 group-hover:text-blue-500/10 transition-colors" />
              
              <p className="text-xl text-slate-600 mb-12 leading-relaxed italic relative z-10 font-medium">
                "{isZh ? testimonial.quote_zh : testimonial.quote}"
              </p>
              
              <div className="flex items-center gap-5">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.author}
                  className="w-16 h-16 rounded-2xl border-2 border-blue-500/10 shadow-lg"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-xl">{testimonial.author}</h4>
                  <p className="text-blue-600 font-bold text-sm">
                    {isZh ? testimonial.role_zh : testimonial.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
