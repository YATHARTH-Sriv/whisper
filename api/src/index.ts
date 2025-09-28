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
 * High-level API for interacting with the confession contract.
 *
 * @packageDocumentation
 */

import contractModule from '../../contract/src/managed/confession/contract/index.cjs';
const { Contract, ledger, pureCircuits } = contractModule;

import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import {
  deployContract,
  findDeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import type { Logger } from 'pino';
import { combineLatest, from, map, tap, type Observable } from 'rxjs';

import {
  type ConfessionProviders,
  type ConfessionContract,
  type DeployedConfessionContract,
  type ConfessionBoardDerivedState,
  confessionPrivateStateKey,
} from './common-types.js';
import {
  type ConfessionPrivateState,
  createConfessionPrivateState,
  witnesses,
} from '../../contract/src/witnesses';
import * as utils from './utils/index.js';

const confessionContractInstance: ConfessionContract = new Contract(witnesses);

/**
 * Public surface area returned when a confession contract has been deployed or joined.
 */
export interface DeployedConfessionAPI {
  /**
   * The address of the deployed confession contract.
   */
  readonly deployedContractAddress: ContractAddress;
  /**
   * Observable stream reflecting combined ledger and private state information.
   */
  readonly state$: Observable<ConfessionBoardDerivedState>;

  /** Post a new confession to the board. */
  postConfession: (content: string, timestamp?: bigint) => Promise<void>;
  /** Submit an upvote transaction for the active confession. */
  upvote: () => Promise<void>;
  /** Submit a downvote transaction for the active confession. */
  downvote: () => Promise<void>;
  /** Submit a vote explicitly choosing the direction. */
  vote: (isUpvote: boolean) => Promise<void>;
}

/**
 * High level helper that adapts a deployed confession contract to an ergonomic interface.
 */
export class ConfessionAPI implements DeployedConfessionAPI {
  private constructor(
    public readonly deployedContract: DeployedConfessionContract,
    private readonly providers: ConfessionProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress =
      deployedContract.deployTxData.public.contractAddress;

    this.state$ = combineLatest([
      // Public (ledger) state updates
      providers.publicDataProvider
        .contractStateObservable(this.deployedContractAddress, {
          type: 'latest',
        })
        .pipe(
          map((contractState) => ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                confessionCount: ledgerState.confessionCount,
                confessionExists: ledgerState.confession0.is_some,
                confession: ledgerState.confession0.value,
                author: toHex(ledgerState.confession0Author),
                upvotes: ledgerState.confession0Upvotes,
                downvotes: ledgerState.confession0Downvotes,
                timestamp: ledgerState.confession0Timestamp,
              },
            }),
          ),
        ),
      // Private state (static for current user)
      from(ConfessionAPI.resolvePrivateState(providers)),
    ]).pipe(
      map(([ledgerState, privateState]) =>
        ConfessionAPI.toDerivedState(ledgerState, privateState),
      ),
    );
  }

  /** Address of the currently managed contract instance. */
  readonly deployedContractAddress: ContractAddress;

  /** Combined ledger/private state observable. */
  readonly state$: Observable<ConfessionBoardDerivedState>;

  /**
   * Deploy a fresh confession contract and wrap it in a {@link ConfessionAPI}.
   */
  static async deploy(
    providers: ConfessionProviders,
    logger?: Logger,
  ): Promise<ConfessionAPI> {
    logger?.info('deployConfessionContract');

    const deployedContract = await deployContract<
      typeof confessionContractInstance
    >(providers, {
      privateStateId: confessionPrivateStateKey,
      contract: confessionContractInstance,
      initialPrivateState: await ConfessionAPI.resolvePrivateState(providers),
    });

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedContract.deployTxData.public,
      },
    });

    return new ConfessionAPI(deployedContract, providers, logger);
  }

  /**
   * Join an existing confession contract using its on-chain address.
   */
  static async join(
    providers: ConfessionProviders,
    contractAddress: ContractAddress,
    logger?: Logger,
  ): Promise<ConfessionAPI> {
    logger?.info({ joinConfessionContract: { contractAddress } });

    const deployedContract = await findDeployedContract<ConfessionContract>(
      providers,
      {
        contractAddress,
        contract: confessionContractInstance,
        privateStateId: confessionPrivateStateKey,
        initialPrivateState: await ConfessionAPI.resolvePrivateState(providers),
      },
    );

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedContract.deployTxData.public,
      },
    });

    return new ConfessionAPI(deployedContract, providers, logger);
  }

  /** Post a confession to the board. */
  async postConfession(
    content: string,
    timestamp: bigint = BigInt(Date.now()),
  ): Promise<void> {
    this.logger?.info({
      postConfession: { contentLength: content.length, timestamp },
    });

    const txData = await this.deployedContract.callTx.postConfession(
      content,
      timestamp,
    );

    this.logger?.trace({
      transactionAdded: {
        circuit: 'postConfession',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /** Submit an upvote for the current confession. */
  async upvote(): Promise<void> {
    await this.vote(true);
  }

  /** Submit a downvote for the current confession. */
  async downvote(): Promise<void> {
    await this.vote(false);
  }

  /** Submit a directional vote for the current confession. */
  async vote(isUpvote: boolean): Promise<void> {
    this.logger?.info({ vote: { direction: isUpvote ? 'up' : 'down' } });

    const txData = await this.deployedContract.callTx.vote(isUpvote ? 1n : 0n);

    this.logger?.trace({
      transactionAdded: {
        circuit: 'vote',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  private static async resolvePrivateState(
    providers: ConfessionProviders,
  ): Promise<ConfessionPrivateState> {
    const existingPrivateState = await providers.privateStateProvider.get(
      confessionPrivateStateKey,
    );
    if (existingPrivateState != null) {
      return existingPrivateState;
    }

    const newPrivateState = createConfessionPrivateState(utils.randomBytes(32));
    await providers.privateStateProvider.set(
      confessionPrivateStateKey,
      newPrivateState,
    );
    return newPrivateState;
  }

  private static toDerivedState(
    ledgerState: ReturnType<typeof ledger>,
    privateState: ConfessionPrivateState,
  ): ConfessionBoardDerivedState {
    const hasConfession = ledgerState.confession0.is_some;
    const confessionCount = ledgerState.confessionCount;

    const currentConfessionId = hasConfession
      ? confessionCount > 0n
        ? confessionCount - 1n
        : 0n
      : null;

    const authorHex = hasConfession
      ? toHex(ledgerState.confession0Author)
      : null;
    let isAuthor = false;

    if (authorHex !== null && currentConfessionId !== null) {
      const computedAuthor = pureCircuits.anonymousId(
        privateState.secretKey,
        currentConfessionId,
      );
      isAuthor = toHex(computedAuthor) === authorHex;
    }

    return {
      confessionCount,
      currentConfessionId,
      hasConfession,
      content: hasConfession ? ledgerState.confession0.value : null,
      timestamp: hasConfession ? ledgerState.confession0Timestamp : null,
      upvotes: ledgerState.confession0Upvotes,
      downvotes: ledgerState.confession0Downvotes,
      authorHex,
      isAuthor,
    };
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';
