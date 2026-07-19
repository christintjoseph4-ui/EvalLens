"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

const stages = [
  "Understanding the questions",
  "Understanding teacher feedback",
  "Building learning intelligence",
  "Preparing your improvement plan"
];

export function SampleProcessing() {
  const router = useRouter();
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const stageTimer = window.setInterval(() => {
      setActiveStage((current) => Math.min(current + 1, stages.length - 1));
    }, 650);

    const routeTimer = window.setTimeout(() => {
      router.push("/results/sample-physics-projectile-motion");
    }, 3000);

    return () => {
      window.clearInterval(stageTimer);
      window.clearTimeout(routeTimer);
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="glass paper-shadow w-full max-w-2xl rounded-[36px] p-8 sm:p-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef1ff] text-[#6d73d9]">
          <Sparkles size={22} aria-hidden />
        </span>
        <p className="mt-5 text-center text-sm font-medium text-[#102a56]">Prepared sample experience</p>
        <h1 className="mt-3 text-center text-balance text-5xl font-semibold leading-tight">
          Your improvement plan is forming
        </h1>
        <div className="mt-9 space-y-3" role="status" aria-live="polite">
          {stages.map((stage, index) => (
            <div
              className={`rounded-[24px] border px-4 py-4 transition ${
                index <= activeStage
                  ? "border-[#dce0ff] bg-white text-[#102a56]"
                  : "border-[#e8e5df] bg-white/48 text-[#757d88]"
              }`}
              key={stage}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    index <= activeStage ? "bg-[#6d73d9]" : "bg-[#c8ced9]"
                  }`}
                />
                {stage}
              </div>
            </div>
          ))}
        </div>
        <Link
          className="focus-ring mx-auto mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#102a56] px-5 py-3 font-medium text-white"
          href="/results/sample-physics-projectile-motion"
        >
          View sample now
          <ArrowRight size={18} aria-hidden />
        </Link>
      </section>
    </main>
  );
}
