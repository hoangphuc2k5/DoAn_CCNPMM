import React from "react";

const AuthLayout = ({ title, subtitle, children, footer }) => {
  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-12">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-reef/20 blur-3xl" />
      <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-ember/20 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center gap-6">
          <p className="text-sm uppercase tracking-[0.3em] text-reef">Telegram</p>
          <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-md text-base text-black/70">{subtitle}</p>
          <div className="mt-6 grid gap-3 text-sm text-black/70">                      
          </div>
        </div>

        <div className="rounded-[32px] border border-black/10 bg-white/80 p-8 shadow-glow backdrop-blur">
          {children}
          {footer ? <div className="mt-8 text-sm text-black/70">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
