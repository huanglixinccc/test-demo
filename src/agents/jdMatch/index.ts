import type { AIProvider } from "../../ai/provider.js"
import type { BitableTables } from "../../feishu/bitable.js"
import { normalizeBitableFieldValue } from "../../feishu/bitableFields.js"
import { bus } from "../../events/bus.js"
import { logger } from "../../utils/logger.js"
import { scoreCandidateAgainstJd, type JdMatchResult } from "./score.js"

export interface JdMatchAgentDeps {
  ai: AIProvider
  bitable: BitableTables
}

const scoringInFlight = new Set<string>()

export function registerJdMatchAgent(deps: JdMatchAgentDeps): void {
  bus.on("CandidateCreated", async (payload) => {
    try {
      await runJdMatchForCandidate(deps, payload.candidateRecordId)
    } catch (err) {
      logger.error(
        { err, candidateRecordId: payload.candidateRecordId },
        "jdMatchAgent.handler_failed",
      )
    }
  })
}

export async function runJdMatchForCandidate(
  deps: JdMatchAgentDeps,
  candidateRecordId: string,
  opts?: { force?: boolean },
): Promise<JdMatchResult | null> {
  if (scoringInFlight.has(candidateRecordId)) {
    logger.info({ candidateRecordId }, "jdMatch.skip.in_flight")
    return null
  }

  scoringInFlight.add(candidateRecordId)
  try {
    const record = await deps.bitable.getCandidate(candidateRecordId)
    const fields = record.fields

    if (!opts?.force && fields.matchScore != null) {
      logger.info({ candidateRecordId }, "jdMatch.skip.already_scored")
      return null
    }

    const position = normalizeBitableFieldValue(fields.position)
    const jd = await deps.bitable.findJdByPosition(position)
    if (!jd) {
      logger.warn(
        { candidateRecordId, position },
        "jdMatch.skip.no_jd",
      )
      return null
    }

    const result = await scoreCandidateAgainstJd(deps.ai, fields, jd.fields)
    await deps.bitable.updateCandidate(candidateRecordId, {
      matchScore: result.score,
      priority: result.priority,
    })

    logger.info(
      {
        candidateRecordId,
        candidateId: fields.candidateId,
        position,
        jdPosition: jd.fields.position,
        score: result.score,
        priority: result.priority,
      },
      "jdMatch.scored",
    )

    return result
  } finally {
    scoringInFlight.delete(candidateRecordId)
  }
}
