import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildQuickAddUri, extractChoices, normalizeVariableName } from "../src/quickadd-core";

describe("extractChoices", () => {
  it("reads top-level choices, filters disabled choices, and sorts by name", () => {
    const choices = extractChoices({
      choices: [
        { name: "Beta", type: "Macro" },
        { name: "Alpha", choiceType: "Template" },
        { name: "Hidden", enabled: false },
      ],
    });

    assert.deepEqual(
      choices.map((choice) => choice.name),
      ["Alpha", "Beta"],
    );
    assert.equal(choices[0].type, "Template");
  });

  it("reads settings choices", () => {
    const choices = extractChoices({
      settings: {
        choices: [{ name: "Capture", formatType: "Capture" }],
      },
    });

    assert.equal(choices.length, 1);
    assert.equal(choices[0].name, "Capture");
    assert.equal(choices[0].type, "Capture");
  });

  it("reads nested choices and keeps group names", () => {
    const choices = extractChoices({
      choices: [
        {
          name: "Inbox",
          choices: [{ name: "Task" }],
          children: [{ name: "Journal" }],
          items: [{ name: "Idea" }],
        },
      ],
    });

    const grouped = choices.filter((choice) => choice.group === "Inbox").map((choice) => choice.name);
    assert.deepEqual(grouped.sort(), ["Idea", "Journal", "Task"]);
  });

  it("deduplicates by name", () => {
    const choices = extractChoices({
      choices: [{ name: "Task" }, { name: "Task" }],
    });

    assert.equal(choices.length, 1);
  });
});

describe("buildQuickAddUri", () => {
  it("builds encoded Obsidian QuickAdd URIs", () => {
    const uri = buildQuickAddUri({
      vaultName: "Daily Notes",
      choiceName: "闪念",
      variableName: "value",
      value: "hello world",
    });

    assert.equal(uri, "obsidian://quickadd?vault=Daily%20Notes&choice=%E9%97%AA%E5%BF%B5&value-value=hello%20world");
  });

  it("normalizes empty variable names", () => {
    assert.equal(normalizeVariableName(""), "value");
    assert.equal(normalizeVariableName(" title "), "title");
  });
});
