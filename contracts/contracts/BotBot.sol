// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract BotBot is EIP712 {
    using ECDSA for bytes32;

    address public oracleAddress;
    address public owner;

    enum RoomType { RoomA, RoomB }
    enum RoomState { Waiting, Chatting, Voting, Revealing, Resolved, Cancelled }

    struct Room {
        uint256 id;
        RoomType roomType;
        uint256 stakeAmount;
        uint256 chatDuration;
        uint256 voteDuration;
        uint256 revealDuration;
        address[] humanPlayers;
        bytes32 aiCommitment;
        RoomState state;
        uint256 phaseEndTime;
        uint256 pot;
    }

    mapping(uint256 => Room) public rooms;
    mapping(uint256 => mapping(address => bytes32)) public commits;
    mapping(uint256 => mapping(address => bool)) public hasCommitted;
    mapping(uint256 => mapping(address => address)) public reveals; // Address voted for
    mapping(uint256 => mapping(address => bool)) public hasRevealed;
    mapping(address => uint256) public pendingWithdrawals;

    uint256 public nextRoomId;

    event RoomCreated(uint256 indexed roomId, RoomType roomType, uint256 stakeAmount);
    event PlayerJoined(uint256 indexed roomId, address player);
    event RoomStateChanged(uint256 indexed roomId, RoomState newState);
    event VoteCommitted(uint256 indexed roomId, address player);
    event VoteRevealed(uint256 indexed roomId, address player, address votedFor);
    event RoomResolved(uint256 indexed roomId, address[] winners, uint256 payoutPerWinner);
    event RoomCancelled(uint256 indexed roomId, address[] refundedPlayers);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _oracleAddress) EIP712("BotBot", "1") {
        oracleAddress = _oracleAddress;
        owner = msg.sender;
    }

    function createRoom(
        RoomType _roomType,
        uint256 _stakeAmount,
        uint256 _chatDuration,
        uint256 _voteDuration,
        uint256 _revealDuration
    ) external onlyOwner returns (uint256) {
        uint256 roomId = nextRoomId++;
        Room storage room = rooms[roomId];
        room.id = roomId;
        room.roomType = _roomType;
        room.stakeAmount = _stakeAmount;
        room.chatDuration = _chatDuration;
        room.voteDuration = _voteDuration;
        room.revealDuration = _revealDuration;
        room.state = RoomState.Waiting;
        
        emit RoomCreated(roomId, _roomType, _stakeAmount);
        return roomId;
    }

    function joinRoom(uint256 _roomId) external payable {
        Room storage room = rooms[_roomId];
        require(room.state == RoomState.Waiting, "Room not in waiting state");
        
        uint256 maxHumans = room.roomType == RoomType.RoomA ? 2 : 3;
        require(room.humanPlayers.length < maxHumans, "Room is full");

        require(msg.value == room.stakeAmount, "Incorrect stake amount");

        // Prevent duplicate joins
        for (uint i = 0; i < room.humanPlayers.length; i++) {
            require(room.humanPlayers[i] != msg.sender, "Already joined");
        }

        room.humanPlayers.push(msg.sender);
        room.pot += msg.value;
        emit PlayerJoined(_roomId, msg.sender);
    }

    function startGame(uint256 _roomId, bytes32 _aiCommitment) external onlyOwner {
        Room storage room = rooms[_roomId];
        require(room.state == RoomState.Waiting, "Room not in waiting state");
        require(room.aiCommitment == bytes32(0), "Game already started");
        
        uint256 expectedTotal = room.roomType == RoomType.RoomA ? 2 : 3;
        // Since we are moving AI injection to commitment, we just verify the exact number of humans.
        // A room with AI needs expectedTotal - 1 humans. A pure human room needs expectedTotal humans.
        require(
            room.humanPlayers.length == expectedTotal || room.humanPlayers.length == expectedTotal - 1, 
            "Incorrect player count"
        );

        if (_aiCommitment != bytes32(0)) {
            room.aiCommitment = _aiCommitment;
        }

        room.state = RoomState.Chatting;
        room.phaseEndTime = block.timestamp + room.chatDuration;
        emit RoomStateChanged(_roomId, RoomState.Chatting);
    }

    function startVoting(uint256 _roomId) external {
        Room storage room = rooms[_roomId];
        require(room.state == RoomState.Chatting, "Not in chatting state");
        require(block.timestamp >= room.phaseEndTime, "Chat phase not over");
        
        room.state = RoomState.Voting;
        room.phaseEndTime = block.timestamp + room.voteDuration;
        emit RoomStateChanged(_roomId, RoomState.Voting);
    }

    function commitVote(uint256 _roomId, bytes32 _commitHash) external {
        Room storage room = rooms[_roomId];
        require(room.state == RoomState.Voting, "Not in voting state");
        require(block.timestamp < room.phaseEndTime, "Voting phase over");
        require(isHumanPlayer(_roomId, msg.sender), "Not a human player");
        require(!hasCommitted[_roomId][msg.sender], "Already committed");

        commits[_roomId][msg.sender] = _commitHash;
        hasCommitted[_roomId][msg.sender] = true;
        emit VoteCommitted(_roomId, msg.sender);
    }

    function startRevealing(uint256 _roomId) external {
        Room storage room = rooms[_roomId];
        require(room.state == RoomState.Voting, "Not in voting state");
        require(block.timestamp >= room.phaseEndTime, "Voting phase not over");

        room.state = RoomState.Revealing;
        room.phaseEndTime = block.timestamp + room.revealDuration;
        emit RoomStateChanged(_roomId, RoomState.Revealing);
    }

    function revealVote(uint256 _roomId, address _votedFor, string calldata _salt) external {
        Room storage room = rooms[_roomId];
        require(room.state == RoomState.Revealing, "Not in revealing state");
        require(block.timestamp < room.phaseEndTime, "Revealing phase over");
        require(hasCommitted[_roomId][msg.sender], "Did not commit");
        require(!hasRevealed[_roomId][msg.sender], "Already revealed");

        bytes32 expectedHash = keccak256(abi.encodePacked(_votedFor, _salt));
        require(commits[_roomId][msg.sender] == expectedHash, "Invalid reveal");

        reveals[_roomId][msg.sender] = _votedFor;
        hasRevealed[_roomId][msg.sender] = true;
        emit VoteRevealed(_roomId, msg.sender, _votedFor);
    }

    function resolveRoom(uint256 _roomId, address _aiAddress, bytes32 _salt, bytes calldata _oracleSignature) external {
        Room storage room = rooms[_roomId];
        require(room.state == RoomState.Revealing, "Not in revealing state");
        require(block.timestamp >= room.phaseEndTime, "Revealing phase not over");
        
        {
            // Verify commitment matches
            require(room.aiCommitment == keccak256(abi.encodePacked(_aiAddress, _salt)), "Commitment mismatch");

            // Verify EIP-712 Oracle Signature
            bytes32 structHash = keccak256(abi.encode(
                keccak256("ResolveRoom(uint256 roomId,address aiAddress,bytes32 salt)"),
                _roomId,
                _aiAddress,
                _salt
            ));
            
            require(ECDSA.recover(_hashTypedDataV4(structHash), _oracleSignature) == oracleAddress, "Invalid Oracle signature");
        }

        // Determine winners
        address[] memory tempWinners = new address[](room.humanPlayers.length);
        uint256 winnerCount = 0;

        for (uint i = 0; i < room.humanPlayers.length; i++) {
            address player = room.humanPlayers[i];
            if (hasRevealed[_roomId][player] && reveals[_roomId][player] == _aiAddress) {
                tempWinners[winnerCount] = player;
                winnerCount++;
            }
        }

        address[] memory winners = new address[](winnerCount);
        for (uint i = 0; i < winnerCount; i++) {
            winners[i] = tempWinners[i];
        }

        room.state = RoomState.Resolved;
        
        uint256 payoutPerWinner = 0;
        if (winnerCount > 0 && room.pot > 0) {
            payoutPerWinner = room.pot / winnerCount;
            room.pot = 0; // Prevent reentrancy
            for (uint i = 0; i < winnerCount; i++) {
                pendingWithdrawals[winners[i]] += payoutPerWinner;
            }
        } else if (winnerCount == 0 && room.pot > 0) {
            // Transfer to owner if no one wins
            uint256 amount = room.pot;
            room.pot = 0;
            pendingWithdrawals[owner] += amount;
        }
        
        emit RoomStateChanged(_roomId, RoomState.Resolved);
        emit RoomResolved(_roomId, winners, payoutPerWinner);
    }

    function cancelRoom(uint256 _roomId) external onlyOwner {
        Room storage room = rooms[_roomId];
        require(room.state == RoomState.Waiting, "Room not in waiting state");
        
        room.state = RoomState.Cancelled;
        uint256 refundAmount = room.stakeAmount;
        room.pot = 0;

        for (uint i = 0; i < room.humanPlayers.length; i++) {
            pendingWithdrawals[room.humanPlayers[i]] += refundAmount;
        }

        emit RoomStateChanged(_roomId, RoomState.Cancelled);
        emit RoomCancelled(_roomId, room.humanPlayers);
    }

    function isHumanPlayer(uint256 _roomId, address _address) internal view returns (bool) {
        Room storage room = rooms[_roomId];
        for (uint i = 0; i < room.humanPlayers.length; i++) {
            if (room.humanPlayers[i] == _address) {
                return true;
            }
        }
        return false;
    }

    function getHumanPlayers(uint256 _roomId) external view returns (address[] memory) {
        return rooms[_roomId].humanPlayers;
    }

    function setOracleAddress(address _newOracle) external onlyOwner {
        oracleAddress = _newOracle;
    }

    function claimRewards() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to claim");
        
        pendingWithdrawals[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
