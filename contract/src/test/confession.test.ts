import { ConfessionSimulator } from "./confession-simulator.js";
import {
  NetworkId,
  setNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";

setNetworkId(NetworkId.Undeployed);

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

describe("Confession smart contract", () => {
  it("initializes with empty confession board", () => {
    const key = randomBytes(32);
    const simulator = new ConfessionSimulator(key);
    const confession = simulator.getCurrentConfession();
    
    expect(simulator.getConfessionCount()).toEqual(0n);
    expect(confession.hasConfession).toEqual(false);
    expect(confession.upvotes).toEqual(0n);
    expect(confession.downvotes).toEqual(0n);
  });

  it("allows users to post confessions anonymously", () => {
    const simulator = new ConfessionSimulator(randomBytes(32));
    const confessionText = "I secretly love pineapple on pizza";
    
    simulator.postConfession(confessionText);
    
    const confession = simulator.getCurrentConfession();
    expect(confession.hasConfession).toEqual(true);
    expect(confession.content).toEqual(confessionText);
    expect(confession.upvotes).toEqual(0n);
    expect(confession.downvotes).toEqual(0n);
  expect(simulator.getConfessionCount()).toEqual(1n);
  });

  it("prevents posting when board already has confession", () => {
    const simulator = new ConfessionSimulator(randomBytes(32));
    
    simulator.postConfession("First confession");
    
    expect(() => simulator.postConfession("Second confession"))
      .toThrow("Board already has a confession");
  });

  it("allows users to upvote confessions", () => {
    const simulator = new ConfessionSimulator(randomBytes(32));
    
    simulator.postConfession("Vote for me!");
    simulator.vote(true); // upvote
    
    const confession = simulator.getCurrentConfession();
    expect(confession.upvotes).toEqual(1n);
    expect(confession.downvotes).toEqual(0n);
  });

  it("allows users to downvote confessions", () => {
    const simulator = new ConfessionSimulator(randomBytes(32));
    
    simulator.postConfession("Controversial opinion");
    simulator.vote(false); // downvote
    
    const confession = simulator.getCurrentConfession();
    expect(confession.upvotes).toEqual(0n);
    expect(confession.downvotes).toEqual(1n);
  });

  it("allows multiple users to vote on the same confession", () => {
    const simulator = new ConfessionSimulator(randomBytes(32));
    
    simulator.postConfession("Popular confession");
    
    // User 1 upvotes
    simulator.vote(true);
    
    // User 2 also upvotes
    simulator.switchUser(randomBytes(32));
    simulator.vote(true);
    
    // User 3 downvotes
    simulator.switchUser(randomBytes(32));
    simulator.vote(false);
    
    const confession = simulator.getCurrentConfession();
    expect(confession.upvotes).toEqual(2n);
    expect(confession.downvotes).toEqual(1n);
  });

  it("prevents voting when no confession exists", () => {
    const simulator = new ConfessionSimulator(randomBytes(32));
    
    expect(() => simulator.vote(true)).toThrow("No confession to vote on");
  });

  it("generates anonymous author IDs", () => {
    const simulator = new ConfessionSimulator(randomBytes(32));
    
    simulator.postConfession("Test confession");
    
    const confession = simulator.getCurrentConfession();
    expect(confession.author.length).toEqual(32);
    
    // Author ID should be deterministic for same user/action
    // but we can't easily test that without exposing internals
  });
});
