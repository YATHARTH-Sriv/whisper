// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Common confession contract types for API consumers.
 *
 * @module
 */

import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { Contract as ConfessionContractBase } from '../../contract/src/managed/confession/contract/index.cjs';
import type { ConfessionPrivateState } from '../../contract/src/witnesses';

/**
 * Identifier used by the confession DApp to store private state entries.
 */
export const confessionPrivateStateKey = 'confessionPrivateState';

/**
 * Alias for the confession private state key literal type.
 */
export type ConfessionPrivateStateId = typeof confessionPrivateStateKey;

/**
 * The confession contract bound to its private state type.
 */
export type ConfessionContract = ConfessionContractBase<ConfessionPrivateState>;

/**
 * The keys of the impure circuits exposed by {@link ConfessionContract}.
 */
export type ConfessionCircuitKeys = Exclude<
  keyof ConfessionContract['impureCircuits'],
  number | symbol
>;

/**
 * Providers required for the confession contract to execute transactions.
 */
export type ConfessionProviders = MidnightProviders<
  ConfessionCircuitKeys,
  ConfessionPrivateStateId,
  ConfessionPrivateState
>;

/**
 * Represents a confession contract deployed on-chain.
 */
export type DeployedConfessionContract = FoundContract<ConfessionContract>;

/**
 * Derived state combining the public ledger data with the caller's private state.
 */
export type ConfessionBoardDerivedState = {
  /** Total number of confessions ever posted to the board. */
  readonly confessionCount: bigint;
  /** Identifier of the currently posted confession, if present. */
  readonly currentConfessionId: bigint | null;
  /** Indicates whether a confession is currently posted. */
  readonly hasConfession: boolean;
  /** Confession content if available. */
  readonly content: string | null;
  /** Timestamp (milliseconds since epoch) stored with the confession, if any. */
  readonly timestamp: bigint | null;
  /** Number of upvotes recorded on the current confession. */
  readonly upvotes: bigint;
  /** Number of downvotes recorded on the current confession. */
  readonly downvotes: bigint;
  /** Anonymous author identifier encoded as hex, if available. */
  readonly authorHex: string | null;
  /** True when the currently loaded private state belongs to the confession author. */
  readonly isAuthor: boolean;
};
