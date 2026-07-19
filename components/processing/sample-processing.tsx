"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const stages = [
  "Understanding the questions",
  "Connecting answers with evaluator observations",
  "Identifying growth opportunities",
  "Preparing your next learning steps"
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
      <section className="glass paper-shadow w-full max-w-2xl rounded-[32px] p-8">
        <p className="text-center text-sm font-medium text-[#365f5b]">Prepared sample mode</p>
        <h1 className="mt-3 text-center text-4xl font-semibold">Your improvement plan is forming</h1>
        <div className="mt-8 space-y-3">
          {stages.map((stage, index) => (
            <div
              className={`rounded-2xl border px-4 py-3 transition ${
                index <= activeStage
                  ? "border-[#cfded6] bg-white text-[#244843]"
                  : "border-[#e7e1d6] bg-white/48 text-[#7b817e]"
              }`}
              key={stage}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    index <= activeStage ? "bg-[#365f5b]" : "bg-[#c8c1b4]"
                  }`}
                />
                {stage}
              </div>
            </div>
          ))}
        </div>
        <Link
          className="focus-ring mx-auto mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#365f5b] px-5 py-3 font-medium text-white"
          href="/results/sample-physics-projectile-motion"
        >
          View sample now
          <ArrowRight size={18} aria-hidden />
        </Link>
      </section>
    </main>
  );
}
