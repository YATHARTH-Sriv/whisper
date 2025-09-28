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

import {
  ConfessionAPI,
  type ConfessionBoardDerivedState,
  type ConfessionCircuitKeys,
  type ConfessionProviders,
} from '../../../api/src/index';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { type Logger } from 'pino';
import { pipe as fnPipe } from 'fp-ts/function';
import {
  BehaviorSubject,
  type Observable,
  catchError,
  concatMap,
  filter,
  firstValueFrom,
  interval,
  map,
  of,
  take,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import {
  type DAppConnectorAPI,
  type DAppConnectorWalletAPI,
  type ServiceUriConfig,
} from '@midnight-ntwrk/dapp-connector-api';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import {
  type BalancedTransaction,
  type UnbalancedTransaction,
  createBalancedTx,
} from '@midnight-ntwrk/midnight-js-types';
import { type CoinInfo, Transaction, type TransactionId } from '@midnight-ntwrk/ledger';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import semver from 'semver';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

/** Confession deployment that is still resolving providers/contract. */
export interface InProgressConfessionDeployment {
  readonly status: 'in-progress';
}

/** Confession deployment that completed successfully. */
export interface DeployedConfessionDeployment {
  readonly status: 'deployed';
  readonly api: ConfessionAPI;
  readonly latestState$?: Observable<ConfessionBoardDerivedState>;
}

/** Confession deployment that failed. */
export interface FailedConfessionDeployment {
  readonly status: 'failed';
  readonly error: Error;
}

/** Union of confession deployment states. */
export type ConfessionDeployment =
  | InProgressConfessionDeployment
  | DeployedConfessionDeployment
  | FailedConfessionDeployment;

/** Provider contract for accessing confession deployments. */
export interface DeployedConfessionAPIProvider {
  /** Observable list of confession deployments. */
  readonly confessionDeployments$: Observable<Array<Observable<ConfessionDeployment>>>;

  /** Resolve (deploy or join) a confession contract. */
  readonly resolve: (contractAddress?: ContractAddress) => Observable<ConfessionDeployment>;
}

/** Browser-friendly confession deployment manager. */
export class BrowserDeployedConfessionManager implements DeployedConfessionAPIProvider {
  readonly #deploymentsSubject: BehaviorSubject<Array<BehaviorSubject<ConfessionDeployment>>>;
  #initializedProviders: Promise<ConfessionProviders> | undefined;

  constructor(private readonly logger: Logger) {
    this.#deploymentsSubject = new BehaviorSubject<Array<BehaviorSubject<ConfessionDeployment>>>([]);
    this.confessionDeployments$ = this.#deploymentsSubject;
  }

  readonly confessionDeployments$: Observable<Array<Observable<ConfessionDeployment>>>;

  resolve(contractAddress?: ContractAddress): Observable<ConfessionDeployment> {
    const deployments = this.#deploymentsSubject.value;
    let deployment = deployments.find(
      (existing) =>
        existing.value.status === 'deployed' && existing.value.api.deployedContractAddress === contractAddress,
    );

    if (deployment) {
      return deployment;
    }

    deployment = new BehaviorSubject<ConfessionDeployment>({ status: 'in-progress' });

    if (contractAddress) {
      void this.joinDeployment(deployment, contractAddress);
    } else {
      void this.deployDeployment(deployment);
    }

    this.#deploymentsSubject.next([...deployments, deployment]);
    return deployment;
  }

  private getProviders(): Promise<ConfessionProviders> {
    return this.#initializedProviders ?? (this.#initializedProviders = initializeProviders(this.logger));
  }

  private async deployDeployment(deployment: BehaviorSubject<ConfessionDeployment>): Promise<void> {
    try {
      const providers = await this.getProviders();
      const api = await ConfessionAPI.deploy(providers, this.logger);

      deployment.next({
        status: 'deployed',
        api,
        latestState$: api.state$,
      });
    } catch (error: unknown) {
      deployment.next({
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private async joinDeployment(
    deployment: BehaviorSubject<ConfessionDeployment>,
    contractAddress: ContractAddress,
  ): Promise<void> {
    try {
      const providers = await this.getProviders();
      const api = await ConfessionAPI.join(providers, contractAddress, this.logger);

      deployment.next({
        status: 'deployed',
        api,
        latestState$: api.state$,
      });
    } catch (error: unknown) {
      deployment.next({
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}

const initializeProviders = async (logger: Logger): Promise<ConfessionProviders> => {
  const { wallet, uris } = await connectToWallet(logger);
  const walletState = await wallet.state();
  const zkConfigPath = window.location.origin;

  logger.info({ connectWallet: { networkId: getLedgerNetworkId() } });

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'confession-private-state',
    }),
    zkConfigProvider: new FetchZkConfigProvider<ConfessionCircuitKeys>(zkConfigPath, fetch.bind(window)),
    proofProvider: httpClientProofProvider(uris.proverServerUri),
    publicDataProvider: indexerPublicDataProvider(uris.indexerUri, uris.indexerWsUri),
    walletProvider: {
      coinPublicKey: walletState.coinPublicKey,
      encryptionPublicKey: walletState.encryptionPublicKey,
      balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
        return wallet
          .balanceAndProveTransaction(
            ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
            newCoins,
          )
          .then((zswapTx: ZswapTransaction) =>
            Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()),
          )
          .then(createBalancedTx);
      },
    },
    midnightProvider: {
      submitTx(tx: BalancedTransaction): Promise<TransactionId> {
        return wallet.submitTransaction(tx);
      },
    },
  } satisfies ConfessionProviders;
};

const connectToWallet = (logger: Logger): Promise<{ wallet: DAppConnectorWalletAPI; uris: ServiceUriConfig }> => {
  const COMPATIBLE_CONNECTOR_API_VERSION = '1.x';

  return firstValueFrom(
    fnPipe(
      interval(100),
      map(() => window.midnight?.mnLace),
      tap((connectorAPI) => {
        logger.info(connectorAPI, 'Check for wallet connector API');
      }),
      filter((connectorAPI): connectorAPI is DAppConnectorAPI => connectorAPI != null),
      concatMap((connectorAPI) =>
        semver.satisfies(connectorAPI.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION)
          ? of(connectorAPI)
          : throwError(() => {
              logger.error(
                {
                  expected: COMPATIBLE_CONNECTOR_API_VERSION,
                  actual: connectorAPI.apiVersion,
                },
                'Incompatible version of wallet connector API',
              );

              return new Error(
                `Incompatible version of Midnight Lace wallet found. Require '${COMPATIBLE_CONNECTOR_API_VERSION}', got '${connectorAPI.apiVersion}'.`,
              );
            }),
      ),
      tap((connectorAPI) => {
        logger.info(connectorAPI, 'Compatible wallet connector API found. Connecting.');
      }),
      take(1),
      timeout({
        first: 1_000,
        with: () =>
          throwError(() => {
            logger.error('Could not find wallet connector API');
            return new Error('Could not find Midnight Lace wallet. Extension installed?');
          }),
      }),
      concatMap(async (connectorAPI) => {
        const isEnabled = await connectorAPI.isEnabled();
        logger.info(isEnabled, 'Wallet connector API enabled status');
        return connectorAPI;
      }),
      timeout({
        first: 5_000,
        with: () =>
          throwError(() => {
            logger.error('Wallet connector API has failed to respond');
            return new Error('Midnight Lace wallet has failed to respond. Extension enabled?');
          }),
      }),
      concatMap(async (connectorAPI) => ({ walletConnectorAPI: await connectorAPI.enable(), connectorAPI })),
      catchError((error, stream$) =>
        error
          ? throwError(() => {
              logger.error('Unable to enable connector API');
              return new Error('Application is not authorized');
            })
          : stream$,
      ),
      concatMap(async ({ walletConnectorAPI, connectorAPI }) => {
        const uris = await connectorAPI.serviceUriConfig();
        logger.info('Connected to wallet connector API and retrieved service configuration');
        return { wallet: walletConnectorAPI, uris };
      }),
    ),
  );
};
