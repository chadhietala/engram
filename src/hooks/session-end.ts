/**
 * SessionEnd hook handler
 * Final archival, decay factors, and skill generation
 *
 * Flushes background worker to ensure all processing completes.
 */

import type { Database } from 'bun:sqlite';
import { endSession, markConsolidated } from '../db/queries/sessions.ts';
import { applyMemoryDecay, getConsolidationStats } from '../memory/processing/consolidator.ts';
import { SkillGenerator } from '../skill-generator/index.ts';
import { DialecticEngine } from '../dialectic/index.ts';
import { StagePipeline } from '../stages/index.ts';
import { isWorkerRunning, flushWorker, getWorkerStatus } from '../worker/client.ts';
import type { SessionEndInput, HookOutput } from '../types/hooks.ts';

export async function handleSessionEnd(
  db: Database,
  input: SessionEndInput
): Promise<HookOutput> {
  const sessionId = input.session_id;

  // End the session
  endSession(db, sessionId);

  // Apply final decay to short-term memories
  const decayedCount = applyMemoryDecay(db);
  console.error(`[Engram] Final decay applied: ${decayedCount} memories affected`);

  // Check if worker is running and flush any pending work
  const workerAvailable = await isWorkerRunning();

  if (workerAvailable) {
    console.error('[Engram] Flushing worker queue...');
    const flushed = await flushWorker();
    if (flushed) {
      const status = await getWorkerStatus();
      console.error(`[Engram] Worker flushed. Processed: ${status?.stats.processed ?? 0}`);
    }
  }

  // Final stage pipeline run (always run synchronously at session end)
  const stagePipeline = new StagePipeline(db);

  try {
    const pipelineResult = await stagePipeline.processAll();

    if (pipelineResult.transitioned.length > 0) {
      console.error(`[Engram] Final stage transitions: ${pipelineResult.transitioned.length}`);

      for (const transition of pipelineResult.transitioned) {
        console.error(`  - ${transition.previousStage} → ${transition.newStage}: ${transition.reason}`);
      }
    }
  } catch (error) {
    console.error('[Engram] Final stage pipeline error:', error);
  }

  // Generate any pending skills
  const skillGenerator = new SkillGenerator(db);

  try {
    const generationResult = await skillGenerator.generateAllPending();

    if (generationResult.generated.length > 0) {
      console.error(`[Engram] Skills generated at session end:`);
      for (const skill of generationResult.generated) {
        console.error(`  - ${skill.name} (${skill.complexity})`);
      }
    }

    if (generationResult.failed.length > 0) {
      console.error(`[Engram] Failed to generate skills for ${generationResult.failed.length} candidates`);
    }
  } catch (error) {
    console.error('[Engram] Skill generation error:', error);
  }

  // Mark session as consolidated
  markConsolidated(db, sessionId);

  // Log final statistics
  const memoryStats = getConsolidationStats(db);
  const dialecticEngine = new DialecticEngine(db);
  const dialecticStats = dialecticEngine.getStats();
  const skillStats = skillGenerator.getStats();
  const stageStats = stagePipeline.getStageStats();

  console.error(`[Engram] Session ${sessionId} ended. Statistics:`);
  console.error(`  Memories: ${memoryStats.total} (W:${memoryStats.working} ST:${memoryStats.shortTerm} LT:${memoryStats.longTerm} C:${memoryStats.collective})`);
  console.error(`  Stages: conceptual=${stageStats.conceptual.total}, semantic=${stageStats.semantic.total}, syntactic=${stageStats.syntactic.total}`);
  console.error(`  Patterns: ${dialecticStats.totalPatterns}, Active theses: ${dialecticStats.activeTheses}`);
  console.error(`  Skills: ${skillStats.totalSkills} total, ${skillStats.pendingCandidates} pending`);

  return { continue: true };
}
