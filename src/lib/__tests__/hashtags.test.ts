import {
  extractHashtagNames,
  findHashtags,
  MAX_TAGS_PER_WORKSHOP,
  segmentDescription,
} from "../hashtags";

describe("extractHashtagNames — parity with backend", () => {
  test("empty input", () => {
    expect(extractHashtagNames("")).toEqual([]);
    expect(extractHashtagNames(null)).toEqual([]);
    expect(extractHashtagNames(undefined)).toEqual([]);
    expect(extractHashtagNames("nothing to see here")).toEqual([]);
  });

  test("preserves order of first occurrence", () => {
    expect(extractHashtagNames("learn #joga and #medytacja today")).toEqual([
      "joga",
      "medytacja",
    ]);
  });

  test("lowercases for normalization", () => {
    expect(extractHashtagNames("#Joga #JOGA #yoga")).toEqual(["joga", "yoga"]);
  });

  test("deduplicates within input", () => {
    expect(extractHashtagNames("#joga is great, #joga rules")).toEqual([
      "joga",
    ]);
  });

  test("caps at five tags", () => {
    const text = "#one #two #three #four #five #six #seven";
    expect(extractHashtagNames(text)).toEqual([
      "one",
      "two",
      "three",
      "four",
      "five",
    ]);
    expect(extractHashtagNames(text)).toHaveLength(MAX_TAGS_PER_WORKSHOP);
  });

  test("supports polish characters", () => {
    expect(extractHashtagNames("#poznań #łódź #medytacja")).toEqual([
      "poznań",
      "łódź",
      "medytacja",
    ]);
  });

  test("ignores short tags", () => {
    expect(extractHashtagNames("#a #ab #b")).toEqual(["ab"]);
  });

  test("ignores tags longer than max", () => {
    const tooLong = "a".repeat(31);
    expect(extractHashtagNames(`#${tooLong} #ok`)).toEqual(["ok"]);
  });

  test("adjacent hashtags only match first", () => {
    expect(extractHashtagNames("#joga#yoga")).toEqual(["joga"]);
  });

  test("ignores double hash prefix", () => {
    expect(extractHashtagNames("##joga")).toEqual(["joga"]);
  });

  test("underscore and digits allowed", () => {
    expect(extractHashtagNames("#yoga_2 #flow1")).toEqual(["yoga_2", "flow1"]);
  });

  test("hash inside word is not a tag", () => {
    expect(extractHashtagNames("foo#bar")).toEqual([]);
    expect(extractHashtagNames("email@example.com#anchor")).toEqual([]);
  });
});

describe("findHashtags", () => {
  test("returns start index and length for each match", () => {
    const matches = findHashtags("see #joga and #medytacja");
    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({ start: 4, length: 5, name: "joga" });
    expect(matches[1]).toEqual({ start: 14, length: 10, name: "medytacja" });
  });
});

describe("segmentDescription", () => {
  test("no hashtags → single text segment", () => {
    expect(segmentDescription("plain text")).toEqual([
      { type: "text", text: "plain text" },
    ]);
  });

  test("interleaves text and hashtag segments", () => {
    expect(segmentDescription("hi #joga bye")).toEqual([
      { type: "text", text: "hi " },
      { type: "hashtag", text: "#joga", name: "joga" },
      { type: "text", text: " bye" },
    ]);
  });

  test("tags beyond cap render as plain text", () => {
    const segs = segmentDescription("#a1 #b2 #c3 #d4 #e5 #f6");
    // first 5 are hashtags; the 6th (' #f6') remains as a single text tail.
    const hashtagSegs = segs.filter((s) => s.type === "hashtag");
    expect(hashtagSegs.map((s) => s.text)).toEqual([
      "#a1",
      "#b2",
      "#c3",
      "#d4",
      "#e5",
    ]);
    const tail = segs[segs.length - 1];
    expect(tail.type).toBe("text");
    expect(tail.text).toBe(" #f6");
  });
});
