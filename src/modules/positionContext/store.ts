import fs from "node:fs"
import path from "node:path"
import type { WorkspacePosition } from "./types.js"
import { findMockPosition } from "./mockPositions.js"

const STORE_FILE = path.join(process.cwd(), "data", "position-context.json")

export class PositionContextStore {
  private readonly selections = new Map<string, string>()

  constructor(private readonly persist = process.env.NODE_ENV !== "test") {
    if (this.persist) this.load()
  }

  getCurrentPositionId(openId: string): string | null {
    return this.selections.get(openId) ?? null
  }

  getCurrentPosition(openId: string): WorkspacePosition | null {
    const id = this.getCurrentPositionId(openId)
    if (!id) return null
    return findMockPosition(id) ?? null
  }

  setCurrentPosition(openId: string, positionId: string): WorkspacePosition | null {
    const position = findMockPosition(positionId)
    if (!position) return null
    this.selections.set(openId, positionId)
    if (this.persist) this.save()
    return position
  }

  clearForTesting(): void {
    this.selections.clear()
  }

  private load(): void {
    try {
      const raw = fs.readFileSync(STORE_FILE, "utf8")
      const parsed = JSON.parse(raw) as Record<string, string>
      for (const [openId, positionId] of Object.entries(parsed)) {
        this.selections.set(openId, positionId)
      }
    } catch {
      // no persisted state yet
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true })
    fs.writeFileSync(
      STORE_FILE,
      JSON.stringify(Object.fromEntries(this.selections.entries()), null, 2),
      "utf8",
    )
  }
}

export const positionContextStore = new PositionContextStore()
