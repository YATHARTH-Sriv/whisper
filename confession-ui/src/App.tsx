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

import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { MainLayout, Board } from './components';
import { useDeployedConfessionContext } from './hooks';
import { type ConfessionDeployment } from './contexts';
import { type Observable } from 'rxjs';

/**
 * The root bulletin board application component.
 *
 * @remarks
 * The {@link App} component requires a `<DeployedConfessionProvider />` parent in order to retrieve
 * information about current confession deployments.
 *
 * @internal
 */
const App: React.FC = () => {
  const confessionProvider = useDeployedConfessionContext();
  const [confessionDeployments, setConfessionDeployments] = useState<Array<Observable<ConfessionDeployment>>>([]);

  useEffect(() => {
    const subscription = confessionProvider.confessionDeployments$.subscribe(setConfessionDeployments);

    return () => {
      subscription.unsubscribe();
    };
  }, [confessionProvider]);

  return (
    <Box sx={{ background: '#000', minHeight: '100vh' }}>
      <MainLayout>
        {confessionDeployments.map((confessionDeployment, idx) => (
          <div data-testid={`board-${idx}`} key={`board-${idx}`}>
            <Board confessionDeployment$={confessionDeployment} />
          </div>
        ))}
        <div data-testid="board-start">
          <Board />
        </div>
      </MainLayout>
    </Box>
  );
};

export default App;
