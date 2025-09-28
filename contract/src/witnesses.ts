// This file is part of the anonymous confession DApp
// SPDX-License-Identifier: Apache-2.0

import { Ledger } from "./managed/confession/contract/index.cjs";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

/**
 * Private state for confession DApp
 * Contains user's secret identity and local data
 */
export type ConfessionPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createConfessionPrivateState = (secretKey: Uint8Array) => ({
  secretKey,
});

/**
 * Witness functions that provide access to private data
 * These are called from circuits but implementations stay private
 */
export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, ConfessionPrivateState>): [
    ConfessionPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};