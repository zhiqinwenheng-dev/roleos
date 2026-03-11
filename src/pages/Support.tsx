export default function SupportPage() {
  return (
    <div className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-black text-white p-8 mb-6">
        <h1 className="text-3xl font-bold">Support Center</h1>
        <p className="text-white/60 mt-2">Deployment, billing, and cloud operation support for RoleOS.</p>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          {
            title: "RS Deployment",
            desc: "Installer download, config generation, and one-click deployment troubleshooting."
          },
          {
            title: "Rc Cloud",
            desc: "Signup/login issues, run failures, plan upgrade, and workspace isolation checks."
          },
          {
            title: "Commercial Ops",
            desc: "Order status, checkout callback validation, and admin audit process."
          }
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-black/10 bg-white p-5">
            <h2 className="font-bold mb-2">{item.title}</h2>
            <p className="text-sm text-black/60">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
        <h3 className="font-bold mb-2">Response SLA</h3>
        <p className="text-sm text-black/60">
          MVP stage default support window is 24 hours for blocking incidents and 72 hours for
          general product questions.
        </p>
      </section>
    </div>
  );
}

