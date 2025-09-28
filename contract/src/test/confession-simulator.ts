// This file is part of the anonymous confession DApp
// SPDX-License-Identifier: Apache-2.0

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  constructorContext,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../managed/confession/contract/index.cjs";
import { type ConfessionPrivateState, witnesses } from "../witnesses.js";

/**
 * Simulator for testing the confession contract locally
 */
export class ConfessionSimulator {
  readonly contract: Contract<ConfessionPrivateState>;
  circuitContext: CircuitContext<ConfessionPrivateState>;

  constructor(secretKey: Uint8Array) {
    this.contract = new Contract<ConfessionPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      constructorContext({ secretKey }, "0".repeat(64)),
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      originalState: currentContractState,
      transactionContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  /**
   * Switch to a different user for multi-user testing
   */
  public switchUser(secretKey: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      secretKey,
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.transactionContext.state);
  }

  public getPrivateState(): ConfessionPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  /**
   * Post a new anonymous confession
   */
  public postConfession(content: string): Ledger {
    const timestamp = BigInt(Date.now());
    this.circuitContext = this.contract.impureCircuits.postConfession(
      this.circuitContext,
      content,
      timestamp,
    ).context;
    return ledger(this.circuitContext.transactionContext.state);
  }

  /**
   * Vote on the current confession (true = upvote, false = downvote)
   */
  public vote(isUpvote: boolean): Ledger {
    const voteValue = isUpvote ? 1n : 0n;
    this.circuitContext = this.contract.impureCircuits.vote(
      this.circuitContext,
      voteValue,
    ).context;
    return ledger(this.circuitContext.transactionContext.state);
  }

  /**
   * Get the current confession
   */
  public getCurrentConfession() {
    const ledger = this.getLedger();
    return {
      content: ledger.confession0.value,
      hasConfession: ledger.confession0.is_some,
      upvotes: ledger.confession0Upvotes,
      downvotes: ledger.confession0Downvotes,
      author: ledger.confession0Author,
      timestamp: ledger.confession0Timestamp
    };
  }

  /**
   * Get total number of confessions posted
   */
  public getConfessionCount(): bigint {
    return this.getLedger().confessionCount;
  }
}