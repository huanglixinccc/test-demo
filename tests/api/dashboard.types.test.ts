import { describe, it, expect } from "vitest"
import { parseDashboardQuery } from "../../src/api/dashboard/types.js"

describe("parseDashboardQuery", () => {
  it("parses filter params from query string object", () => {
    expect(
      parseDashboardQuery({
        position: "前端",
        startTime: "1718000000000",
        endTime: "1719000000000",
        search: "张",
      }),
    ).toEqual({
      position: "前端",
      startTime: 1718000000000,
      endTime: 1719000000000,
      search: "张",
    })
  })

  it("returns empty filters when params missing", () => {
    expect(parseDashboardQuery({})).toEqual({})
  })

  it("ignores invalid startTime", () => {
    expect(parseDashboardQuery({ startTime: "abc" })).toEqual({})
  })
})
