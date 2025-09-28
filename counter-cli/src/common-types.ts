// This file is part of midnightntwrk/example-confession.
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

import { Counter as Confession, type ConfessionPrivateState } from '@midnight-ntwrk/confession-contract';
import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

export type ConfessionCircuits = ImpureCircuitId<Confession.Contract<ConfessionPrivateState>>;

export const confessionPrivateStateId = 'confessionPrivateState';

export type ConfessionProviders = MidnightProviders<
	ConfessionCircuits,
	typeof confessionPrivateStateId,
	ConfessionPrivateState
>;

export type ConfessionContract = Confession.Contract<ConfessionPrivateState>;

export type DeployedConfessionContract = DeployedContract<ConfessionContract> | FoundContract<ConfessionContract>;
