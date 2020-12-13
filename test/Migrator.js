const { expect } = require("chai");

const MOCK_ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const AETH_ADDRESS = "0x3a3A65aAb0dd2A17E3F1947bA16138cd37d08c04";
const AWETH_ADDRESS = "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e";
const AAAVE_ADDRESS = "0xFFC97d72E13E01096502Cb8Eb52dEe56f74DAD7B";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const AWTBC_ADDRESS = "0xFC4B8ED459e00e5400be803A9BB3954234FD50e3";
const STABLE_DEBT_DAI_ADDRESS = "0x778A13D3eeb110A4f7bb6529F99c000119a08E92";
const STABLE_DEBT_WETH_ADDRESS = "0x4e977830ba4bd783C0BB7F15d3e243f73FF57121";
const STABLE_DEBT_AAVE_ADDRESS = "0x079D6a3E844BcECf5720478A718Edb6575362C5f";
const ALEND_ADDRESS = "0x7D2D3688Df45Ce7C552E19c27e007673da9204B8"
const LENDING_POOL_CORE_ADDRESS = "0x3dfd23A6c5E8BbcFc9581d2E864a68feb6a076d3";
const LENDING_POOL_V1_ADDRESS = "0x398eC7346DcD622eDc5ae82352F02bE94C62d119";

const debtTokenAbi = [
   "function approveDelegation(address delegatee, uint256 amount) external",
   "function balanceOf(address account) public view returns (uint256)"
]

const tokenAbi = [
   "function approve(address spender, uint256 amount) external returns (bool)",
   "function balanceOf(address account) public view returns (uint256)"
]

const wEthAbi = [
   "function approve(address guy, uint wad) public returns (bool)",
   "function deposit() external payable",
   "function balanceOf(address arg1) public view returns (uint256)"
]

const lendingPoolV1Abi = [
   "function borrow(address _reserve, uint256 _amount, uint256 _interestRateMode, uint16 _referralCode) external"
]


describe("-----------Migrator contract (persistent) with ETH collateral and no borrows-----------", function () {
   let unlockedAddress;
   let signer;
   let Migrator;
   let migrator;
   let aEthBalanceBefore;
   let aEth;
   let aWEth;
   let dai;

   before(async function () {
      unlockedAddress = "0xF4F56fA0D045ae0e6Ba8f82e2C32887FE0B152Ea";
      await expect(hre.network.provider.request({
         method: "hardhat_impersonateAccount",
         params: [unlockedAddress]
      })).to.not.be.reverted;

      signer = await ethers.provider.getSigner(unlockedAddress);
      Migrator = await ethers.getContractFactory("Migrator");
      migrator = await Migrator.deploy();
      migrator = migrator.connect(signer);
   
      aEth = await new ethers.Contract(AETH_ADDRESS, tokenAbi, signer);
      debtDai = await new ethers.Contract(STABLE_DEBT_DAI_ADDRESS, debtTokenAbi, signer);
      wEth = await new ethers.Contract(WETH_ADDRESS, wEthAbi, signer);
      aWEth = await new ethers.Contract(AWETH_ADDRESS, tokenAbi, signer);
      dai = await new ethers.Contract(DAI_ADDRESS, tokenAbi, signer);
      lendingPoolV1 = await new ethers.Contract(LENDING_POOL_V1_ADDRESS, lendingPoolV1Abi, signer);

      console.log("Address unlocked.");
      console.log("DAI BEFORE: ", Number(await dai.balanceOf(unlockedAddress)));
      

   });

   it("Should approve migrator with aEth", async function () {
      this.timeout(60000);
      await expect(aEth.approve(migrator.address, "9999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
      console.log("aETH balance before: ", Number(await aEth.balanceOf(unlockedAddress)));
   });

   it("Should have >1 aETH v1", async function () {
      this.timeout(60000);
      aEthBalanceBefore = Number(await aEth.balanceOf(unlockedAddress));
      console.log("aETH balance before: ", aEthBalanceBefore);
      await expect(aEthBalanceBefore).to.be.greaterThan(1000000000000000000);
   });

   it("Should migrate to V2", async function () {
      this.timeout(60000);
      console.log(Number(await migrator.estimateGas.migrate([AETH_ADDRESS], [], [1])));
      await expect(migrator.migrate([AETH_ADDRESS], [], [1])).to.not.be.reverted;
   });

   it("Should have V2 awETH greater than V1 aETH", async function() {
      this.timeout(60000);
      const aWethBalance = Number(await aWEth.balanceOf(unlockedAddress));
      console.log("aWETH balance after: ", aWethBalance);
      console.log("aETH balance after: ", Number(await aEth.balanceOf(unlockedAddress)));
      await expect(aWethBalance).to.be.greaterThan(aEthBalanceBefore);
   });
});

describe("-----------Migrator contract (persistent) with ETH collateral borrowing DAI-----------", function () {
   let unlockedAddress;
   let signer;
   let Migrator;
   let migrator;
   let lendingPoolV1;
   let aEthBalanceBefore;
   let aEth;
   let wEth;
   let aWEth;
   let debtDai;
   let dai;

   before(async function () {
      unlockedAddress = "0xF4F56fA0D045ae0e6Ba8f82e2C32887FE0B152Ea";
      await expect(hre.network.provider.request({
         method: "hardhat_impersonateAccount",
         params: [unlockedAddress]
      })).to.not.be.reverted;

      signer = await ethers.provider.getSigner(unlockedAddress);
      Migrator = await ethers.getContractFactory("Migrator");
      migrator = await Migrator.deploy();
      migrator = migrator.connect(signer);
   
      aEth = await new ethers.Contract(AETH_ADDRESS, tokenAbi, signer);
      debtDai = await new ethers.Contract(STABLE_DEBT_DAI_ADDRESS, debtTokenAbi, signer);
      wEth = await new ethers.Contract(WETH_ADDRESS, wEthAbi, signer);
      aWEth = await new ethers.Contract(AWETH_ADDRESS, tokenAbi, signer);
      dai = await new ethers.Contract(DAI_ADDRESS, tokenAbi, signer);
      lendingPoolV1 = await new ethers.Contract(LENDING_POOL_V1_ADDRESS, lendingPoolV1Abi, signer);

      console.log("Address unlocked.");
      console.log("DAI BEFORE: ", Number(await dai.balanceOf(unlockedAddress)));
      

   });

   it("Should approve migrator with aEth", async function () {
      this.timeout(60000);
      await expect(aEth.approve(migrator.address, "9999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
      console.log("aETH balance before: ", Number(await aEth.balanceOf(unlockedAddress)));
   });

   it("Should approve migrator with DAI", async function () {
      this.timeout(60000);
      await expect(dai.approve(migrator.address, "9999999999999999999999999"))
      .to
      .not
      .be
      .reverted;
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
      console.log("DAI AFTER BORROW:", Number(await dai.balanceOf(unlockedAddress)));
   });

   it("Should deposit ETH into wETH", async function () {
      this.timeout(60000);
      await expect(wEth.deposit({value: "200000000000000000"})).to.not.be.reverted;
   });

   it("Should have 2e17 wETH", async function () {
      this.timeout(60000);
      await expect(Number(await wEth.balanceOf(unlockedAddress))).to.equal(200000000000000000);
   });

   it("Should have >1 aETH v1", async function () {
      this.timeout(60000);
      aEthBalanceBefore = Number(await aEth.balanceOf(unlockedAddress));
      console.log("aETH balance before: ", aEthBalanceBefore);
      await expect(aEthBalanceBefore).to.be.greaterThan(1000000000000000000);
   });

   it("Should migrate to V2", async function () {
      this.timeout(60000);
      console.log(Number(await migrator.estimateGas.migrate([AETH_ADDRESS], [DAI_ADDRESS], [1])));
      await expect(migrator.migrate([AETH_ADDRESS], [DAI_ADDRESS], [1])).to.not.be.reverted;
   });

   it("Should have V2 awETH greater than V1 aETH", async function() {
      this.timeout(60000);
      const aWethBalance = Number(await aWEth.balanceOf(unlockedAddress));
      console.log("aWETH balance after: ", aWethBalance);
      console.log("aETH balance after: ", Number(await aEth.balanceOf(unlockedAddress)));
      await expect(aWethBalance).to.be.greaterThan(aEthBalanceBefore);
      console.log("DebtDai balance:", Number(await debtDai.balanceOf(unlockedAddress)));
   });
});

describe("-----------Migrator contract (persistent) with aLEND balance borrowing DAI-----------", function () {
   let unlockedAddress;
   let signer;
   let Migrator;
   let migrator;
   let lendingPoolV1;
   let aAaveBalanceBefore;
   let aLend;
   let wEth;
   let debtDai;
   let dai;

   before(async function () {
      unlockedAddress = "0x4ca31D938Bc2D23e68eab871e5A0a02019F8dCE6";
      await expect(hre.network.provider.request({
         method: "hardhat_impersonateAccount",
         params: [unlockedAddress]
      })).to.not.be.reverted;

      signer = await ethers.provider.getSigner(unlockedAddress);
      Migrator = await ethers.getContractFactory("Migrator");
      migrator = await Migrator.deploy();
      migrator = migrator.connect(signer);
   
      aEth = await new ethers.Contract(AETH_ADDRESS, tokenAbi, signer);
      debtDai = await new ethers.Contract(STABLE_DEBT_DAI_ADDRESS, debtTokenAbi, signer);
      wEth = await new ethers.Contract(WETH_ADDRESS, wEthAbi, signer);
      aLend = await new ethers.Contract(ALEND_ADDRESS, tokenAbi, signer);
      aAave = await new ethers.Contract(AAAVE_ADDRESS, tokenAbi, signer);
      dai = await new ethers.Contract(DAI_ADDRESS, tokenAbi, signer);
      lendingPoolV1 = await new ethers.Contract(LENDING_POOL_V1_ADDRESS, lendingPoolV1Abi, signer);

      console.log("Address unlocked.");
      //console.log("DAI BEFORE: ", Number(await dai.balanceOf(unlockedAddress)));
      

   });

   it("Should approve migrator with aLEND", async function () {
      this.timeout(60000);
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

   it("Should deposit ETH into wETH", async function () {
      this.timeout(60000);
      await expect(wEth.deposit({value: "200000000000000000"})).to.not.be.reverted;
   });

   it("Should have 2e17 wETH", async function () {
      this.timeout(60000);
      await expect(Number(await wEth.balanceOf(unlockedAddress))).to.equal(200000000000000000);
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

describe("-----------Migrator contract (persistent) with ETH borrow-----------", function () {
   let unlockedAddress;
   let aWBTC;
   let signer;
   let Migrator;
   let migrator;
   let lendingPoolV1;
   let wEth;

   before(async function () {
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
      wEth = await new ethers.Contract(WETH_ADDRESS, wEthAbi, signer);
      aWEth = await new ethers.Contract(AWETH_ADDRESS, tokenAbi, signer);
      //dai = await new ethers.Contract(DAI_ADDRESS, tokenAbi, signer);
      lendingPoolV1 = await new ethers.Contract(LENDING_POOL_V1_ADDRESS, lendingPoolV1Abi, signer);

      console.log("Address unlocked.");
      console.log("ETH BEFORE:", Number(await ethers.provider.getBalance(unlockedAddress)));
      //console.log("DAI BEFORE: ", Number(await dai.balanceOf(unlockedAddress)));
   });

   it("Should approve migrator with aWBTC", async function () {
      console.log("aWBTC balance:", Number(await aWBTC.balanceOf(unlockedAddress)));
      console.log("Debt wETH balance:", Number(await debtWeth.balanceOf(unlockedAddress)));
      this.timeout(60000);
      await expect(aWBTC.approve(migrator.address, "9999999999999999999999999"))
         .to
         .not
         .be
         .reverted;
   });

   it("Should approve migrator with WETH", async function () {
      this.timeout(60000);
      await expect(wEth.approve(migrator.address, "9999999999999999999999999"))
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

   it("Should deposit 0.1 ETH into wETH", async function () {
      this.timeout(60000);
      await expect(wEth.deposit({value: "100000000000000000"})).to.not.be.reverted; // 2 WETH deposit
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
      console.log(Number(await migrator.estimateGas.migrate([AWTBC_ADDRESS], [WETH_ADDRESS], [1])));
      await expect(migrator.migrate([AWTBC_ADDRESS], [WETH_ADDRESS], [1])).to.not.be.reverted;
   });

   it("Should have no V1 aWBTC", async function() {
      this.timeout(60000);
      const aWBTCBalance = Number(await aWBTC.balanceOf(unlockedAddress));
      console.log("aWBTC V1 after:", aWBTCBalance);
      await expect(aWBTCBalance).to.be.greaterThan(0);
      console.log("Debt wETH balance:", Number(await debtWeth.balanceOf(unlockedAddress)));
   });
});