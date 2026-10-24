'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface EconomicMetrics {
  expected_energy_mwh: number;
  baseline_revenue_npr: number;
  realized_revenue_npr: number;
  revenue_at_risk_npr: number;
  avoided_wear_cost_npr: number;
  net_economic_benefit_npr: number;
  erosion_depth_mitigated_mm: number;
  outlook: 'favorable' | 'neutral' | 'adverse';
  confidence: number;
  top_drivers: string[];
}

export interface RevenueOutlookData {
  metrics: EconomicMetrics;
  executive_summary: string;
  illustrative_stance: 'accumulate_generation' | 'maintain_baseload' | 'preserve_capital_protect_equipment';
  disclaimer: string;
  generated_at: string;
  advisory: boolean;
}

interface RevenueOutlookCardProps {
  plantId: string;
  plantName: string;
  capacityMw: number;
  apiBase?: string;
}

function formatNPR(val: number): string {
  if (val >= 10000000) {
    return 'NPR ' + (val / 10000000).toFixed(2) + ' Cr';
  } else if (val >= 100000) {
    return 'NPR ' + (val / 100000).toFixed(2) + ' Lakhs';
  }
  return 'NPR ' + val.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function RevenueOutlookCard({
  plantId,
  plantName,
  capacityMw,
  apiBase = 'http://127.0.0.1:8000',
}: RevenueOutlookCardProps) {
  const [horizon, setHorizon] = useState<24 | 72 | 168>(24);
  const [tariff, setTariff] = useState<number>(5.84);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RevenueOutlookData | null>(null);

  const fetchOutlook = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBase + '/api/plants/' + plantId + '/revenue-outlook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horizon_hours: horizon,
          ppa_tariff_npr_kwh: tariff,
        }),
      });

      if (!res.ok) {
        throw new Error('API returned HTTP ' + res.status);
      }
      const json: RevenueOutlookData = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load revenue outlook');
    } finally {
      setLoading(false);
    }
  }, [apiBase, plantId, horizon, tariff]);

  useEffect(() => {
    fetchOutlook();
  }, [fetchOutlook]);

  const stanceLabels: Record<RevenueOutlookData['illustrative_stance'], { text: string; bg: string; color: string; border: string }> = {
    accumulate_generation: {
      text: '⚡ Maximize Generation (High Inflow)',
      bg: 'rgba(16, 185, 129, 0.12)',
      color: 'var(--color-green, #10B981)',
      border: 'rgba(16, 185, 129, 0.3)',
    },
    maintain_baseload: {
      text: '⚖️ Maintain Baseload Commitment',
      bg: 'rgba(59, 130, 246, 0.12)',
      color: '#60A5FA',
      border: 'rgba(59, 130, 246, 0.3)',
    },
    preserve_capital_protect_equipment: {
      text: '🛡️ Preserve Capital (Quartz Protection)',
      bg: 'rgba(239, 68, 68, 0.12)',
      color: 'var(--color-red, #EF4444)',
      border: 'rgba(239, 68, 68, 0.3)',
    },
  };

  const outlookColors: Record<EconomicMetrics['outlook'], { label: string; bg: string; color: string; border: string }> = {
    favorable: {
      label: 'FAVORABLE',
      bg: 'rgba(16, 185, 129, 0.15)',
      color: '#34D399',
      border: 'rgba(16, 185, 129, 0.4)',
    },
    neutral: {
      label: 'NEUTRAL',
      bg: 'rgba(99, 102, 241, 0.15)',
      color: '#818CF8',
      border: 'rgba(99, 102, 241, 0.4)',
    },
    adverse: {
      label: 'ADVERSE RISK',
      bg: 'rgba(239, 68, 68, 0.15)',
      color: '#F87171',
      border: 'rgba(239, 68, 68, 0.4)',
    },
  };

  return (
    <section
      style={{
        background: 'var(--color-surface, #151923)',
        border: '1px solid var(--color-border, #262D3D)',
        borderRadius: '8px',
        padding: 'var(--space-5, 20px)',
        marginBottom: 'var(--space-6, 24px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary, #F3F4F6)' }}>
              Energy Revenue Outlook Agent ({plantName || 'Plant'})
            </h3>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--color-accent, #F59E0B)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontWeight: 600,
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              SPRINT 5 INTELLIGENCE
            </span>
          </div>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: 'var(--color-text-secondary, #9CA3AF)',
            }}
          >
            Couples deterministic physics-informed hydrology with operational financial balance sheets. Strictly read-only & air-gapped.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono, monospace)',
              padding: '4px 8px',
              borderRadius: '4px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--color-green, #10B981)',
            }}
          >
            🔒 Air-Gapped Advisory (advisory=True)
          </span>
          <button
            onClick={fetchOutlook}
            disabled={loading}
            style={{
              background: 'var(--color-surface-raised, #1F2536)',
              border: '1px solid var(--color-border, #262D3D)',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              color: 'var(--color-text-primary, #F3F4F6)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Recomputing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--color-bg, #0B0E14)',
          padding: '12px 16px',
          borderRadius: '6px',
          border: '1px solid var(--color-border, #262D3D)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #9CA3AF)', fontWeight: 600 }}>
            Projection Horizon:
          </span>
          {([24, 72, 168] as const).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              style={{
                background: horizon === h ? 'var(--color-accent, #F59E0B)' : 'transparent',
                color: horizon === h ? '#111827' : 'var(--color-text-secondary, #9CA3AF)',
                border: '1px solid var(--color-border, #262D3D)',
                borderRadius: '4px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: horizon === h ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {h === 24 ? '24 Hours (Day Ahead)' : h === 72 ? '72 Hours (3 Days)' : '168 Hours (7 Days)'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px', maxWidth: '420px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #9CA3AF)', whiteSpace: 'nowrap' }}>
            PPA Tariff:
          </span>
          <input
            type="range"
            min="2.0"
            max="12.0"
            step="0.05"
            value={tariff}
            onChange={(e) => setTariff(parseFloat(e.target.value))}
            style={{
              flex: 1,
              accentColor: 'var(--color-accent, #F59E0B)',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              color: 'var(--color-accent, #F59E0B)',
              minWidth: '85px',
              textAlign: 'right',
            }}
          >
            NPR {tariff.toFixed(2)}/kWh
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '12px',
            color: 'var(--color-red, #EF4444)',
            fontSize: '12px',
            marginBottom: '16px',
          }}
        >
          ✕ Error loading revenue outlook: {error}
        </div>
      )}

      {data && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                background: 'var(--color-surface-raised, #1F2536)',
                border: '1px solid var(--color-border, #262D3D)',
                borderRadius: '6px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #9CA3AF)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Expected Energy
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-highlight, #38BDF8)', fontFamily: 'var(--font-mono, monospace)', marginTop: '4px' }}>
                {data.metrics.expected_energy_mwh.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span style={{ fontSize: '12px', fontWeight: 400 }}>MWh</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim, #6B7280)', marginTop: '2px' }}>
                Capacity factor ~{((data.metrics.expected_energy_mwh / (capacityMw * horizon)) * 100).toFixed(0)}%
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-surface-raised, #1F2536)',
                border: '1px solid var(--color-border, #262D3D)',
                borderRadius: '6px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #9CA3AF)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Realized Revenue
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-green, #10B981)', fontFamily: 'var(--font-mono, monospace)', marginTop: '4px' }}>
                {formatNPR(data.metrics.realized_revenue_npr)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim, #6B7280)', marginTop: '2px' }}>
                @ NPR {tariff.toFixed(2)} / kWh
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-surface-raised, #1F2536)',
                border: '1px solid var(--color-border, #262D3D)',
                borderRadius: '6px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #9CA3AF)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Revenue At Risk (Curtailment)
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: data.metrics.revenue_at_risk_npr > 0 ? 'var(--color-accent, #F59E0B)' : 'var(--color-text-secondary, #9CA3AF)',
                  fontFamily: 'var(--font-mono, monospace)',
                  marginTop: '4px',
                }}
              >
                {formatNPR(data.metrics.revenue_at_risk_npr)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim, #6B7280)', marginTop: '2px' }}>
                {data.metrics.revenue_at_risk_npr > 0 ? 'Forfeited spot generation' : 'Zero curtailment needed'}
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-surface-raised, #1F2536)',
                border: '1px solid var(--color-border, #262D3D)',
                borderRadius: '6px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #9CA3AF)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Avoided Wear Savings
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono, monospace)', marginTop: '4px' }}>
                {formatNPR(data.metrics.avoided_wear_cost_npr)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim, #6B7280)', marginTop: '2px' }}>
                Saved {data.metrics.erosion_depth_mitigated_mm.toFixed(4)} mm abrasion
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-surface-raised, #1F2536)',
                border: '1px solid var(--color-border, #262D3D)',
                borderRadius: '6px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #9CA3AF)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Net Economic Benefit
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: data.metrics.net_economic_benefit_npr >= 0 ? '#10B981' : '#EF4444',
                  fontFamily: 'var(--font-mono, monospace)',
                  marginTop: '4px',
                }}
              >
                {data.metrics.net_economic_benefit_npr >= 0 ? '+' : ''}
                {formatNPR(data.metrics.net_economic_benefit_npr)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim, #6B7280)', marginTop: '2px' }}>
                Wear savings − revenue loss
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'var(--color-surface-raised, #1F2536)',
              border: '1px solid var(--color-border, #262D3D)',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #9CA3AF)' }}>Outlook Rating:</span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  background: outlookColors[data.metrics.outlook].bg,
                  color: outlookColors[data.metrics.outlook].color,
                  border: '1px solid ' + outlookColors[data.metrics.outlook].border,
                }}
              >
                {outlookColors[data.metrics.outlook].label}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-dim, #6B7280)' }}>Confidence:</span>
                <div
                  style={{
                    width: '80px',
                    height: '8px',
                    background: 'var(--color-bg, #0B0E14)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border, #262D3D)',
                  }}
                >
                  <div
                    style={{
                      width: (data.metrics.confidence * 100).toFixed(0) + '%',
                      height: '100%',
                      background: 'var(--color-highlight, #38BDF8)',
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-secondary, #9CA3AF)' }}>
                  {(data.metrics.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #9CA3AF)' }}>Advisory Stance:</span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: stanceLabels[data.illustrative_stance].bg,
                  color: stanceLabels[data.illustrative_stance].color,
                  border: '1px solid ' + stanceLabels[data.illustrative_stance].border,
                }}
              >
                {stanceLabels[data.illustrative_stance].text}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '14px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                background: 'var(--color-bg, #0B0E14)',
                border: '1px solid var(--color-border, #262D3D)',
                borderRadius: '6px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px' }}>🎯</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary, #F3F4F6)' }}>
                  Top Deterministic Economic Drivers
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--color-text-secondary, #9CA3AF)', lineHeight: 1.6 }}>
                {data.metrics.top_drivers.map((driver, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    {driver}
                  </li>
                ))}
              </ul>
            </div>

            <div
              style={{
                background: 'var(--color-bg, #0B0E14)',
                border: '1px solid var(--color-border, #262D3D)',
                borderRadius: '6px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>🧠</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-accent, #F59E0B)' }}>
                      Executive Economic Narrative (Ollama Qwen 2.5)
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-dim, #6B7280)', fontFamily: 'var(--font-mono, monospace)', cursor: 'default' }}>
                    Pure Explainer Mode
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'var(--color-text-primary, #F3F4F6)',
                    lineHeight: 1.6,
                    fontStyle: 'normal',
                  }}
                >
                  &ldquo;{data.executive_summary}&rdquo;
                </p>
              </div>

              <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--color-text-dim, #6B7280)', textAlign: 'right' }}>
                Generated at: {new Date(data.generated_at).toLocaleTimeString()} UTC
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '14px' }}>⚠️</span>
            <div style={{ fontSize: '10px', color: '#FBBF24', lineHeight: 1.5, letterSpacing: '0.2px' }}>
              <strong>STATUTORY DISCLAIMER:</strong> {data.disclaimer}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
