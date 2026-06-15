import { describe, expect, it } from "vitest";
import { assertMutationTouchedRow } from "./mutation-result";

describe("assertMutationTouchedRow", () => {
  it("allows a mutation result that returns the touched row", () => {
    expect(() =>
      assertMutationTouchedRow(
        {
          data: { id: "row-1" },
          error: null,
        },
        "Client was not found.",
      ),
    ).not.toThrow();
  });

  it("throws a not-found message when a tenant-scoped mutation touches no row", () => {
    expect(() =>
      assertMutationTouchedRow(
        {
          data: null,
          error: null,
        },
        "Client was not found.",
      ),
    ).toThrow("Client was not found.");
  });

  it("throws a not-found message for empty mutation result arrays", () => {
    expect(() =>
      assertMutationTouchedRow(
        {
          data: [],
          error: null,
        },
        "Issue was not found.",
      ),
    ).toThrow("Issue was not found.");
  });

  it("throws the database error before the not-found fallback", () => {
    expect(() =>
      assertMutationTouchedRow(
        {
          data: null,
          error: { message: "duplicate key value violates unique constraint" },
        },
        "Workflow was not found.",
      ),
    ).toThrow("duplicate key value violates unique constraint");
  });
});
