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

import React, { useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { CardActions, CardContent, IconButton, Tooltip, Typography } from '@mui/material';
import BoardAddIcon from '@mui/icons-material/PostAddOutlined';
import CreateBoardIcon from '@mui/icons-material/AddCircleOutlined';
import JoinBoardIcon from '@mui/icons-material/AddLinkOutlined';
import { TextPromptDialog } from './TextPromptDialog';

/**
 * The props required by the {@link EmptyCardContent} component.
 *
 * @internal
 */
export interface EmptyCardContentProps {
  /** Callback invoked to deploy a new confession board. */
  onCreateConfession: () => void;
  /** Callback invoked to join an existing confession board. */
  onJoinConfession: (contractAddress: ContractAddress) => void;
}

/**
 * Used when there is no deployment to render UI allowing the user to join or deploy confession boards.
 *
 * @internal
 */
export const EmptyCardContent: React.FC<Readonly<EmptyCardContentProps>> = ({
  onCreateConfession,
  onJoinConfession,
}) => {
  const [textPromptOpen, setTextPromptOpen] = useState(false);

  return (
    <React.Fragment>
      <CardContent>
        <Typography align="center" variant="h1" color="primary.dark">
          <BoardAddIcon fontSize="large" />
        </Typography>
        <Typography data-testid="board-posted-message" align="center" variant="body2" color="primary.dark">
          Start a new confession board or join an existing one…
        </Typography>
      </CardContent>
      <CardActions disableSpacing sx={{ justifyContent: 'center' }}>
        <Tooltip title="Create a new board">
          <IconButton data-testid="board-deploy-btn" onClick={onCreateConfession}>
            <CreateBoardIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Join an existing board">
          <IconButton
            data-testid="board-join-btn"
            onClick={() => {
              setTextPromptOpen(true);
            }}
          >
            <JoinBoardIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
      <TextPromptDialog
        prompt="Enter contract address"
        isOpen={textPromptOpen}
        onCancel={() => {
          setTextPromptOpen(false);
        }}
        onSubmit={(text) => {
          setTextPromptOpen(false);
          onJoinConfession(text);
        }}
      />
    </React.Fragment>
  );
};
