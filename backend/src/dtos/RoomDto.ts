export const toRoomDto = (room: any) => {
  if (!room) return null;

  const isFinished = room.state === 'Resolved' || room.state === 'Cancelled';

  return {
    id: room.id,
    type: room.type,
    state: room.state,
    stakeAmount: room.stakeAmount?.toString(),
    phaseEndTime: room.phaseEndTime?.toString(),
    chatEndTime: room.chatEndTime,
    commitEndTime: room.commitEndTime,
    revealEndTime: room.revealEndTime,
    createdAt: room.createdAt,
    // Safely reveal AI address only if the game is over
    revealedAI: isFinished ? room.aiAddress : null,
    // Never include aiSalt or raw aiAddress
    players: room.players ? room.players.map(toPlayerDto) : undefined,
    messages: room.messages ? room.messages.map(toMessageDto) : undefined,
  };
};

export const toPlayerDto = (player: any) => {
  if (!player) return null;
  return {
    walletAddress: player.walletAddress,
    roomId: player.roomId,
    nickname: player.nickname,
    // SCRUBBED: isAI is explicitly omitted to prevent leaking the AI identity
  };
};

export const toMessageDto = (message: any) => {
  if (!message) return null;
  return {
    id: message.id,
    roomId: message.roomId,
    senderAddress: message.senderAddress,
    content: message.content,
    timestamp: message.timestamp,
  };
};
