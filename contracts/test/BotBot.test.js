import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("BotBot Contract Comprehensive Tests", function () {
    let BotBot, botBot;
    let MockBotToken, botToken;
    let owner, oracle, ai, p1, p2, p3, p4;

    const stakeAmount = ethers.parseEther("100");
    const chatDur = 60;
    const voteDur = 30;
    const revealDur = 30;

    beforeEach(async function () {
        [owner, oracle, ai, p1, p2, p3, p4] = await ethers.getSigners();

        // Deploy Mock Token
        const MockBotTokenFactory = await ethers.getContractFactory("MockBotToken");
        botToken = await MockBotTokenFactory.deploy();
        await botToken.waitForDeployment();

        // Transfer tokens
        const amount = ethers.parseEther("1000");
        await botToken.transfer(p1.address, amount);
        await botToken.transfer(p2.address, amount);
        await botToken.transfer(p3.address, amount);
        await botToken.transfer(p4.address, amount);

        // Deploy BotBot
        const BotBotFactory = await ethers.getContractFactory("BotBot");
        botBot = await BotBotFactory.deploy(await botToken.getAddress(), oracle.address);
        await botBot.waitForDeployment();

        // Approve tokens
        await botToken.connect(p1).approve(await botBot.getAddress(), ethers.MaxUint256);
        await botToken.connect(p2).approve(await botBot.getAddress(), ethers.MaxUint256);
        await botToken.connect(p3).approve(await botBot.getAddress(), ethers.MaxUint256);
        await botToken.connect(p4).approve(await botBot.getAddress(), ethers.MaxUint256);
    });

    describe("1. Room Creation and Joining", function () {
        it("Should allow owner to create a room", async function () {
            await expect(botBot.createRoom(0, stakeAmount, chatDur, voteDur, revealDur))
                .to.emit(botBot, "RoomCreated")
                .withArgs(0, 0, stakeAmount);
            
            const room = await botBot.rooms(0);
            expect(room.state).to.equal(0n); // Waiting
            expect(room.stakeAmount).to.equal(stakeAmount);
        });

        it("Should prevent non-owner from creating a room", async function () {
            await expect(botBot.connect(p1).createRoom(0, stakeAmount, chatDur, voteDur, revealDur))
                .to.be.revertedWith("Not owner");
        });

        it("Should handle Room A limits correctly (max 2)", async function () {
            await botBot.createRoom(0, stakeAmount, chatDur, voteDur, revealDur); // RoomA
            await botBot.connect(p1).joinRoom(0);
            await botBot.connect(p2).joinRoom(0);
            await expect(botBot.connect(p3).joinRoom(0)).to.be.revertedWith("Room is full");
        });

        it("Should handle Room B limits correctly (max 3)", async function () {
            await botBot.createRoom(1, stakeAmount, chatDur, voteDur, revealDur); // RoomB
            await botBot.connect(p1).joinRoom(0);
            await botBot.connect(p2).joinRoom(0);
            await botBot.connect(p3).joinRoom(0);
            await expect(botBot.connect(p4).joinRoom(0)).to.be.revertedWith("Room is full");
        });

        it("Should prevent duplicate joins", async function () {
            await botBot.createRoom(0, stakeAmount, chatDur, voteDur, revealDur);
            await botBot.connect(p1).joinRoom(0);
            await expect(botBot.connect(p1).joinRoom(0)).to.be.revertedWith("Already joined");
        });
    });

    describe("2. AI Injection and Phase Transitions", function () {
        beforeEach(async function () {
            await botBot.createRoom(0, stakeAmount, chatDur, voteDur, revealDur);
            await botBot.connect(p1).joinRoom(0);
        });

        it("Should prevent injecting AI if room not full", async function () {
            await expect(botBot.connect(owner).injectAI(0, ai.address))
                .to.be.revertedWith("Human players not full");
        });

        it("Should allow injecting AI when full and start Chatting", async function () {
            await botBot.connect(p2).joinRoom(0);
            await expect(botBot.connect(owner).injectAI(0, ai.address))
                .to.emit(botBot, "AIInjected").withArgs(0, ai.address)
                .to.emit(botBot, "RoomStateChanged").withArgs(0, 1n); // Chatting
        });

        it("Should prevent starting voting before chat is over", async function () {
            await botBot.connect(p2).joinRoom(0);
            await botBot.connect(owner).injectAI(0, ai.address);
            await expect(botBot.startVoting(0)).to.be.revertedWith("Chat phase not over");
        });
    });

    describe("3. Commit / Reveal Validations", function () {
        let commitHash1, commitHash2;
        const salt1 = "secret1", salt2 = "secret2";

        beforeEach(async function () {
            await botBot.createRoom(0, stakeAmount, chatDur, voteDur, revealDur);
            await botBot.connect(p1).joinRoom(0);
            await botBot.connect(p2).joinRoom(0);
            await botBot.connect(owner).injectAI(0, ai.address);

            await ethers.provider.send("evm_increaseTime", [chatDur + 1]);
            await ethers.provider.send("evm_mine", []);
            await botBot.startVoting(0);

            commitHash1 = ethers.solidityPackedKeccak256(["address", "string"], [ai.address, salt1]);
            commitHash2 = ethers.solidityPackedKeccak256(["address", "string"], [p1.address, salt2]);
        });

        it("Should allow valid commits", async function () {
            await expect(botBot.connect(p1).commitVote(0, commitHash1))
                .to.emit(botBot, "VoteCommitted").withArgs(0, p1.address);
            expect(await botBot.hasCommitted(0, p1.address)).to.be.true;
        });

        it("Should prevent duplicate commits", async function () {
            await botBot.connect(p1).commitVote(0, commitHash1);
            await expect(botBot.connect(p1).commitVote(0, commitHash1)).to.be.revertedWith("Already committed");
        });

        it("Should prevent commits from non-players", async function () {
            await expect(botBot.connect(p3).commitVote(0, commitHash1)).to.be.revertedWith("Not a human player");
        });

        it("Should prevent commits after voting phase", async function () {
            await ethers.provider.send("evm_increaseTime", [voteDur + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(botBot.connect(p1).commitVote(0, commitHash1)).to.be.revertedWith("Voting phase over");
        });

        describe("Reveal Phase", function() {
            beforeEach(async function () {
                await botBot.connect(p1).commitVote(0, commitHash1);
                await botBot.connect(p2).commitVote(0, commitHash2);
                await ethers.provider.send("evm_increaseTime", [voteDur + 1]);
                await ethers.provider.send("evm_mine", []);
                await botBot.startRevealing(0);
            });

            it("Should allow valid reveals", async function () {
                await expect(botBot.connect(p1).revealVote(0, ai.address, salt1))
                    .to.emit(botBot, "VoteRevealed").withArgs(0, p1.address, ai.address);
                expect(await botBot.reveals(0, p1.address)).to.equal(ai.address);
            });

            it("Should reject invalid reveals (wrong address or salt)", async function () {
                await expect(botBot.connect(p1).revealVote(0, p2.address, salt1)).to.be.revertedWith("Invalid reveal");
                await expect(botBot.connect(p1).revealVote(0, ai.address, "wrongSalt")).to.be.revertedWith("Invalid reveal");
            });

            it("Should prevent revealing if didn't commit", async function () {
                await expect(botBot.connect(p3).revealVote(0, ai.address, salt1)).to.be.revertedWith("Did not commit");
            });

            it("Should prevent late reveals", async function () {
                await ethers.provider.send("evm_increaseTime", [revealDur + 1]);
                await ethers.provider.send("evm_mine", []);
                await expect(botBot.connect(p1).revealVote(0, ai.address, salt1)).to.be.revertedWith("Revealing phase over");
            });
        });
    });

    describe("4. Payout Logic and Oracle Verification", function () {
        let oracleSignature, invalidSignature;
        const salt1 = "secret1", salt2 = "secret2";

        beforeEach(async function () {
            await botBot.createRoom(0, stakeAmount, chatDur, voteDur, revealDur);
            await botBot.connect(p1).joinRoom(0);
            await botBot.connect(p2).joinRoom(0);
            await botBot.connect(owner).injectAI(0, ai.address);

            await ethers.provider.send("evm_increaseTime", [chatDur + 1]);
            await ethers.provider.send("evm_mine", []);
            await botBot.startVoting(0);

            const commitHash1 = ethers.solidityPackedKeccak256(["address", "string"], [ai.address, salt1]);
            const commitHash2 = ethers.solidityPackedKeccak256(["address", "string"], [p1.address, salt2]);
            await botBot.connect(p1).commitVote(0, commitHash1);
            await botBot.connect(p2).commitVote(0, commitHash2);

            await ethers.provider.send("evm_increaseTime", [voteDur + 1]);
            await ethers.provider.send("evm_mine", []);
            await botBot.startRevealing(0);

            await botBot.connect(p1).revealVote(0, ai.address, salt1);
            await botBot.connect(p2).revealVote(0, p1.address, salt2);

            await ethers.provider.send("evm_increaseTime", [revealDur + 1]);
            await ethers.provider.send("evm_mine", []);

            const messageHash = ethers.solidityPackedKeccak256(["string", "uint256", "address"], ["BOTBOT_AI_IDENTITY", 0, ai.address]);
            oracleSignature = await oracle.signMessage(ethers.getBytes(messageHash));
            
            // Sign with wrong wallet
            invalidSignature = await p3.signMessage(ethers.getBytes(messageHash));
        });

        it("Should reject invalid oracle signatures", async function () {
            await expect(botBot.resolveRoom(0, ai.address, invalidSignature)).to.be.revertedWith("Invalid Oracle signature");
        });

        it("Should reject if passed AI address doesn't match injected", async function () {
            const badMessageHash = ethers.solidityPackedKeccak256(["string", "uint256", "address"], ["BOTBOT_AI_IDENTITY", 0, p3.address]);
            const badSignature = await oracle.signMessage(ethers.getBytes(badMessageHash));
            await expect(botBot.resolveRoom(0, p3.address, badSignature)).to.be.revertedWith("AI address mismatch");
        });

        it("Should correctly distribute payouts to winners", async function () {
            const p1BalBefore = await botToken.balanceOf(p1.address);
            const p2BalBefore = await botToken.balanceOf(p2.address);

            await expect(botBot.resolveRoom(0, ai.address, oracleSignature))
                .to.emit(botBot, "RoomResolved").withArgs(0, [p1.address], ethers.parseEther("200"));

            const p1BalAfter = await botToken.balanceOf(p1.address);
            const p2BalAfter = await botToken.balanceOf(p2.address);

            expect(p1BalAfter - p1BalBefore).to.equal(ethers.parseEther("200")); // p1 guessed correct
            expect(p2BalAfter - p2BalBefore).to.equal(0n); // p2 guessed wrong
        });
        
        it("Should transfer pot to owner if no one wins", async function () {
            // New room where both fail
            await botBot.createRoom(0, stakeAmount, chatDur, voteDur, revealDur);
            await botBot.connect(p1).joinRoom(1);
            await botBot.connect(p2).joinRoom(1);
            await botBot.connect(owner).injectAI(1, ai.address);

            await ethers.provider.send("evm_increaseTime", [chatDur + 1]);
            await ethers.provider.send("evm_mine", []);
            await botBot.startVoting(1);
            
            const commitHashWrong1 = ethers.solidityPackedKeccak256(["address", "string"], [p2.address, salt1]);
            const commitHashWrong2 = ethers.solidityPackedKeccak256(["address", "string"], [p1.address, salt2]);
            await botBot.connect(p1).commitVote(1, commitHashWrong1);
            await botBot.connect(p2).commitVote(1, commitHashWrong2);

            await ethers.provider.send("evm_increaseTime", [voteDur + 1]);
            await ethers.provider.send("evm_mine", []);
            await botBot.startRevealing(1);

            await botBot.connect(p1).revealVote(1, p2.address, salt1);
            await botBot.connect(p2).revealVote(1, p1.address, salt2);

            await ethers.provider.send("evm_increaseTime", [revealDur + 1]);
            await ethers.provider.send("evm_mine", []);

            const messageHash1 = ethers.solidityPackedKeccak256(["string", "uint256", "address"], ["BOTBOT_AI_IDENTITY", 1, ai.address]);
            const sig1 = await oracle.signMessage(ethers.getBytes(messageHash1));

            const ownerBalBefore = await botToken.balanceOf(owner.address);
            
            await botBot.resolveRoom(1, ai.address, sig1);

            const ownerBalAfter = await botToken.balanceOf(owner.address);
            expect(ownerBalAfter - ownerBalBefore).to.equal(ethers.parseEther("200"));
        });
    });
});
