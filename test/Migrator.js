const { expect } = require("chai");
const { alchemyProjectId } = require("../secrets.json");

const MOCK_ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const AETH_ADDRESS = "0x3a3A65aAb0dd2A17E3F1947bA16138cd37d08c04";
const AWETH_ADDRESS = "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e";
const ADAI_V1_ADDRESS = "0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d";
const ADAI_V2_ADDRESS = "0x028171bCA77440897B824Ca71D1c56caC55b68A3";
const AAAVE_ADDRESS = "0xFFC97d72E13E01096502Cb8Eb52dEe56f74DAD7B";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const AWTBC_ADDRESS = "0xFC4B8ED459e00e5400be803A9BB3954234FD50e3";
const STABLE_DEBT_DAI_ADDRESS = "0x778A13D3eeb110A4f7bb6529F99c000119a08E92";
const STABLE_DEBT_WETH_ADDRESS = "0x4e977830ba4bd783C0BB7F15d3e243f73FF57121";
const ALEND_ADDRESS = "0x7D2D3688Df45Ce7C552E19c27e007673da9204B8"
const LENDING_POOL_V1_ADDRESS = "0x398eC7346DcD622eDc5ae82352F02bE94C62d119";
const LENDING_POOL_CORE_ADDRESS = "0x3dfd23A6c5E8BbcFc9581d2E864a68feb6a076d3";
const LENDING_POOL_V2_ADDRESS = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";


const debtTokenAbi = [
   "function approveDelegation(address delegatee, uint256 amount) external",
   "function balanceOf(address account) public view returns (uint256)"
]

const tokenAbi = [
   "function approve(address spender, uint256 amount) external returns (bool)",
   "function balanceOf(address account) public view returns (uint256)",
   "function transfer(address dst, uint256 wad) external returns (bool)" 
]

const wEthAbi = [
   "function approve(address guy, uint wad) public returns (bool)",
   "function deposit() external payable",
   "function balanceOf(address arg1) public view returns (uint256)"
]

const lendingPoolV1Abi = [
   "function borrow(address _reserve, uint256 _amount, uint256 _interestRateMode, uint16 _referralCode) external",
   "function deposit(address reserve, uint256 amount, uint16 referralCode) external payable"
]

const lendingPoolV2Abi = [
   "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
   "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
   "function flashLoan(address receiverAddress, address[] calldata assets, uint256[] calldata amounts, uint256[] calldata modes, address onBehalfOf, bytes calldata params, uint16 referralCode) external"
]

async function resetFork() {
   await network.provider.request({
      method: "hardhat_reset",
      params: [{
        forking: {
          jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${alchemyProjectId}`,
          blockNumber: 11449150
        }
      }]
   });
   console.log("    > Fork reset");

   await network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [1607922994]
   });

   console.log("    > Timestamp reset to 1607922994")
}

async function advanceTime() {
   await network.provider.request({
      method: "evm_increaseTime",
      params: [10]
   });
   console.log("    Time advanced")
   /*const tx = await network.provider.request({
      method: "eth_blockNumber",
      params: []
   });
   console.log("    Block Number: %s", Number(tx));*/

   
}

describe("-----------Migrator contract (clean room per test)-----------", function () {
   let signer;
   let Migrator;
   let migrator;
   let lendingPoolV2;

   beforeEach(async function () {
      await resetFork();
      await advanceTime();
      [signer, addr1, addr2, ...addrs] = await ethers.getSigners();
      Migrator = await ethers.getContractFactory("Migrator");
      migrator = await Migrator.deploy();
   
      aEth = await new ethers.Contract(AETH_ADDRESS, tokenAbi, signer);
      debtDai = await new ethers.Contract(STABLE_DEBT_DAI_ADDRESS, debtTokenAbi, signer);
      WETH = await new ethers.Contract(WETH_ADDRESS, wEthAbi, signer);
      aWETH = await new ethers.Contract(AWETH_ADDRESS, tokenAbi, signer);
      dai = await new ethers.Contract(DAI_ADDRESS, tokenAbi, signer);
      lendingPoolV2 = await new ethers.Contract(LENDING_POOL_V2_ADDRESS, lendingPoolV2Abi, signer);

   });

   it("Should not be able to migrate with 0 collateral", async function () {
      this.timeout(60000);
      await expect(migrator.migrate([],[],[])).to.be.revertedWith("Migrator: Empty aToken array");
   });

   it("Should not be able to call executeOperation directly", async function () {
      this.timeout(60000);
      console.log("Signer address:", signer.address);
      await expect(migrator.executeOperation([],[],[], signer.address, []))
         .to
         .be
         .revertedWith("Migrator: Not the lendingPool");
   });

   it("Should not be able to flash loan to the migrator without calling migrate", async function () {
      this.timeout(60000);
      await expect(lendingPoolV2.flashLoan(
         migrator.address,
         [DAI_ADDRESS],
         ["99999"],
         [0],
         migrator.address,
         [],
         0
      )).to.be.revertedWith("Migrator: Invalid caller");
   });

   it("Should not be able to send an empty flash loan to the migrator without calling migrate", async function () {
      this.timeout(60000);
      await expect(lendingPoolV2.flashLoan(
         migrator.address,
         [],
         [],
         [0],
         migrator.address,
         0x123f5,
         0
      )).to.be.revertedWith("Migrator: Invalid caller");
   });
});

describe("-----------Migrator contract (persistent) with ETH collateral and no borrows-----------", function () {
   let signer;
   let Migrator;
   let migrator;
   let lendingPoolV1;
   let lendingPoolV2;
   let aEthBalanceBefore;
   let aEth;
   let aWETH;

   beforeEach(async function () {
      await advanceTime();
   });

   before(async function () {
      this.timeout(60000);
      await resetFork();
      [signer, addr1, ...etc] = await ethers.getSigners();

      Migrator = await ethers.getContractFactory("Migrator");
      migrator = await Migrator.deploy();
   
      aEth = await new ethers.Contract(AETH_ADDRESS, tokenAbi, signer);
      WETH = await new ethers.Contract(WETH_ADDRESS, wEthAbi, signer);
      aWETH = await new ethers.Contract(AWETH_ADDRESS, tokenAbi, signer);
      lendingPoolV1 = await new ethers.Contract(LENDING_POOL_V1_ADDRESS, lendingPoolV1Abi, signer);
      lendingPoolV2 = await new ethers.Contract(LENDING_POOL_V2_ADDRESS, lendingPoolV2Abi, signer);
   });

   
   it("Should be able to pause the contract", async function () {
      this.timeout(60000);
      await expect(migrator.pause()).to.not.be.reverted;
   });

   it("Should deposit 10 ETH into aETH on V1", async function () {
      this.timeout(60000);
      await expect(lendingPoolV1.deposit(MOCK_ETH_ADDRESS, "10000000000000000000", 0, { value: "10000000000000000000" }))
         .to
         .not
         .be
         .reverted;      
   });

   it("Should approve migrator with aEth", async function () {
      this.timeout(60000);
      await expect(aEth.approve(migrator.address, "9999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
      console.log("aETH balance before: ", Number(await aEth.balanceOf(signer.address)));
   });

   it("Should have >1 aETH v1", async function () {
      this.timeout(60000);
      aEthBalanceBefore = Number(await aEth.balanceOf(signer.address));
      console.log("aETH balance before: ", aEthBalanceBefore);
      await expect(aEthBalanceBefore).to.be.greaterThan(1000000000000000000);
   });

   it("Should not be able to migrate to V2 while paused", async function () {
      this.timeout(60000);
      await expect(migrator.migrate([AETH_ADDRESS], [], [1])).to.be.revertedWith("Pausable: paused");
   });

   it("Should transfer pauser role to addr1", async function () {
      this.timeout(60000);
      await expect(migrator.transferPauser(addr1.address)).to.not.be.reverted;
   });

   it("Should unpause as addr1", async function () {
      this.timeout(60000);
      await expect(migrator.connect(addr1).unpause()).to.not.be.reverted;
   });

   it("Should migrate to V2", async function () {
      this.timeout(60000);
      console.log(Number(await migrator.estimateGas.migrate([AETH_ADDRESS], [], [1])));
      await expect(migrator.migrate([AETH_ADDRESS], [], [1])).to.not.be.reverted;
   });

   it("Should have V2 awETH greater than V1 aETH", async function() {
      this.timeout(60000);
      const aWethBalance = Number(await aWETH.balanceOf(signer.address));
      console.log("aWETH balance after: ", aWethBalance);
      console.log("aETH balance after: ", Number(await aEth.balanceOf(signer.address)));
      await expect(aWethBalance).to.be.greaterThan(aEthBalanceBefore);
   });

   it("Should not be able to flash loan to the migrator without calling migrate", async function () {
      this.timeout(60000);
      await expect(lendingPoolV2.flashLoan(
         migrator.address,
         [DAI_ADDRESS],
         ["99999"],
         [0],
         migrator.address,
         [],
         0
      )).to.be.revertedWith("Migrator: Invalid caller");
   });
});

describe("-----------Migrator contract (persistent) with ETH collateral borrowing DAI-----------", function () {
   let signer;
   let Migrator;
   let migrator;
   let lendingPoolV1;
   let lendingPoolV2;
   let aEthBalanceBefore;
   let aEth;
   let aWETH;
   let debtDai;
   let dai;

   beforeEach(async function () {
      await advanceTime();
   });

   before(async function () {
      this.timeout(60000);
      await resetFork();
      [signer, addr1, ...etc] = await ethers.getSigners();
      Migrator = await ethers.getContractFactory("Migrator");
      migrator = await Migrator.deploy();
   
      aEth = await new ethers.Contract(AETH_ADDRESS, tokenAbi, signer);
      debtDai = await new ethers.Contract(STABLE_DEBT_DAI_ADDRESS, debtTokenAbi, signer);
      aWETH = await new ethers.Contract(AWETH_ADDRESS, tokenAbi, signer);
      dai = await new ethers.Contract(DAI_ADDRESS, tokenAbi, signer);
      lendingPoolV1 = await new ethers.Contract(LENDING_POOL_V1_ADDRESS, lendingPoolV1Abi, signer);
      lendingPoolV2 = await new ethers.Contract(LENDING_POOL_V2_ADDRESS, lendingPoolV2Abi, signer);
      console.log("DAI BEFORE: ", Number(await dai.balanceOf(signer.address)));
   });

   it("Should deposit 10 ETH into aETH on V1", async function () {
      this.timeout(60000);
      await expect(lendingPoolV1.deposit(MOCK_ETH_ADDRESS, "10000000000000000000", "0", { value: "10000000000000000000" }))
         .to
         .not
         .be
         .reverted;   
   });

   it("Should approve migrator with aEth", async function () {
      this.timeout(60000);
      await expect(aEth.approve(migrator.address, "9999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
      console.log("aETH balance before: ", Number(await aEth.balanceOf(signer.address)));
   });


   it("Should delegate debtDai credit", async function () {
      this.timeout(60000);
      await expect(debtDai.approveDelegation(migrator.address, "999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should borrow 10 DAI on V1", async function () {
      this.timeout(60000);
      await expect(lendingPoolV1.borrow(DAI_ADDRESS, "10000000000000000000", "1", "0"))
         .to
         .not
         .be
         .reverted;
      console.log("DAI AFTER BORROW:", Number(await dai.balanceOf(signer.address)));
   });

   it("Should have >1 aETH v1", async function () {
      this.timeout(60000);
      aEthBalanceBefore = Number(await aEth.balanceOf(signer.address));
      console.log("aETH balance before: ", aEthBalanceBefore);
      await expect(aEthBalanceBefore).to.be.greaterThan(1000000000000000000);
   });

   it("Should be able to pause the contract", async function () {
      this.timeout(60000);
      await expect(migrator.pause()).to.not.be.reverted;
   });

   it("Should not be able migrate while paused", async function () {
      this.timeout(60000);
      await expect(migrator.migrate([AETH_ADDRESS], [DAI_ADDRESS], [1])).to.be.revertedWith("Pausable: paused");
   });

   it("Should transfer pauser role to addr1", async function () {
      this.timeout(60000);
      await expect(migrator.transferPauser(addr1.address)).to.not.be.reverted;
   });

   it("Should unpause as addr1", async function () {
      this.timeout(60000);
      await expect(migrator.connect(addr1).unpause()).to.not.be.reverted;
   });

   it("Should not be able to migrate to V2 with rate mode 0", async function () {
      this.timeout(60000);
      console.log(Number(await migrator.estimateGas.migrate([AETH_ADDRESS], [DAI_ADDRESS], [1])));
      await expect(migrator.migrate([AETH_ADDRESS], [DAI_ADDRESS], [0])).to.be.revertedWith("SafeERC20: low-level call failed");
   });

   it("Should migrate to V2", async function () {
      this.timeout(60000);
      console.log(Number(await migrator.estimateGas.migrate([AETH_ADDRESS], [DAI_ADDRESS], [1])));
      await expect(migrator.migrate([AETH_ADDRESS], [DAI_ADDRESS], [1])).to.not.be.reverted;
   });

   it("Should have V2 awETH greater than V1 aETH", async function() {
      this.timeout(60000);
      const aWethBalance = Number(await aWETH.balanceOf(signer.address));
      console.log("aWETH balance after: ", aWethBalance);
      console.log("aETH balance after: ", Number(await aEth.balanceOf(signer.address)));
      await expect(aWethBalance).to.be.greaterThan(aEthBalanceBefore);
      console.log("DebtDai balance:", Number(await debtDai.balanceOf(signer.address)));
   });

   it("Should not be able to flash loan to the migrator without calling migrate", async function () {
      this.timeout(60000);
      await expect(lendingPoolV2.flashLoan(
         migrator.address,
         [DAI_ADDRESS],
         ["99999"],
         [0],
         migrator.address,
         [],
         0
      )).to.be.revertedWith("Migrator: Invalid caller");
   });
});

describe("-----------Migrator contract (persistent) migrating V2 loan deposited in V1", function () {
   let signer;
   let Migrator;
   let migrator;
   let lendingPoolV1;
   let lendingPoolV2;
   let WETH;
   let aWETH;
   let dai;
   let aDaiV1;
   let aDaiV2;

   beforeEach(async function () {
      await advanceTime();
   });

   before(async function () {
      this.timeout(60000);
      await resetFork();
      [signer, addr1, ...etc] = await ethers.getSigners();
      Migrator = await ethers.getContractFactory("Migrator");
      migrator = await Migrator.deploy();
   
      aEth = await new ethers.Contract(AETH_ADDRESS, tokenAbi, signer);
      debtDai = await new ethers.Contract(STABLE_DEBT_DAI_ADDRESS, debtTokenAbi, signer);
      WETH = await new ethers.Contract(WETH_ADDRESS, wEthAbi, signer);
      aWETH = await new ethers.Contract(AWETH_ADDRESS, tokenAbi, signer);
      dai = await new ethers.Contract(DAI_ADDRESS, tokenAbi, signer);
      lendingPoolV1 = await new ethers.Contract(LENDING_POOL_V1_ADDRESS, lendingPoolV1Abi, signer);
      lendingPoolV2 = await new ethers.Contract(LENDING_POOL_V2_ADDRESS, lendingPoolV2Abi, signer);
      aDaiV1 = await new ethers.Contract(ADAI_V1_ADDRESS, tokenAbi, signer);
      aDaiV2 = await new ethers.Contract(ADAI_V2_ADDRESS, tokenAbi, signer);
   });

   it("Should deposit 10 WETH", async function () {
      this.timeout(60000);
      await expect(WETH.deposit({value: "10000000000000000000"})).to.not.be.reverted;
      console.log("WETH balance:", Number(await WETH.balanceOf(signer.address)));
   });

   it("Should approve the V2 lendingPool with WETH", async function () {
      this.timeout(60000);
      await expect(WETH.approve(LENDING_POOL_V2_ADDRESS, "999999999999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should deposit 10 WETH into aWETH", async function () {
      this.timeout(60000);
      console.log("aWETH balance:", Number(await aWETH.balanceOf(signer.address)));
      await expect(lendingPoolV2.deposit(WETH_ADDRESS, "10000000000000000000", signer.address, "0"))
         .to
         .not
         .be
         .reverted;
      console.log("aWETH balance:", Number(await aWETH.balanceOf(signer.address)));
   })

   it("Should borrow 100 DAI on V2", async function () {
      this.timeout(60000);
      console.log("DAI before:", Number(await dai.balanceOf(signer.address)));
      await expect(lendingPoolV2.borrow(DAI_ADDRESS, "100000000000000000000", "1", "0", signer.address))
         .to
         .not
         .be
         .reverted;
      console.log("DAI after:", Number(await dai.balanceOf(signer.address)));
   });

   it("Should approve V1 lendingPoolCore with 100 DAI", async function () {
      this.timeout(60000);
      await expect(dai.approve(LENDING_POOL_CORE_ADDRESS, "100000000000000000000"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should deposit 100 DAI into V1 aDAI", async function () {
      this.timeout(60000);
      await expect(lendingPoolV1.deposit(DAI_ADDRESS, "100000000000000000000", "0"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should approve the migrator with V1 aDAI", async function () {
      this.timeout(60000);
      await expect(aDaiV1.approve(migrator.address, "99999999999999999999999999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should be able to migrate", async function () {
      this.timeout(60000);
      console.log("aDAI V2 balance before (should be 0):", Number(await aDaiV2.balanceOf(signer.address)));
      await expect(migrator.migrate([ADAI_V1_ADDRESS], [], [1])).to.not.be.reverted;
      console.log("aDAI V2 balance after (should be 100):", Number(await aDaiV2.balanceOf(signer.address)));
   });

   it("Should not be able to flash loan to the migrator without calling migrate", async function () {
      this.timeout(60000);
      await expect(lendingPoolV2.flashLoan(
         migrator.address,
         [DAI_ADDRESS],
         ["99999"],
         [0],
         migrator.address,
         [],
         0
      )).to.be.revertedWith("Migrator: Invalid caller");
   });
});

describe("-----------Migrator contract (persistent) migrating V1 loan deposited in V2", function () {
   let signer;
   let Migrator;
   let migrator;
   let lendingPoolV1;
   let lendingPoolV2;
   let dai;
   let aDaiV2;
   let debtDai;

   before(async function () {
      await resetFork();
      [signer, addr1, ...etc] = await ethers.getSigners();
      Migrator = await ethers.getContractFactory("Migrator");
      migrator = await Migrator.deploy();

      aDaiV2 = await new ethers.Contract(ADAI_V2_ADDRESS, tokenAbi, signer);
      debtDai = await new ethers.Contract(STABLE_DEBT_DAI_ADDRESS, debtTokenAbi, signer);
      dai = await new ethers.Contract(DAI_ADDRESS, tokenAbi, signer);
      lendingPoolV1 = await new ethers.Contract(LENDING_POOL_V1_ADDRESS, lendingPoolV1Abi, signer);
      lendingPoolV2 = await new ethers.Contract(LENDING_POOL_V2_ADDRESS, lendingPoolV2Abi, signer);
   });

   it("Should deposit 10 ETH into aETH on V1", async function () {
      await expect(lendingPoolV1.deposit(MOCK_ETH_ADDRESS, "10000000000000000000", 0, { value: "10000000000000000000" }))
         .to
         .not
         .be
         .reverted;
         
   });

   it("Should approve migrator with aEth", async function () {
      this.timeout(60000);
      await expect(aEth.approve(migrator.address, "9999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
      console.log("aETH balance before: ", Number(await aEth.balanceOf(signer.address)));
   });

   it("Should borrow 100 DAI on V1", async function () {
      this.timeout(60000);
      await expect(lendingPoolV1.borrow(DAI_ADDRESS, "100000000000000000000", "1", "0"))
         .to
         .not
         .be
         .reverted;
      console.log("DAI AFTER BORROW:", Number(await dai.balanceOf(signer.address)));
   });

   it("Should delegate debtDai credit to the migrator", async function () {
      this.timeout(60000);
      await expect(debtDai.approveDelegation(migrator.address, "999999999999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should approve the V2 lendingPool with DAI", async function () {
      this.timeout(60000);
      await expect(dai.approve(LENDING_POOL_V2_ADDRESS, "999999999999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should deposit 100 DAI into V2 aDAI", async function () {
      this.timeout(60000);
      console.log("aDAI V2 balance before deposit (should be 0):", Number(await aDaiV2.balanceOf(signer.address)));
      await expect(lendingPoolV2.deposit(DAI_ADDRESS, "10000000000000000000", signer.address, "0"))
         .to
         .not
         .be
         .reverted;
      console.log("aDAI V2 balance after (should be 100):", Number(await aDaiV2.balanceOf(signer.address)));
   });

   it("Should migrate to V2", async function () {
      this.timeout(60000);
      console.log("Migration gas:", Number(await migrator.estimateGas.migrate([AETH_ADDRESS], [DAI_ADDRESS], [1])));
      await expect(migrator.migrate([AETH_ADDRESS], [DAI_ADDRESS], [1])).to.not.be.reverted;
   });

   it("Should not be able to flash loan to the migrator without calling migrate", async function () {
      this.timeout(60000);
      await expect(lendingPoolV2.flashLoan(
         migrator.address,
         [DAI_ADDRESS],
         ["99999"],
         [0],
         migrator.address,
         [],
         0
      )).to.be.revertedWith("Migrator: Invalid caller");
   });
});

describe("-----------Migrator contract (persistent) with aLEND balance and DAI borrow (impersonation)-----------", function () {
   let unlockedAddress;
   let signer;
   let Migrator;
   let migrator;
   let lendingPoolV1;
   let aAaveBalanceBefore;
   let aLend;
   let WETH;
   let debtDai;
   let dai;

   beforeEach(async function () {
      await advanceTime();
   });

   before(async function () {
      await resetFork();
      unlockedAddress = "0x4ca31D938Bc2D23e68eab871e5A0a02019F8dCE6";
      await expect(hre.network.provider.request({
         method: "hardhat_impersonateAccount",
         params: [unlockedAddress]
      })).to.not.be.reverted;

      signer = await ethers.provider.getSigner(unlockedAddress);
      [addr1, ...addrs] = await ethers.getSigners();
      Migrator = await ethers.getContractFactory("Migrator");
      migrator = await Migrator.deploy();
      migrator = migrator.connect(signer);
   
      aEth = await new ethers.Contract(AETH_ADDRESS, tokenAbi, signer);
      debtDai = await new ethers.Contract(STABLE_DEBT_DAI_ADDRESS, debtTokenAbi, signer);
      WETH = await new ethers.Contract(WETH_ADDRESS, wEthAbi, signer);
      aLend = await new ethers.Contract(ALEND_ADDRESS, tokenAbi, signer);
      aAave = await new ethers.Contract(AAAVE_ADDRESS, tokenAbi, signer);
      dai = await new ethers.Contract(DAI_ADDRESS, tokenAbi, signer);
      lendingPoolV1 = await new ethers.Contract(LENDING_POOL_V1_ADDRESS, lendingPoolV1Abi, signer);
      lendingPoolV2 = await new ethers.Contract(LENDING_POOL_V2_ADDRESS, lendingPoolV2Abi, signer);

      console.log("Address unlocked.");
   });

   it("Should approve migrator with aLEND", async function () {
      this.timeout(60000);
      console.log("aLEND balance:", Number(await aLend.balanceOf(unlockedAddress)));
      await expect(aLend.approve(migrator.address, "9999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should approve migrator with DAI", async function () {
      this.timeout(60000);
      await expect(dai.approve(migrator.address, "9999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should delegate debtDAI credit", async function () {
      this.timeout(60000);
      await expect(debtDai.approveDelegation(migrator.address, "999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should borrow 10 DAI on V1", async function () {
      this.timeout(60000);
      await expect(lendingPoolV1.borrow(DAI_ADDRESS, "10000000000000000000", "1", "0"))
         .to
         .not
         .be
         .reverted;
         
      console.log("DAI AFTER BORROW:", Number(await dai.balanceOf(unlockedAddress)));
   });

   it("Should deposit ETH into WETH", async function () {
      this.timeout(60000);
      await expect(WETH.deposit({value: "200000000000000000"})).to.not.be.reverted;
   });

   it("Should have 2e17 WETH", async function () {
      this.timeout(60000);
      await expect(Number(await WETH.balanceOf(unlockedAddress))).to.equal(200000000000000000);
   });

   it("Should migrate to V2", async function () {
      this.timeout(60000);
      aAaveBalanceBefore = Number(await aAave.balanceOf(unlockedAddress));
      console.log(Number(await migrator.estimateGas.migrate([ALEND_ADDRESS], [DAI_ADDRESS], [1])));
      await expect(migrator.migrate([ALEND_ADDRESS], [DAI_ADDRESS], [1])).to.not.be.reverted;
   });

   it("Should have V2 aAAVE greater than V1 aAAVE", async function() {
      this.timeout(60000);
      const aAaveBalance = Number(await aAave.balanceOf(unlockedAddress));
      console.log("aAAVE after: ", aAaveBalance);
      await expect(aAaveBalance).to.be.greaterThan(aAaveBalanceBefore);
      console.log("Debt DAI balance:", Number(await debtDai.balanceOf(unlockedAddress)));
   });
});

describe("-----------Migrator contract (persistent) with ETH borrow (impersonation)-----------", function () {
   let unlockedAddress;
   let aWBTC;
   let signer;
   let Migrator;
   let migrator;
   let lendingPoolV1;
   let lendingPoolV2;
   let WETH;

   beforeEach(async function () {
      await advanceTime();
   });

   before(async function () {
      await resetFork();
      unlockedAddress = "0xd4f8a1BbEe54C1533CF0ef8C6f877ADa4dADcA1B";
      await expect(hre.network.provider.request({
         method: "hardhat_impersonateAccount",
         params: [unlockedAddress]
      })).to.not.be.reverted;

      signer = await ethers.provider.getSigner(unlockedAddress);
      Migrator = await ethers.getContractFactory("Migrator");
      migrator = await Migrator.deploy();
      migrator = migrator.connect(signer);
   
      aWBTC = await new ethers.Contract(AWTBC_ADDRESS, tokenAbi, signer);
      debtWeth = await new ethers.Contract(STABLE_DEBT_WETH_ADDRESS, debtTokenAbi, signer);
      WETH = await new ethers.Contract(WETH_ADDRESS, wEthAbi, signer);
      aWETH = await new ethers.Contract(AWETH_ADDRESS, tokenAbi, signer);
      lendingPoolV1 = await new ethers.Contract(LENDING_POOL_V1_ADDRESS, lendingPoolV1Abi, signer);
      lendingPoolV2 = await new ethers.Contract(LENDING_POOL_V2_ADDRESS, lendingPoolV2Abi, signer);
      console.log("Address unlocked.");
      console.log("ETH BEFORE:", Number(await ethers.provider.getBalance(unlockedAddress)));
   });

   it("Should approve migrator with aWBTC", async function () {
      this.timeout(60000);
      console.log("aWBTC balance:", Number(await aWBTC.balanceOf(unlockedAddress)));
      console.log("Debt WETH balance:", Number(await debtWeth.balanceOf(unlockedAddress)));
      this.timeout(60000);
      await expect(aWBTC.approve(migrator.address, "9999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should approve migrator with WETH", async function () {
      this.timeout(60000);
      await expect(WETH.approve(migrator.address, "9999999999999999999999999"))
      .to
      .not
      .be
      .reverted;
   });

   it("Should delegate debtWeth credit", async function () {
      this.timeout(60000);
      await expect(debtWeth.approveDelegation(migrator.address, "999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   })

   it("Should deposit 0.1 ETH into WETH", async function () {
      this.timeout(60000);
      await expect(WETH.deposit({value: "100000000000000000"})).to.not.be.reverted; // 2 WETH deposit
      console.log("ETH AFTER WETH DEPOSIT:", Number(await ethers.provider.getBalance(unlockedAddress)));
   });

   it("Should borrow 1 ETH on V1", async function () {
      this.timeout(60000);
      await expect(lendingPoolV1.borrow(MOCK_ETH_ADDRESS, "1000000000000000000", "1", "0"))
         .to
         .not
         .be
         .reverted;
         
      console.log("ETH AFTER BORROW:", Number(await ethers.provider.getBalance(unlockedAddress)));
   });

   it("Should migrate to V2", async function () {
      this.timeout(60000);
      console.log("Migration gas estiamtion: ", Number(await migrator.estimateGas.migrate([AWTBC_ADDRESS], [WETH_ADDRESS], [1])));
      await expect(migrator.migrate([AWTBC_ADDRESS], [WETH_ADDRESS], [1])).to.not.be.reverted;
   });

   it("Should have no V1 aWBTC", async function() {
      this.timeout(60000);
      const aWBTCBalance = Number(await aWBTC.balanceOf(unlockedAddress));
      console.log("aWBTC V1 after:", aWBTCBalance);
      await expect(aWBTCBalance).to.equal(0);
      console.log("Debt WETH balance:", Number(await debtWeth.balanceOf(unlockedAddress)));
   });

   it("Should not be able to flash loan to the migrator without calling migrate", async function () {
      this.timeout(60000);
      await expect(lendingPoolV2.flashLoan(
         migrator.address,
         [DAI_ADDRESS],
         ["99999"],
         [0],
         migrator.address,
         [],
         0
      )).to.be.revertedWith("Migrator: Invalid caller");
   });
});