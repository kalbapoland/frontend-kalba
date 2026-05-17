import {
  applySuggestion,
  detectActiveHashtag,
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

describe("detectActiveHashtag", () => {
  test("cursor at end of `#jo` returns prefix `jo`", () => {
    expect(detectActiveHashtag("hi #jo", 6)).toEqual({
      start: 3,
      end: 6,
      prefix: "jo",
    });
  });

  test("cursor right after `#` returns empty prefix (the user just typed #)", () => {
    expect(detectActiveHashtag("hi #", 4)).toEqual({
      start: 3,
      end: 4,
      prefix: "",
    });
  });

  test("cursor in the middle of a tag returns up-to-cursor prefix", () => {
    expect(detectActiveHashtag("hi #joga", 6)).toEqual({
      start: 3,
      end: 6,
      prefix: "jo",
    });
  });

  test("cursor after whitespace returns null", () => {
    expect(detectActiveHashtag("hi #jo ", 7)).toBeNull();
  });

  test("hashtag preceded by word char (mid-word) returns null", () => {
    expect(detectActiveHashtag("foo#bar", 7)).toBeNull();
  });

  test("no hashtag in scope returns null", () => {
    expect(detectActiveHashtag("plain text", 5)).toBeNull();
  });

  test("hashtag at start of string", () => {
    expect(detectActiveHashtag("#joga", 5)).toEqual({
      start: 0,
      end: 5,
      prefix: "joga",
    });
  });

  test("supports polish chars in the prefix", () => {
    expect(detectActiveHashtag("opis #poznań", 12)).toEqual({
      start: 5,
      end: 12,
      prefix: "poznań",
    });
  });
});

describe("applySuggestion", () => {
  test("replaces partial hashtag with full tag + trailing space", () => {
    const text = "Let's do #jo today";
    const active = detectActiveHashtag(text, 12)!;
    expect(active.prefix).toBe("jo");

    const result = applySuggestion(text, active, "joga");
    expect(result.text).toBe("Let's do #joga  today");
    expect(result.cursor).toBe(15);
  });

  test("inserts at end of string", () => {
    const text = "topic #me";
    const active = detectActiveHashtag(text, text.length)!;
    const result = applySuggestion(text, active, "medytacja");
    expect(result.text).toBe("topic #medytacja ");
    expect(result.cursor).toBe(17);
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
