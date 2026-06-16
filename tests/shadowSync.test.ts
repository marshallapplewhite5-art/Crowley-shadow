import { identifyShadowTrait, isCrisis, CRISIS_KEYWORDS } from "../src/shadowLogic";
import { ShadowStorage } from "../src/storage";
import fs from "fs/promises";
import path from "path";

describe("ShadowSync Logic", () => {
  it("identifies shadow traits correctly", () => {
    expect(identifyShadowTrait("Controlling")?.reclaimedTrait).toBe("Disowned Power / Leadership");
    expect(identifyShadowTrait("Fake")?.reclaimedTrait).toBe("Disowned Authenticity / Persona Fear");
    expect(identifyShadowTrait("Unknown")).toBeUndefined();
  });

  it("detects crisis keywords", () => {
    expect(isCrisis("I want to commit suicide")).toBe(true);
    expect(isCrisis("I am feeling happy today")).toBe(false);
    expect(isCrisis("Self-harm is a serious issue")).toBe(true);
  });
});

describe("ShadowStorage", () => {
  const testFile = path.join(process.cwd(), "shadow_data.json");

  beforeEach(async () => {
    try {
      await fs.unlink(testFile);
    } catch (e) {}
    await ShadowStorage.load();
  });

  afterAll(async () => {
    try {
      await fs.unlink(testFile);
    } catch (e) {}
  });

  it("tracks patterns and increments counts", async () => {
    const userId = "user123";
    const count1 = await ShadowStorage.trackPattern(userId, "Controlling");
    expect(count1).toBe(1);

    const count2 = await ShadowStorage.trackPattern(userId, "Controlling");
    expect(count2).toBe(2);

    const data = ShadowStorage.getUserData(userId);
    expect(data.patterns.get("Controlling")).toBe(2);
  });

  it("updates user data", async () => {
    const userId = "user456";
    await ShadowStorage.updateUserData(userId, { isPro: true, currentProtocolStep: "SCAN" });

    const data = ShadowStorage.getUserData(userId);
    expect(data.isPro).toBe(true);
    expect(data.currentProtocolStep).toBe("SCAN");
  });
});
