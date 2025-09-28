# Confession Contract API

High-level TypeScript helpers for interacting with the anonymous confession contract from web or Node.js frontends.

## Quick start

```bash
npm install
npm run build
```

### Deploy a new confession board

```ts
import { ConfessionAPI } from '@midnight-ntwrk/confession-api';

const providers = await buildProviders(); // supply Midnight providers from your app
const confessionApi = await ConfessionAPI.deploy(providers, logger);

confessionApi.state$.subscribe((state) => {
  console.log('board state', state);
});

await confessionApi.postConfession('Hello Midnight 👋');
```

### Join an existing board

```ts
const existing = await ConfessionAPI.join(providers, contractAddress, logger);
await existing.upvote();
```

Each instance keeps the caller's private state in sync using the provided `privateStateProvider`. The observable `state$` merges on-chain ledger data with the locally stored secret key so that UIs can quickly determine authorship and vote totals without additional wiring.
