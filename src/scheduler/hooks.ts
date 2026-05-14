import {useEffect, useState} from 'react';
import {analysisScheduler} from './analysisScheduler';

/**
 * Subscribe to scheduler change notifications. Returns an opaque tick value so
 * components re-render when the scheduler updates queue or inflight state.
 */
export function useSchedulerTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => analysisScheduler.subscribe(() => setTick((t) => t + 1)), []);
  return tick;
}
