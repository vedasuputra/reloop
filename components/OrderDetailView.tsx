"use client";
import type React from "react";
import RecPill from "@/components/RecPill";
import Section from "@/components/Section";
import { BAND, TEAL, TEAL_LIGHT, TRACK_COLOR } from "@/components/DashboardCharts";
import type { OrderDetailData, OrderLabels } from "@/lib/orderDetail";

const CARD = "rounded-[9px] border border-[#174538]/15 bg-white p-5";

/**
 * The order details, drawn from plain data: recommendation and AI prediction, what drives the probability, the score and the cost.
 * Used by the popup on the Orders page and by the full order page. `start` shifts the staggered fade-in.
 */
export default function OrderDetailView({ d, l, start = 0 }: { d: OrderDetailData; l: OrderLabels; start?: number }) {
  return (
    <div className="@container">
      {/* 0. The order's facts: a grid that wraps (2, 4 or 8 to a row by the width of its box), never a sideways scroll */}
      <div className="rl-rise mt-6 overflow-hidden rounded-[9px] border border-[#174538]/15 bg-white" style={{ "--d": `${start * 0.08}s` } as React.CSSProperties}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 @lg:grid-cols-4 @3xl:grid-cols-8">
          {d.fields.map((x) => (
            <div key={x.label} className="min-w-0">
              <dt className="text-xs font-medium text-[#355E3B]">{x.label}</dt>
              <dd className="mt-1 break-words text-sm">{x.value}</dd>
            </div>
          ))}
          <div className="min-w-0">
            <dt className="text-xs font-medium text-[#355E3B]">{l.packingInstruction}</dt>
            <dd className="mt-1"><RecPill rec={d.rec} /></dd>
          </div>
        </dl>
      </div>

      {/* 1. What to pack, and the AI prediction */}
      <Section title={l.recommendation} i={start}>
        <div className="grid gap-5 @3xl:grid-cols-2">
          <div className={CARD}>
            <p className="text-xs text-[#355E3B]">{l.packingInstruction}</p>
            <p className="mt-2 text-xl font-semibold">{d.instruction}</p>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">{d.rvsText}</span>
              <span className="text-sm text-[#355E3B]">/ 100 RVS</span>
            </div>
            {/* Gauge: the three bands, with a marker at this order's score */}
            <div className="relative mt-3">
              <div className="flex h-3 overflow-hidden rounded-[2px]">
                <div style={{ width: "40%", background: BAND.single }} /><div style={{ width: "30%", background: BAND.review }} /><div style={{ width: "30%", background: BAND.reusable }} />
              </div>
              <div aria-hidden className="absolute -top-1 h-5 w-[3px] -translate-x-1/2 rounded-full bg-[#174538] ring-2 ring-white" style={{ left: `${Math.min(100, Math.max(0, d.rvs))}%` }} />
              <div className="mt-1.5 flex text-[11px] text-[#355E3B]">
                <span style={{ width: "40%" }}>{l.gaugeSingle}</span><span style={{ width: "30%" }}>{l.gaugeReview}</span><span className="text-right" style={{ width: "30%" }}>{l.gaugeReusable}</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed"><span className="font-semibold">{l.why}:</span> {d.reason}</p>
            <p className="mt-3 flex items-center gap-2 whitespace-nowrap border-t border-[#174538]/10 pt-3 text-sm text-[#355E3B]">
              {d.other.label} <RecPill rec={d.other.rec} /> <span>· RVS {d.other.rvsText}</span>
            </p>
          </div>

          <div className={CARD}>
            <p className="text-xs text-[#355E3B]">{l.aiPrediction}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">{d.probText}</span>
              <span className="text-sm text-[#355E3B]">{l.chance}</span>
            </div>
            <div className="mt-5 space-y-3.5">
              {[{ label: l.thisOrder, v: d.prob, text: d.probText, color: TEAL }, { label: d.baselineLabel, v: d.baseline, text: d.baselineText, color: TEAL_LIGHT }].map((b) => (
                <div key={b.label}>
                  <div className="flex items-baseline justify-between text-xs"><span>{b.label}</span><b className="text-sm">{b.text}</b></div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-[2px]" style={{ background: TRACK_COLOR }}>
                    <div className="h-full" style={{ width: `${Math.min(100, b.v * 100)}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
            {d.outcome && (
              <p className="mt-5 border-t border-[#174538]/10 pt-3 text-sm text-[#355E3B]">
                {l.outcome}: <b className="text-[#174538]">{d.outcome}</b>
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* 2. Why that probability */}
      <Section title={l.factorsTitle} i={start + 1}>
        <div className={CARD}>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#355E3B]">
            <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: TEAL }} />{l.raises}</span>
            <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: TEAL_LIGHT }} />{l.lowers}</span>
          </div>
          <div className="mt-4 divide-y divide-[#174538]/10">
            {d.factors.map((x) => (
              <div key={x.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_4.5rem] items-center gap-4 py-2.5 text-sm">
                <span className={x.val === 0 ? "text-[#355E3B]" : ""}>{x.name}</span>
                <div className="relative h-3">
                  <div aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-[#174538]/30" />
                  {x.val !== 0 && (
                    <div className="absolute inset-y-0.5 rounded-[2px]"
                      style={{ background: x.val > 0 ? TEAL : TEAL_LIGHT, width: `${(Math.abs(x.val) / d.maxFactor) * 50}%`, ...(x.val > 0 ? { left: "50%" } : { right: "50%" }) }} />
                  )}
                </div>
                <span className={`text-right ${x.val === 0 ? "text-xs text-[#355E3B]" : "font-semibold"}`}>{x.text}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#355E3B]">{d.modelNote}</p>
        </div>
      </Section>

      {/* 3 and 4. How the score is built, and what it costs */}
      <div className="grid gap-5 @3xl:grid-cols-2">
        <Section title={l.scoreTitle} i={start + 2}>
          <div className={`${CARD} h-full`}>
            <div className="space-y-4">
              {d.parts.map((p) => (
                <div key={p.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{p.name}</span>
                    <span className="shrink-0 text-xs text-[#355E3B]">{p.weightText} {l.weight}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-[2px]" style={{ background: TRACK_COLOR }}>
                      <div className="h-full" style={{ width: `${Math.min(100, p.score)}%`, background: TEAL }} />
                    </div>
                    <span className="w-24 shrink-0 text-right text-sm"><b>{p.scoreText}</b> <span className="text-xs text-[#355E3B]">→ {p.contribText}</span></span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 flex items-baseline justify-between border-t border-[#174538]/10 pt-3 text-sm">
              <span className="text-[#355E3B]">{l.totalScore}</span>
              <b className="text-xl font-medium">{d.rvsText}</b>
            </p>
          </div>
        </Section>

        <Section title={l.costTitle} i={start + 3}>
          <div className={`${CARD} h-full`}>
            <div className="space-y-4">
              {[{ label: l.singleUse, v: d.cost.single, text: d.cost.singleText, color: TEAL_LIGHT }, { label: l.reusable, v: d.cost.reusable, text: d.cost.reusableText, color: TEAL }].map((b) => (
                <div key={b.label}>
                  <div className="flex items-baseline justify-between text-sm"><span>{b.label}</span><b className="text-base">{b.text}</b></div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-[2px]" style={{ background: TRACK_COLOR }}>
                    <div className="h-full" style={{ width: `${(b.v / d.cost.scale) * 100}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-[#174538]/10 pt-3 text-sm">{d.cost.summary}</p>
            <p className="mt-2 text-xs leading-relaxed text-[#355E3B]">{d.cost.note}</p>
          </div>
        </Section>
      </div>
    </div>
  );
}
