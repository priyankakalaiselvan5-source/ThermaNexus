'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTruckSimulation } from '@/hooks/use-truck-simulation';
import {
  RecommendationEngine, truckToTelemetry, createDecisionHistoryEntry,
  type Recommendation, type DecisionHistoryEntry,
} from '@/lib/recommendation-engine';
import type { TruckState } from '@/lib/map-data';

export interface TimelineEvent {
  id: string;
  shipmentId: string;
  message: string;
  timestamp: number;
}

export function useRecommendationEngine(evalIntervalMs = 4000) {
  const { trucks, isRunning, toggleRunning, resetTrucks } = useTruckSimulation(2000);

  const [recommendations, setRecommendations] = useState<Record<string, Recommendation>>({});
  const [decisionHistory, setDecisionHistory] = useState<DecisionHistoryEntry[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [updatedTrucks, setUpdatedTrucks] = useState<TruckState[]>([]);

  const engineRef = useRef(new RecommendationEngine());
  const prevRecsRef = useRef<Record<string, Recommendation>>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setUpdatedTrucks(trucks);
  }, [trucks]);

  useEffect(() => {
    async function loadHistory() {
      const { data } = await supabase
        .from('ai_decision_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data && mountedRef.current) {
        setDecisionHistory(data.map((row: any) => ({
          id: row.id,
          recommendationId: row.recommendation_id,
          shipmentId: row.shipment_id,
          shipmentNumber: row.shipment_number,
          prediction: row.prediction,
          riskDetected: row.risk_detected,
          recommendationGenerated: row.recommendation_generated,
          operatorAction: row.operator_action,
          finalOutcome: row.final_outcome,
          confidenceScore: row.confidence_score,
          timestamp: new Date(row.created_at).getTime(),
        })));
      }
    }
    loadHistory();
  }, []);

  useEffect(() => {
    if (!isRunning || trucks.length === 0) return;
    const interval = setInterval(() => {
      if (!mountedRef.current || trucks.length === 0) return;
      const engine = engineRef.current;
      const newRecs: Record<string, Recommendation> = {};
      let changed = false;

      for (const truck of trucks) {
        const input = truckToTelemetry(truck);
        const rec = engine.evaluate(input);
        const prev = prevRecsRef.current[truck.id];
        if (engine.shouldGenerateRecommendation(prev, rec)) {
          newRecs[truck.id] = rec;
          changed = true;
        } else if (prev) {
          newRecs[truck.id] = prev;
        }
      }

      if (changed && mountedRef.current) {
        setRecommendations(newRecs);
        prevRecsRef.current = newRecs;
      }
    }, evalIntervalMs);
    return () => clearInterval(interval);
  }, [isRunning, trucks, evalIntervalMs]);

  const acceptRecommendation = useCallback((recId: string) => {
    setRecommendations(prev => {
      const rec = prev[recId];
      if (!rec) return prev;
      const accepted: Recommendation = {
        ...rec,
        status: 'accepted',
        acceptedAt: Date.now(),
      };

      const historyEntry = createDecisionHistoryEntry(accepted, 'accepted');
      setDecisionHistory(h => [historyEntry, ...h].slice(0, 100));

      const timelineEvent: TimelineEvent = {
        id: `TL-${Date.now()}`,
        shipmentId: rec.shipmentId,
        message: `AI Recommendation Accepted: ${rec.recommendedAction}`,
        timestamp: Date.now(),
      };
      setTimelineEvents(t => [timelineEvent, ...t].slice(0, 50));

      setUpdatedTrucks(prevTrucks =>
        prevTrucks.map(t =>
          t.id === rec.shipmentId
            ? {
                ...t,
                rerouted: rec.actionType === 'immediate_reroute' || rec.actionType === 'stop_cold_storage' || rec.actionType === 'prepare_alt_route',
                acceptedAction: rec.actionType,
              }
            : t
        )
      );

      (async () => {
        await supabase.from('ai_decision_history').insert({
          recommendation_id: historyEntry.recommendationId,
          shipment_id: historyEntry.shipmentId,
          shipment_number: historyEntry.shipmentNumber,
          prediction: historyEntry.prediction,
          risk_detected: historyEntry.riskDetected,
          recommendation_generated: historyEntry.recommendationGenerated,
          operator_action: 'accepted',
          final_outcome: historyEntry.finalOutcome,
          confidence_score: historyEntry.confidenceScore,
        });
      })();

      return { ...prev, [recId]: accepted };
    });
  }, []);

  const ignoreRecommendation = useCallback((recId: string) => {
    setRecommendations(prev => {
      const rec = prev[recId];
      if (!rec) return prev;
      const ignored: Recommendation = {
        ...rec,
        status: 'ignored',
      };

      const historyEntry = createDecisionHistoryEntry(ignored, 'ignored');
      setDecisionHistory(h => [historyEntry, ...h].slice(0, 100));

      (async () => {
        await supabase.from('ai_decision_history').insert({
          recommendation_id: historyEntry.recommendationId,
          shipment_id: historyEntry.shipmentId,
          shipment_number: historyEntry.shipmentNumber,
          prediction: historyEntry.prediction,
          risk_detected: historyEntry.riskDetected,
          recommendation_generated: historyEntry.recommendationGenerated,
          operator_action: 'ignored',
          final_outcome: historyEntry.finalOutcome,
          confidence_score: historyEntry.confidenceScore,
        });
      })();

      return { ...prev, [recId]: ignored };
    });
  }, []);

  const completeRecommendation = useCallback((recId: string) => {
    setRecommendations(prev => {
      const rec = prev[recId];
      if (!rec) return prev;
      const completed: Recommendation = {
        ...rec,
        status: 'completed',
        completedAt: Date.now(),
      };
      return { ...prev, [recId]: completed };
    });
  }, []);

  const recommendationList = Object.values(recommendations).sort((a, b) => {
    const tierOrder = { critical: 0, warning: 1, safe: 2 };
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierDiff !== 0) return tierDiff;
    return b.timestamp - a.timestamp;
  });

  const pendingCount = recommendationList.filter(r => r.status === 'pending').length;
  const criticalCount = recommendationList.filter(r => r.tier === 'critical' && r.status === 'pending').length;

  return {
    trucks: updatedTrucks,
    isRunning,
    toggleRunning,
    resetTrucks,
    recommendations: recommendationList,
    recommendationsById: recommendations,
    decisionHistory,
    timelineEvents,
    pendingCount,
    criticalCount,
    acceptRecommendation,
    ignoreRecommendation,
    completeRecommendation,
  };
}
