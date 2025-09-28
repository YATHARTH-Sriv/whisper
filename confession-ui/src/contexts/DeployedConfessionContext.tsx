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

import React, { type PropsWithChildren, createContext } from 'react';
import {
  BrowserDeployedConfessionManager,
  type DeployedConfessionAPIProvider,
} from './BrowserDeployedConfessionManager';
import { type Logger } from 'pino';

/** Provides access to confession deployments throughout the React tree. */
export const DeployedConfessionContext = createContext<DeployedConfessionAPIProvider | undefined>(undefined);

/** Props consumed by the {@link DeployedConfessionProvider} component. */
export type DeployedConfessionProviderProps = PropsWithChildren<{
  /** Logger instance forwarded to the confession manager. */
  readonly logger: Logger;
}>;

/**
 * React provider responsible for instantiating a {@link BrowserDeployedConfessionManager}
 * and exposing it via {@link DeployedConfessionContext}.
 */
export const DeployedConfessionProvider: React.FC<Readonly<DeployedConfessionProviderProps>> = ({
  logger,
  children,
}) => (
  <DeployedConfessionContext.Provider value={new BrowserDeployedConfessionManager(logger)}>
    {children}
  </DeployedConfessionContext.Provider>
);
