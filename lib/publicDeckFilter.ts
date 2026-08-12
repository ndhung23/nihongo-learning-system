export function publicDeckFilter() {
  return {
    visibility: "public",
    $and: [
      {
        $or: [
          { status: "published" },
          { sourceType: "user", tags: "personal", accessMode: "public" },
        ],
      },
    ],
  };
}
