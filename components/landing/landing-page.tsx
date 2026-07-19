import Link from "next/link";
import { ArrowRight, FileUp, GraduationCap, Sparkles } from "lucide-react";

const workflow = [
  {
    title: "Upload",
    text: "Add the question paper and evaluated answer paper.",
    icon: FileUp
  },
  {
    title: "Understand",
    text: "See evidence-grounded insights question by question.",
    icon: Sparkles
  },
  {
    title: "Improve",
    text: "Leave with one clear next action and a focused plan.",
    icon: GraduationCap
  }
];

export function LandingPage() {
  return (
    <main className="min-h-screen px-5 py-6 text-[#1f2423] sm:px-8 lg:px-12">
      <nav className="mx-auto flex max-w-6xl items-center justify-between py-3">
        <Link className="focus-ring rounded-full text-lg font-semibold" href="/">
          EvalLens AI
        </Link>
        <Link
          className="focus-ring hidden rounded-full border border-[#ddd8ce] bg-white/60 px-4 py-2 text-sm text-[#365f5b] transition hover:bg-white sm:inline-flex"
          href="/sample"
        >
          Sample experience
        </Link>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-[#ddd8ce] bg-white/62 px-4 py-2 text-sm text-[#56615e]">
            AI-powered post-evaluation learning intelligence
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.04] tracking-normal sm:text-6xl lg:text-7xl">
            An exam ends when the paper is evaluated. Learning shouldn&apos;t.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5e6663] sm:text-xl">
            EvalLens transforms evaluated answer papers into calm, evidence-based
            guidance for students and teachers.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#365f5b] px-6 py-3 text-base font-medium text-white transition hover:bg-[#244843]"
              href="/analyse"
            >
              Analyse an evaluated paper
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link
              className="focus-ring inline-flex items-center justify-center rounded-full border border-[#cfc8ba] bg-white/70 px-6 py-3 text-base font-medium text-[#244843] transition hover:bg-white"
              href="/sample"
            >
              Try the sample experience
            </Link>
          </div>
        </div>

        <div className="glass paper-shadow rounded-[28px] p-4 sm:p-6">
          <div className="rounded-[22px] border border-[#e3ded3] bg-[#fffdf8] p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#6b716f]">Prepared Physics sample</p>
                <h2 className="mt-1 text-2xl font-semibold">Improvement plan is ready</h2>
              </div>
              <span className="rounded-full bg-[#e6eee9] px-3 py-1 text-sm font-medium text-[#365f5b]">
                13 recoverable
              </span>
            </div>
            <div className="space-y-3">
              {[
                "Evidence from evaluated answer areas",
                "Teacher discretion boundary",
                "Full-mark guidance and next revision action"
              ].map((item) => (
                <div
                  className="flex items-center justify-between rounded-2xl border border-[#ede8de] bg-[#faf7f0] px-4 py-3"
                  key={item}
                >
                  <span className="text-sm text-[#424946]">{item}</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8ba17d]" />
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-[#f0ebe0] p-4">
              <p className="text-sm font-medium text-[#1f2423]">Best next step</p>
              <p className="mt-1 text-sm leading-6 text-[#5e6663]">
                Spend 25 minutes revising Projectile Motion with two calculation checks.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl pb-12">
        <div className="grid gap-3 md:grid-cols-3">
          {workflow.map((item) => {
            const Icon = item.icon;
            return (
              <article className="glass rounded-3xl p-5" key={item.title}>
                <Icon className="mb-4 text-[#365f5b]" size={24} aria-hidden />
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 leading-7 text-[#656d69]">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
