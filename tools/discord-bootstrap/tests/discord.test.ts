/**
 * Contract tests for the discord.js adapter's pure helpers. The full
 * adapter needs a live Discord connection, so CI covers the channel-type
 * mapping — the entry point of the DISCORD-M0.1 announcement support
 * (a real GuildAnnouncement channel must reach the planner as the
 * "announcement" snapshot type, which `acceptedSnapshotTypes` accepts).
 */
import { describe, expect, it } from "vitest";
import { ChannelType } from "discord.js";
import { mapChannelType } from "../src/discord.js";

describe("mapChannelType — снапшот-типы реальных каналов Discord (DISCORD-M0.1)", () => {
  it("GuildAnnouncement маппится в announcement", () => {
    expect(mapChannelType(ChannelType.GuildAnnouncement)).toBe("announcement");
  });

  it("текстовые, форумные и категория маппятся в свои типы", () => {
    expect(mapChannelType(ChannelType.GuildText)).toBe("text");
    expect(mapChannelType(ChannelType.GuildForum)).toBe("forum");
    expect(mapChannelType(ChannelType.GuildCategory)).toBe("category");
    expect(mapChannelType(ChannelType.GuildVoice)).toBe("voice");
  });

  it("неизвестный тип канала маппится в other, а не падает", () => {
    expect(mapChannelType(ChannelType.GuildDirectory)).toBe("other");
  });
});
