import Link from "next/link";
import { ArrowDown, ArrowRight, Brain, FileCheck2, FileText, Flag, Sparkles } from "lucide-react";

const workflow = [
  {
    title: "Question Paper",
    text: "The original intent, marks and concepts become the learning frame.",
    icon: FileText
  },
  {
    title: "Teacher Evaluation",
    text: "Marks and annotations remain human-owned and respected.",
    icon: FileCheck2
  },
  {
    title: "Learning Intelligence",
    text: "EvalLens turns evidence into question-wise insight.",
    icon: Brain
  },
  {
    title: "Goal Achievement",
    text: "The paper becomes a calm plan for what to do next.",
    icon: Flag
  }
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
          Sample experience
        </Link>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-12 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
        <div className="max-w-4xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border premium-hairline bg-white/70 px-4 py-2 text-sm text-[#666d78]">
            <Sparkles size={15} className="text-[#6d73d9]" aria-hidden />
            Personalized learning intelligence
          </p>
          <h1 className="text-balance max-w-4xl text-6xl font-semibold leading-[0.96] tracking-normal sm:text-7xl lg:text-8xl">
            Every Evaluation.
            <span className="block text-[#102a56]">A Better Tomorrow.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-9 text-[#5f6671]">
            EvalLens AI transforms evaluated answer papers into personalized learning
            intelligence for students and teachers.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#102a56] px-6 py-3.5 text-base font-medium text-white transition hover:bg-[#091b3d]"
              href="/analyse"
            >
              Analyse My Paper
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link
              className="focus-ring inline-flex items-center justify-center rounded-full border premium-hairline bg-white/72 px-6 py-3.5 text-base font-medium text-[#102a56] transition hover:bg-white"
              href="/sample"
            >
              Try Sample Experience
            </Link>
          </div>
        </div>

        <div className="glass paper-shadow rounded-[34px] p-6">
          <div className="mb-7">
            <p className="text-sm text-[#666d78]">EvalLens workflow</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">From marked paper to momentum.</h2>
          </div>
          <div className="space-y-3">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.title}>
                  <article className="rounded-[26px] border premium-hairline bg-white/74 p-5">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef1ff] text-[#6d73d9]">
                        <Icon size={20} aria-hidden />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                        <p className="mt-1 max-w-sm text-sm leading-6 text-[#666d78]">{item.text}</p>
                      </div>
                    </div>
                  </article>
                  {index < workflow.length - 1 ? (
                    <div className="flex h-7 items-center justify-center text-[#9aa2b1]">
                      <ArrowDown size={16} aria-hidden />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl pb-16">
        <div className="rounded-[34px] border premium-hairline bg-white/54 p-6 sm:p-8">
          <p className="text-sm font-medium text-[#6d73d9]">One story, not a dashboard</p>
          <p className="mt-3 max-w-3xl text-2xl leading-10 text-[#2b3340]">
            Upload the paper. Understand the evidence. Leave with one clear next focus,
            full-mark guidance, and a learning journey that feels possible.
          </p>
        </div>
      </section>
    </main>
  );
}
