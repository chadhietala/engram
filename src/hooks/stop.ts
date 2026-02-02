/**
 * Stop hook handler
 * Consolidates session memories and runs stage pipeline
 *
 * Uses background worker for heavy processing when available.
 */

import type { Database } from 'bun:sqlite';
import { consolidateSession } from '../memory/processing/consolidator.ts';
import { StagePipeline } from '../stages/index.ts';
import { DialecticEngine } from '../dialectic/index.ts';
import { SkillGenerator } from '../skill-generator/index.ts';
import { isWorkerRunning, queueStages, queueSkills } from '../worker/client.ts';
import type { StopInput, HookOutput } from '../types/hooks.ts';

export async function handleStop(
  db: Database,
  input: StopInput
): Promise<HookOutput> {
  const sessionId = input.session_id;

  // Consolidate working memories (always do this synchronously - it's fast)
  const consolidationResult = consolidateSession(db, sessionId);

  console.error(`[Engram] Consolidation: ${consolidationResult.workingPromoted.length} working→short, ${consolidationResult.shortTermPromoted.length} short→long, ${consolidationResult.decayedCount} decayed`);

  // Check if worker is available
  const workerAvailable = await isWorkerRunning();

  if (workerAvailable) {
    // Queue heavy processing to worker
    queueStages().catch(() => {});
    queueSkills().catch(() => {});
    console.error('[Engram] Queued stage/skill processing to worker');
    return { continue: true };
  }

  // Fallback: Synchronous processing
  const stagePipeline = new StagePipeline(db);

  try {
    const pipelineResult = await stagePipeline.processAll();

    if (pipelineResult.transitioned.length > 0) {
      console.error(`[Engram] Stage transitions: ${pipelineResult.transitioned.length}`);
    }

    if (pipelineResult.errors.length > 0) {
      console.error(`[Engram] Stage pipeline errors:`, pipelineResult.errors);
    }
  } catch (error) {
    console.error('[Engram] Stage pipeline error:', error);
  }

  // Check for skill candidates
  const dialecticEngine = new DialecticEngine(db);
  const skillCandidates = dialecticEngine.getSkillCandidates();

  if (skillCandidates.length > 0) {
    console.error(`[Engram] Skill candidates ready: ${skillCandidates.length}`);

    const skillGenerator = new SkillGenerator(db);

    try {
      const generationResult = await skillGenerator.generateAllPending();

      if (generationResult.generated.length > 0) {
        console.error(`[Engram] Skills generated: ${generationResult.generated.map((s) => s.name).join(', ')}`);
      }
    } catch (error) {
      console.error('[Engram] Skill generation error:', error);
    }
  }

  return { continue: true };
}
