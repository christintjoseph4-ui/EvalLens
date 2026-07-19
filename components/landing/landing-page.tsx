import Link from "next/link";
import { ArrowDown, ArrowRight, FileCheck2, FileText, Flag, Lightbulb, Sparkles } from "lucide-react";

const story = [
  { label: "Your paper", icon: FileText },
  { label: "Teacher notes", icon: FileCheck2 },
  { label: "What to practise", icon: Lightbulb },
  { label: "Your next step", icon: Flag }
];

export function LandingPage() {
  return (
    <main className="min-h-screen px-5 py-6 text-[#111318] sm:px-8 lg:px-12">
      <nav className="mx-auto flex max-w-6xl items-center justify-between py-3">
        <Link className="focus-ring rounded-full text-lg font-semibold" href="/">
          EvalLens AI
        </Link>
        <Link
          className="focus-ring hidden rounded-full border premium-hairline bg-white/64 px-4 py-2 text-sm text-[#102a56] transition hover:bg-white sm:inline-flex"
          href="/sample"
        >
          See how it feels
        </Link>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-14 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
        <div className="soft-enter max-w-4xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border premium-hairline bg-white/70 px-4 py-2 text-sm text-[#666d78]">
            <Sparkles size={15} className="text-[#6d73d9]" aria-hidden />
            A calmer way to learn from every paper
          </p>
          <h1 className="text-balance max-w-4xl text-5xl font-semibold leading-[0.98] tracking-normal sm:text-7xl lg:text-8xl">
            Every Evaluation.
            <span className="block text-[#102a56]">A Better Tomorrow.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-9 text-[#5f6671]">
            EvalLens AI transforms evaluated answer papers into personalized learning
            guidance that helps students, teachers, and parents see the next small step.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#102a56] px-6 py-3.5 text-base font-medium text-white transition hover:bg-[#091b3d]"
              href="/analyse"
            >
              Start My Learning Journey
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link
              className="focus-ring inline-flex items-center justify-center rounded-full border premium-hairline bg-white/72 px-6 py-3.5 text-base font-medium text-[#102a56] transition hover:bg-white"
              href="/sample"
            >
              Understand a Sample Paper
            </Link>
          </div>
        </div>

        <div className="soft-enter-delay">
          <div className="glass paper-shadow rounded-[38px] p-5 sm:p-7">
            <div className="rounded-[30px] border premium-hairline bg-white/82 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666d78]">Your next step</p>
                  <h2 className="mt-1 text-2xl font-semibold">Projectile Motion</h2>
                </div>
                <span className="rounded-full bg-[#edf8f3] px-3 py-1 text-sm text-[#102a56]">
                  Ready when you are
                </span>
              </div>

              <div className="mt-8 rounded-[26px] border premium-hairline bg-[#fbfaf7] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <FileText size={20} className="text-[#102a56]" aria-hidden />
                  <span className="text-sm font-medium text-[#2b3340]">Teacher-marked answer</span>
                </div>
                <div className="space-y-3">
                  <div className="h-3 w-11/12 rounded-full bg-[#dfe5ee]" />
                  <div className="h-3 w-8/12 rounded-full bg-[#dfe5ee]" />
                  <div className="h-10 rounded-2xl border border-[#72c7a3]/45 bg-[#72c7a3]/16" />
                  <div className="h-3 w-7/12 rounded-full bg-[#dfe5ee]" />
                </div>
              </div>

              <div className="mt-5 rounded-[26px] bg-[#102a56] p-5 text-white">
                <p className="text-sm text-white/68">One small step for today</p>
                <p className="mt-2 text-2xl font-semibold leading-snug">
                  Check the final value once before moving on.
                </p>
              </div>

              <div className="relative mt-6 overflow-hidden rounded-[26px] border premium-hairline bg-white/72 p-4">
                <div className="absolute left-8 top-11 h-[calc(100%-88px)] w-px bg-[#dfe5ee]">
                  <div className="journey-line h-full w-px bg-[#6d73d9]" />
                </div>
                <div className="relative grid gap-3">
                  {story.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        className="journey-step flex min-h-12 items-center gap-3 rounded-2xl bg-white/60 px-3 text-sm font-medium text-[#2b3340]"
                        key={item.label}
                      >
                        <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef1ff] text-[#6d73d9]">
                          <Icon size={16} aria-hidden />
                        </span>
                        <span>{item.label}</span>
                        {index < story.length - 1 ? (
                          <ArrowDown className="ml-auto text-[#a4acb9]" size={14} aria-hidden />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl pb-16">
        <div className="rounded-[34px] border premium-hairline bg-white/54 p-6 sm:p-8">
          <p className="text-sm font-medium text-[#6d73d9]">You have already done the hard part.</p>
          <p className="mt-3 max-w-3xl text-2xl leading-10 text-[#2b3340]">
            Bring the paper. See what it is trying to teach you. Leave with one clear next
            step that feels possible today.
          </p>
        </div>
      </section>
    </main>
  );
}
