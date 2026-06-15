type MutationResult = {
  data?: unknown;
  error?: { message?: string } | null;
};

export function assertMutationTouchedRow(result: MutationResult, notFoundMessage: string) {
  if (result.error) {
    throw new Error(result.error.message ?? "Mutation could not be saved.");
  }

  if (result.data == null) {
    throw new Error(notFoundMessage);
  }

  if (Array.isArray(result.data) && result.data.length === 0) {
    throw new Error(notFoundMessage);
  }
}
