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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import {
  Backdrop,
  CircularProgress,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CopyIcon from '@mui/icons-material/ContentPasteOutlined';
import StopIcon from '@mui/icons-material/HighlightOffOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDownAltOutlined';
import SendIcon from '@mui/icons-material/SendOutlined';
import { type Observable } from 'rxjs';
import { type ConfessionAPI, type ConfessionBoardDerivedState } from '../../../api/src/index';
import { type ConfessionDeployment } from '../contexts';
import { useDeployedConfessionContext } from '../hooks';
import { EmptyCardContent } from './Board.EmptyCardContent';

/** The props required by the {@link Board} component. */
export interface BoardProps {
  /** Observable confession deployment backing this card. */
  confessionDeployment$?: Observable<ConfessionDeployment>;
}

/**
 * Provides the UI for interacting with a deployed confession contract, allowing
 * users to post confessions and vote on the active confession.
 */
export const Board: React.FC<Readonly<BoardProps>> = ({ confessionDeployment$ }) => {
  const confessionProvider = useDeployedConfessionContext();
  const [deployment, setDeployment] = useState<ConfessionDeployment>();
  const [confessionApi, setConfessionApi] = useState<ConfessionAPI>();
  const [confessionState, setConfessionState] = useState<ConfessionBoardDerivedState>();
  const [confessionDraft, setConfessionDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isWorking, setIsWorking] = useState<boolean>(!!confessionDeployment$);

  const deployConfessionBoard = useCallback(() => {
    confessionProvider.resolve();
  }, [confessionProvider]);

  const joinConfessionBoard = useCallback(
    (contractAddress: ContractAddress) => {
      confessionProvider.resolve(contractAddress);
    },
    [confessionProvider],
  );

  const handlePostConfession = useCallback(async () => {
    if (!confessionApi) {
      return;
    }

    const content = confessionDraft.trim();
    if (!content.length) {
      return;
    }

    try {
      setErrorMessage(undefined);
      setIsWorking(true);
      await confessionApi.postConfession(content);
      setConfessionDraft('');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [confessionApi, confessionDraft]);

  const handleVote = useCallback(
    async (isUpvote: boolean) => {
      if (!confessionApi) {
        return;
      }

      try {
        setErrorMessage(undefined);
        setIsWorking(true);
        await confessionApi.vote(isUpvote);
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setIsWorking(false);
      }
    },
    [confessionApi],
  );

  const handleCopyContractAddress = useCallback(async () => {
    const contractAddress = deployment?.status === 'deployed' ? deployment.api.deployedContractAddress : undefined;
    if (!contractAddress) {
      return;
    }
    await navigator.clipboard.writeText(contractAddress);
  }, [deployment]);

  useEffect(() => {
    if (!confessionDeployment$) {
      setDeployment(undefined);
      setConfessionApi(undefined);
      setConfessionState(undefined);
      setConfessionDraft('');
      setErrorMessage(undefined);
      setIsWorking(false);
      return;
    }

    const subscription = confessionDeployment$.subscribe({
      next: setDeployment,
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [confessionDeployment$]);

  useEffect(() => {
    if (!deployment) {
      return;
    }

    setConfessionState(undefined);

    if (deployment.status === 'in-progress') {
      setIsWorking(true);
      return;
    }

    if (deployment.status === 'failed') {
      setIsWorking(false);
      setConfessionApi(undefined);
      setErrorMessage(deployment.error.message.length ? deployment.error.message : 'Encountered an unexpected error.');
      return;
    }

    setErrorMessage(undefined);
    setIsWorking(false);
    setConfessionApi(deployment.api);

    const subscription = deployment.api.state$.subscribe({
      next: setConfessionState,
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [deployment]);

  useEffect(() => {
    if (confessionState?.hasConfession) {
      setConfessionDraft('');
    }
  }, [confessionState?.hasConfession]);

  const contractAddress = useMemo(
    () => (deployment?.status === 'deployed' ? deployment.api.deployedContractAddress : undefined),
    [deployment],
  );

  const shortContractAddress = useMemo(() => toShortFormatContractAddress(contractAddress), [contractAddress]);

  const formattedTimestamp = useMemo(() => {
    if (!confessionState?.timestamp) {
      return null;
    }

    const timestampNumber = Number(confessionState.timestamp);
    if (Number.isNaN(timestampNumber)) {
      return null;
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestampNumber));
  }, [confessionState?.timestamp]);

  const confessionIndexLabel = useMemo(() => {
    if (!confessionState) {
      return undefined;
    }

    return `#${confessionState.confessionCount.toString()}`;
  }, [confessionState]);

  const authorChipLabel = useMemo(() => {
    if (!confessionState?.authorHex) {
      return null;
    }

    const shortAuthor = toShortHex(confessionState.authorHex);
    return confessionState.isAuthor ? `${shortAuthor} (you)` : shortAuthor;
  }, [confessionState?.authorHex, confessionState?.isAuthor]);

  const canPost =
    Boolean(confessionApi) && confessionState?.hasConfession !== true && confessionDraft.trim().length > 0;
  const canVote = Boolean(confessionApi) && confessionState?.hasConfession === true && !confessionState.isAuthor;

  const upvoteTooltip = confessionState?.isAuthor ? 'Authors cannot vote on their confession' : 'Upvote confession';
  const downvoteTooltip = confessionState?.isAuthor ? 'Authors cannot vote on their confession' : 'Downvote confession';

  return (
    <Card sx={{ position: 'relative', width: 275, height: 300, minWidth: 275, minHeight: 300 }} color="primary">
      {!confessionDeployment$ && (
        <EmptyCardContent onCreateConfession={deployConfessionBoard} onJoinConfession={joinConfessionBoard} />
      )}

      {confessionDeployment$ && (
        <React.Fragment>
          <Backdrop
            sx={{ position: 'absolute', color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={isWorking}
          >
            <CircularProgress data-testid="confession-working-indicator" />
          </Backdrop>
          <Backdrop
            sx={{ position: 'absolute', color: '#ff0000', zIndex: (theme) => theme.zIndex.drawer + 1, gap: 1 }}
            open={Boolean(errorMessage)}
          >
            <StopIcon fontSize="large" />
            <Typography component="div" data-testid="confession-error-message">
              {errorMessage}
            </Typography>
          </Backdrop>
          <CardHeader
            avatar={
              confessionIndexLabel ? (
                <Chip label={confessionIndexLabel} size="small" color="primary" />
              ) : (
                <Skeleton variant="circular" width={24} height={24} />
              )
            }
            titleTypographyProps={{ color: 'primary' }}
            title={shortContractAddress ?? 'Loading...'}
            action={
              contractAddress ? (
                <Tooltip title="Copy contract address">
                  <IconButton onClick={handleCopyContractAddress}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Skeleton variant="circular" width={20} height={20} />
              )
            }
          />
          <CardContent>
            {confessionState ? (
              confessionState.hasConfession ? (
                <Stack spacing={2} minHeight={160} justifyContent="space-between">
                  <Typography data-testid="confession-content" color="primary" sx={{ overflowWrap: 'anywhere' }}>
                    {confessionState.content}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      {authorChipLabel ? (
                        <Chip
                          data-testid="confession-author"
                          label={authorChipLabel}
                          color={confessionState.isAuthor ? 'success' : 'default'}
                          size="small"
                        />
                      ) : null}
                      {formattedTimestamp ? (
                        <Typography variant="caption" color="text.secondary">
                          {formattedTimestamp}
                        </Typography>
                      ) : null}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={`▲ ${confessionState.upvotes.toString()}`} size="small" variant="outlined" />
                      <Chip label={`▼ ${confessionState.downvotes.toString()}`} size="small" variant="outlined" />
                    </Stack>
                  </Stack>
                </Stack>
              ) : (
                <TextField
                  id="confession-draft"
                  data-testid="confession-draft"
                  variant="outlined"
                  focused
                  fullWidth
                  multiline
                  minRows={6}
                  maxRows={6}
                  placeholder="Share your confession..."
                  size="small"
                  value={confessionDraft}
                  onChange={(event) => {
                    setConfessionDraft(event.target.value);
                  }}
                />
              )
            ) : (
              <Skeleton variant="rectangular" width={245} height={160} />
            )}
          </CardContent>
          <CardActions sx={{ justifyContent: 'center' }}>
            {confessionApi ? (
              confessionState?.hasConfession ? (
                <Stack direction="row" spacing={1}>
                  <Tooltip title={upvoteTooltip}>
                    <span>
                      <IconButton
                        data-testid="confession-upvote-btn"
                        disabled={!canVote || isWorking}
                        onClick={() => {
                          void handleVote(true);
                        }}
                      >
                        <ThumbUpIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={downvoteTooltip}>
                    <span>
                      <IconButton
                        data-testid="confession-downvote-btn"
                        disabled={!canVote || isWorking}
                        onClick={() => {
                          void handleVote(false);
                        }}
                      >
                        <ThumbDownIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              ) : (
                <Tooltip title="Post confession">
                  <span>
                    <IconButton
                      data-testid="confession-post-btn"
                      disabled={!canPost || isWorking}
                      onClick={() => {
                        void handlePostConfession();
                      }}
                    >
                      <SendIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )
            ) : (
              <Skeleton variant="rectangular" width={80} height={20} />
            )}
          </CardActions>
        </React.Fragment>
      )}
    </Card>
  );
};

const toShortFormatContractAddress = (contractAddress?: ContractAddress): string | undefined =>
  contractAddress
    ? `0x${contractAddress.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{8}).*([A-Fa-f0-9]{8})$/g, '$1...$2')}`
    : undefined;

const toShortHex = (value: string): string => {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};
