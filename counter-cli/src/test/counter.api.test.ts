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

import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import path from 'path';
import * as api from '../api';
import { type ConfessionProviders } from '../common-types';
import { currentDir } from '../config';
import { createLogger } from '../logger-utils';
import { TestEnvironment } from './commons';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const logDir = path.resolve(currentDir, '..', 'logs', 'tests', `${new Date().toISOString()}.log`);
const logger = await createLogger(logDir);

describe('API', () => {
  let testEnvironment: TestEnvironment;
  let wallet: Wallet & Resource;
  let providers: ConfessionProviders;

  beforeAll(
    async () => {
      api.setLogger(logger);
      testEnvironment = new TestEnvironment(logger);
      const testConfiguration = await testEnvironment.start();
      wallet = await testEnvironment.getWallet();
      providers = await api.configureProviders(wallet, testConfiguration.dappConfig);
    },
    1000 * 60 * 45,
  );

  afterAll(async () => {
    await testEnvironment.saveWalletCache();
    await testEnvironment.shutdown();
  });

  it('should deploy the contract and interact with the confession board [@slow]', async () => {
    const confessionContract = await api.deploy(providers);
    expect(confessionContract).not.toBeNull();

    const initialBoard = await api.displayConfessionBoard(providers, confessionContract);
    expect(initialBoard.snapshot).not.toBeNull();
    expect(initialBoard.snapshot?.confessionExists).toEqual(false);

    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const postResponse = await api.postConfession(confessionContract, 'Test confession from vitest');
    expect(postResponse.txHash).toMatch(/[0-9a-f]{64}/);
    expect(postResponse.blockHeight).toBeGreaterThan(BigInt(0));

    const boardAfterPost = await api.displayConfessionBoard(providers, confessionContract);
    expect(boardAfterPost.snapshot).not.toBeNull();
    expect(boardAfterPost.snapshot?.confessionExists).toEqual(true);
    expect(boardAfterPost.snapshot?.confessionContent).toEqual('Test confession from vitest');

    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const voteResponse = await api.voteOnConfession(confessionContract, true);
    expect(voteResponse.txHash).toMatch(/[0-9a-f]{64}/);
    expect(voteResponse.blockHeight).toBeGreaterThan(BigInt(0));

    const boardAfterVote = await api.displayConfessionBoard(providers, confessionContract);
    expect(boardAfterVote.snapshot?.upvotes).toEqual(BigInt(1));
    expect(boardAfterVote.snapshot?.downvotes).toEqual(BigInt(0));
  });
});
