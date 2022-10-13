import { ethers, deployments, network } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";
import { decodeLogs, addABI } from "abi-decoder";
import { getAddress, parseEther, parseUnits } from "ethers/lib/utils";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { DecodedLogType, Order, OrderParams } from "../../../helpers/type";
import {
  Vault,
  OptyFiOracle,
  IOps__factory,
  ITaskTreasury,
  ITaskTreasury__factory,
  ILimitOrder__factory,
  IUniswapV2Router02,
  IUniswapV2Router02__factory,
  OptyFiOracle__factory,
  Vault__factory,
  ISwapRouter,
  ISwapRouter__factory,
  LimitOrder__factory,
  ERC20Permit__factory,
  ERC20__factory,
  Registry__factory,
  StrategyProvider__factory,
  LimitOrder,
  StrategyProvider,
  ERC20Permit,
  ERC20,
  Registry,
} from "../../../typechain";
import { Signers } from "../../../helpers/utils";
import { eEVMNetwork, NETWORKS_CHAIN_ID, NETWORKS_CHAIN_ID_HEX } from "../../../helper-hardhat-config";
import { convertOrderParamsToOrder } from "../../../helpers/utils";
import { generateTokenHashV2 } from "../../../helpers/helpers";
import { StrategiesByTokenByChain, vaultConfigRP2 } from "../../../helpers/data/adapter-with-strategies";
import { getPermitSignature, setTokenBalanceInStorage } from "../../test-opty/utils";

addABI(ILimitOrder__factory.abi);
addABI(IOps__factory.abi);

const fork = process.env.FORK as eEVMNetwork;

export function describeBehaviorOfLimitOrderActions(_skips?: string[]): void {
  //Tokens
  const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  //Contracts
  const UniswapV2Router02Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; //mainnet
  const UniswapV3RouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; //mainnet
  const Gelato_Network = "0x3CACa7b48D0573D793d3b0279b5F0029180E83b6"; // mainnet
  const Gelato_Pokeme = "0xB3f5503f93d5Ef84b06993a1975B9D21B962892F"; // mainnet
  const Gelato_Task_Treasury = "0x2807B4aE232b624023f87d0e237A3B1bf200Fd99"; // mainnet

  //Params
  let expirationNum = 1657190461 + 120; //unix timestamp of block 15095000 + 120s
  let expiration = BigNumber.from(expirationNum.toString());
  let newExpiration = expiration.add(BigNumber.from("120"));

  const uniV3SwapPath = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [
      ethereumTokens.REWARD_TOKENS.AAVE,
      3000,
      ethereumTokens.WRAPPED_TOKENS.WETH,
      500,
      ethereumTokens.PLAIN_TOKENS.USDC,
    ],
  );

  let orderParams: OrderParams;
  let orderParamsUniV3: OrderParams;
  let failedOrderParams: OrderParams;
  let modifyOrderParams: OrderParams;

  const liquidationFeeBP = ethers.utils.parseEther("0.02");
  const BASIS = ethers.utils.parseEther("1.0");

  before(async function () {
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.admin = signers[1];
    this.signers.alice = signers[3];
    this.signers.bob = signers[4];
    this.signers.eve = signers[10];
    this.signers.gelatoNetworkSigner = await ethers.getSigner(Gelato_Network);
    const aaveInvestVaultAddress = (await deployments.get("opAAVE-Invst")).address;
    const usdcSaveVaultAddress = (await deployments.get("opUSDC-Save")).address;
    this.opAAVEInvst = <Vault>await ethers.getContractAt(Vault__factory.abi, aaveInvestVaultAddress);
    this.opUSDCSave = <Vault>await ethers.getContractAt(Vault__factory.abi, usdcSaveVaultAddress);
    this.usdc = <ERC20Permit>await ethers.getContractAt(ERC20Permit__factory.abi, ethereumTokens.PLAIN_TOKENS.USDC);
    this.aave = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.REWARD_TOKENS.AAVE);
    this.uniV2Router = <IUniswapV2Router02>(
      await ethers.getContractAt(IUniswapV2Router02__factory.abi, UniswapV2Router02Address)
    );
    this.uniV3Router = <ISwapRouter>await ethers.getContractAt(ISwapRouter__factory.abi, UniswapV3RouterAddress);
    this.gelatoOps = await ethers.getContractAt(IOps__factory.abi, Gelato_Pokeme);
    this.gelatoTaskTreasury = <ITaskTreasury>(
      await ethers.getContractAt(ITaskTreasury__factory.abi, Gelato_Task_Treasury)
    );
    this.limitOrder = <LimitOrder>(
      await ethers.getContractAt(LimitOrder__factory.abi, (await deployments.get("LimitOrder")).address)
    );
    this.registry = <Registry>(
      await ethers.getContractAt(Registry__factory.abi, (await deployments.get("RegistryProxy")).address)
    );
    this.signers.strategyOperator = await ethers.getSigner(await this.registry.strategyOperator());
    this.signers.governance = await ethers.getSigner(await this.registry.governance());
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(StrategyProvider__factory.abi, (await deployments.get("StrategyProvider")).address)
    );

    // opAAVE-Invst vault
    let steps = StrategiesByTokenByChain[NETWORKS_CHAIN_ID[fork]]["Invest"]["AAVE"][
      "aave-DEPOSIT-Compound-cAAVE"
    ].strategy.map(item => ({
      pool: item.contract,
      outputToken: item.outputToken,
      isBorrow: item.isBorrow,
    }));
    let tx = await this.strategyProvider
      .connect(this.signers.strategyOperator)
      .setBestStrategy(
        "2",
        generateTokenHashV2([ethereumTokens.REWARD_TOKENS.AAVE], NETWORKS_CHAIN_ID_HEX[fork]),
        steps,
      );
    await tx.wait(1);
    await setTokenBalanceInStorage(this.aave, this.signers.alice.address, "200");
    tx = await this.aave.connect(this.signers.alice).approve(this.opAAVEInvst.address, parseEther("100"));
    await tx.wait(1);
    tx = await this.opAAVEInvst.connect(this.signers.governance).setVaultConfiguration(vaultConfigRP2);
    await tx.wait(1);
    tx = await this.opAAVEInvst
      .connect(this.signers.alice)
      .userDepositVault(this.signers.alice.address, parseEther("100"), 0, "0x", []);
    await tx.wait(1);
    tx = await this.opAAVEInvst.connect(this.signers.alice).rebalance();
    await tx.wait(1);
    // opUSDC-Save vault
    steps = StrategiesByTokenByChain[NETWORKS_CHAIN_ID[fork]]["Save"]["USDC"][
      "usdc-DEPOSIT-Compound-cUSDC"
    ].strategy.map(item => ({
      pool: item.contract,
      outputToken: item.outputToken,
      isBorrow: item.isBorrow,
    }));
    tx = await this.strategyProvider
      .connect(this.signers.strategyOperator)
      .setBestStrategy(
        "0",
        generateTokenHashV2([ethereumTokens.PLAIN_TOKENS.USDC], NETWORKS_CHAIN_ID_HEX[fork]),
        steps,
      );
    await tx.wait(1);
    await setTokenBalanceInStorage(this.usdc, this.signers.bob.address, "100");
    tx = await this.usdc.connect(this.signers.bob).approve(this.opUSDCSave.address, parseUnits("100", 6));
    await tx.wait(1);
    tx = await this.opUSDCSave
      .connect(this.signers.bob)
      .userDepositVault(this.signers.bob.address, parseUnits("100", 6), 0, "0x", []);
    await tx.wait(1);
    await this.opUSDCSave.connect(this.signers.bob).rebalance();
    await tx.wait(1);

    expirationNum = (await ethers.provider.getBlock("latest")).timestamp;
    expiration = BigNumber.from(expirationNum.toString());
    newExpiration = expiration.add(BigNumber.from("120"));

    this.optyfiOracle = <OptyFiOracle>(
      await ethers.getContractAt(OptyFiOracle__factory.abi, (await deployments.get("OptyFiOracle")).address)
    );
    const aavePriceInUSD = await this.optyfiOracle.getTokenPrice(this.aave.address, await this.limitOrder.USD());

    orderParams = {
      liquidationAmountVT: ethers.BigNumber.from("0"),
      expectedOutputUT: BigNumber.from("0"),
      expiration: expiration,
      upperBound: aavePriceInUSD.add(parseEther("7")),
      lowerBound: aavePriceInUSD.sub(parseEther("1")),
      direction: ethers.constants.One,
      returnLimitUT: ethers.utils.parseEther("99"),
      expectedOutputVT: BigNumber.from("0"),
      stablecoinVault: this.opUSDCSave.address,
      vault: this.opAAVEInvst.address,
      dexRouter: UniswapV2Router02Address,
      uniV3Path: "0x",
      permitParams: "0x",
      uniV2Path: [getAddress(this.aave.address), getAddress(this.usdc.address)],
      swapOnUniV3: false,
    };

    orderParamsUniV3 = {
      liquidationAmountVT: ethers.BigNumber.from("0"),
      expectedOutputUT: BigNumber.from("0"),
      expiration: expiration,
      upperBound: aavePriceInUSD.add(parseEther("70")),
      lowerBound: aavePriceInUSD.sub(parseEther("20")),
      direction: ethers.constants.One,
      returnLimitUT: BigNumber.from("0"),
      // ethers.utils.parseEther("99"),
      stablecoinVault: this.opUSDCSave.address,
      vault: this.opAAVEInvst.address,
      expectedOutputVT: BigNumber.from("0"),
      permitParams: "0x",
      dexRouter: UniswapV3RouterAddress,
      uniV3Path: uniV3SwapPath,
      uniV2Path: [],
      swapOnUniV3: true,
    };

    failedOrderParams = {
      liquidationAmountVT: ethers.BigNumber.from("0"),
      expectedOutputUT: BigNumber.from("0"),
      expiration: expiration.sub(BigNumber.from("1000")),
      upperBound: aavePriceInUSD.add(parseEther("70")),
      lowerBound: aavePriceInUSD.sub(parseEther("20")),
      direction: ethers.constants.Zero,
      returnLimitUT: ethers.utils.parseEther("99"),
      stablecoinVault: this.opUSDCSave.address,
      vault: this.opAAVEInvst.address,
      expectedOutputVT: BigNumber.from("0"),
      permitParams: "0x",
      dexRouter: UniswapV2Router02Address,
      uniV3Path: "0x",
      uniV2Path: [getAddress(ethereumTokens.REWARD_TOKENS.AAVE), getAddress(ethereumTokens.PLAIN_TOKENS.USDC)],
      swapOnUniV3: false,
    };

    modifyOrderParams = {
      liquidationAmountVT: ethers.BigNumber.from("0"),
      expectedOutputUT: BigNumber.from("0"),
      expiration: newExpiration,
      upperBound: aavePriceInUSD.add(parseEther("140")),
      lowerBound: aavePriceInUSD.add(parseEther("70")),
      direction: ethers.constants.Zero,
      returnLimitUT: ethers.utils.parseEther("9"),
      stablecoinVault: this.opUSDCSave.address,
      vault: this.opAAVEInvst.address,
      expectedOutputVT: BigNumber.from("0"),
      permitParams: "0x",
      dexRouter: UniswapV3RouterAddress,
      uniV3Path: uniV3SwapPath,
      uniV2Path: [ethers.constants.AddressZero],
      swapOnUniV3: true,
    };

    tx = await this.limitOrder
      .connect(this.signers.deployer)
      .giveAllowances(
        [this.aave.address, this.aave.address, this.usdc.address],
        [UniswapV2Router02Address, UniswapV3RouterAddress, this.opUSDCSave.address],
      );
    await tx.wait(1);
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [this.signers.gelatoNetworkSigner.address],
    });
  });

  beforeEach(async function () {
    //set vault fee to non-zero amount
    let tx = await this.limitOrder
      .connect(this.signers.deployer)
      .setVaultLiquidationFee(liquidationFeeBP, this.opAAVEInvst.address);
    await tx.wait(1);

    tx = await this.limitOrder.setVault(this.opAAVEInvst.address);
    await tx.wait(1);

    tx = await this.limitOrder.setStablecoinVault(this.opUSDCSave.address);
    await tx.wait(1);
  });
  describe(":LimitOrderActions", () => {
    describe("#createOrder(struct(orderParams)))", () => {
      it("successfully created a limit order,emits LimitOrderCreated event", async function () {
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
        orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");

        const resolverHash = ethers.utils.keccak256(
          new ethers.utils.AbiCoder().encode(
            ["address", "bytes"],
            [
              this.limitOrder.address,
              this.limitOrder.interface.encodeFunctionData("canExecuteOrder", [
                this.signers.alice.address,
                this.opAAVEInvst.address,
              ]),
            ],
          ),
        );

        const _taskId = await this.gelatoOps.getTaskId(
          this.limitOrder.address,
          this.limitOrder.address,
          await this.gelatoOps.getSelector("execute(address,address)"),
          true,
          ethers.constants.AddressZero,
          resolverHash,
        );

        await expect(this.limitOrder.connect(this.signers.alice).createOrder(orderParams))
          .to.emit(this.limitOrder, "LimitOrderCreated")
          .withArgs(
            orderParams.liquidationAmountVT,
            orderParams.expectedOutputUT,
            orderParams.expiration,
            orderParams.lowerBound,
            orderParams.upperBound,
            orderParams.returnLimitUT,
            orderParams.expectedOutputVT,
            _taskId,
            this.signers.alice.address,
            orderParams.vault,
            orderParams.stablecoinVault,
            orderParams.dexRouter,
            orderParams.swapOnUniV3,
            orderParams.direction,
          );

        const makerOrder = await this.limitOrder.userVaultOrder(this.signers.alice.address, this.opAAVEInvst.address);

        const createdOrder: Order = {
          liquidationAmountVT: BigNumber.from(makerOrder.liquidationAmountVT),
          expectedOutputUT: BigNumber.from(makerOrder.expectedOutputUT),
          expiration: BigNumber.from(makerOrder.expiration),
          lowerBound: BigNumber.from(makerOrder.lowerBound),
          upperBound: BigNumber.from(makerOrder.upperBound),
          returnLimitUT: BigNumber.from(makerOrder.returnLimitUT),
          stablecoinVault: makerOrder.stablecoinVault,
          maker: makerOrder.maker,
          vault: makerOrder.vault,
          direction: BigNumber.from(makerOrder.direction).toNumber(),
          dexRouter: makerOrder.dexRouter,
          swapOnUniV3: makerOrder.swapOnUniV3,
          uniV2Path: makerOrder.uniV2Path,
          uniV3Path: makerOrder.uniV3Path,
          permitParams: makerOrder.permitParams,
          expectedOutputVT: BigNumber.from(makerOrder.expectedOutputVT),
          taskId: makerOrder.taskId,
        };
        const order = convertOrderParamsToOrder(orderParams, this.signers.alice.address, _taskId);
        expect(createdOrder).to.deep.equal(order);
      });

      it("emits TaskCreated event", async function () {
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
        orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");
        const resolverHash = ethers.utils.keccak256(
          new ethers.utils.AbiCoder().encode(
            ["address", "bytes"],
            [
              this.limitOrder.address,
              this.limitOrder.interface.encodeFunctionData("canExecuteOrder", [
                this.signers.alice.address,
                this.opAAVEInvst.address,
              ]),
            ],
          ),
        );

        const _taskId = await this.gelatoOps.getTaskId(
          this.limitOrder.address,
          this.limitOrder.address,
          await this.gelatoOps.getSelector("execute(address,address)"),
          true,
          ethers.constants.AddressZero,
          resolverHash,
        );

        const _resolverData = this.limitOrder.interface.encodeFunctionData("canExecuteOrder", [
          this.signers.alice.address,
          this.opAAVEInvst.address,
        ]);

        await expect(this.limitOrder.connect(this.signers.alice).createOrder(orderParams))
          .to.emit(this.gelatoOps, "TaskCreated")
          .withArgs(
            this.limitOrder.address,
            this.limitOrder.address,
            await this.gelatoOps.getSelector("execute(address,address)"),
            this.limitOrder.address,
            _taskId,
            _resolverData,
            true,
            ethers.constants.AddressZero,
            resolverHash,
          );
      });

      describe("reverts if", () => {
        it("user has an active limit order", async function () {
          const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
          orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
          orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");

          await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

          await expect(this.limitOrder.connect(this.signers.alice).createOrder(orderParams)).to.be.revertedWith(
            `ActiveOrder("${this.signers.alice.address}", "${orderParams.vault}")`,
          );
        });

        it("expiration is before current block timestamp", async function () {
          const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
          const _currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
          failedOrderParams.expiration = BigNumber.from(_currentTimestamp).sub("600");
          await network.provider.send("evm_setNextBlockTimestamp", [_currentTimestamp + 2]);

          failedOrderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);

          await expect(this.limitOrder.connect(this.signers.alice).createOrder(failedOrderParams)).to.be.revertedWith(
            `PastExpiration(${_currentTimestamp + 2}, ${failedOrderParams.expiration})`,
          );
        });

        it("lower bound is larger than upper bound", async function () {
          const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
          failedOrderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
          failedOrderParams.upperBound = ethers.constants.Zero;
          failedOrderParams.expiration = failedOrderParams.expiration.add(BigNumber.from("10000"));
          await expect(this.limitOrder.connect(this.signers.alice).createOrder(failedOrderParams)).to.be.revertedWith(
            `ReverseBounds()`,
          );
        });

        it(" vault is not whitelisted", async function () {
          const tx = await this.limitOrder.unsetVault(this.opAAVEInvst.address);
          await tx.wait(1);

          failedOrderParams.upperBound = orderParams.upperBound;
          failedOrderParams.expiration = orderParams.expiration;
          failedOrderParams.stablecoinVault = this.signers.alice.address;
          await expect(this.limitOrder.connect(this.signers.alice).createOrder(failedOrderParams)).to.be.revertedWith(
            `ForbiddenVault()`,
          );
        });

        it("stablecoin vault is not whitelisted", async function () {
          const tx = await this.limitOrder.unsetStablecoinVault(this.opUSDCSave.address);
          await tx.wait(1);

          failedOrderParams.upperBound = orderParams.upperBound;
          failedOrderParams.expiration = orderParams.expiration;
          failedOrderParams.stablecoinVault = this.signers.alice.address;
          await expect(this.limitOrder.connect(this.signers.alice).createOrder(failedOrderParams)).to.be.revertedWith(
            `ForbiddenStablecoinVault()`,
          );
        });
      });
    });

    describe("#cancelOrder(address)", () => {
      it("cancels an active order, emits TaskCancelled event", async function () {
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
        orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");
        await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

        expect(await this.limitOrder.userVaultOrderActive(this.signers.alice.address, this.opAAVEInvst.address)).to.be
          .true;

        await expect(this.limitOrder.connect(this.signers.alice).cancelOrder(this.opAAVEInvst.address))
          .to.emit(this.gelatoOps, "TaskCancelled")
          .withArgs(
            (
              await this.limitOrder.userVaultOrder(this.signers.alice.address, this.opAAVEInvst.address)
            ).taskId,
            this.limitOrder.address,
          );

        expect(await this.limitOrder.userVaultOrderActive(this.signers.alice.address, this.opAAVEInvst.address)).to.be
          .false;
      });

      describe("reverts if", () => {
        it("order is non-existent", async function () {
          await expect(
            this.limitOrder.connect(this.signers.alice).cancelOrder(this.opAAVEInvst.address),
          ).to.be.revertedWith("OrderNonExistent()");
        });
      });
    });

    describe("#execute(struct(Order))", () => {
      let snapshotId: any;
      let USDCAmount: BigNumber;
      let fee: BigNumber;

      beforeEach(async function () {
        snapshotId = await ethers.provider.send("evm_snapshot", []);

        //calculate user shares
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div("2");
        const userSharesLiquidated = orderParams.liquidationAmountVT;

        //no fees in opAAVEvault so should be precise
        const expectedAaveRedeemed = userSharesLiquidated.mul(await this.opAAVEInvst.getPricePerFullShare()).div(BASIS); //must divide by basis as getPricePerFullShare returns 10**18

        //simulate swap call for test values
        const tx = await this.aave
          .connect(this.signers.alice)
          .approve(this.uniV2Router.address, ethers.utils.parseEther("1000000"));
        await tx.wait(1);
        const swapDeadline = expiration.add(BigNumber.from("1000000000000000000000000000000000000"));

        [, USDCAmount] = await this.uniV2Router
          .connect(this.signers.alice)
          .callStatic.swapExactTokensForTokens(
            expectedAaveRedeemed,
            ethers.constants.Zero,
            [this.aave.address, this.usdc.address],
            this.signers.alice.address,
            swapDeadline,
          );

        fee = USDCAmount.mul(liquidationFeeBP).div(BASIS);

        // fund Gelato
        await this.gelatoTaskTreasury
          .connect(this.signers.deployer)
          .depositFunds(this.limitOrder.address, ETH, ethers.utils.parseEther("1"), {
            value: ethers.utils.parseEther("1"),
          });
      });

      afterEach(async function () {
        await ethers.provider.send("evm_revert", [snapshotId]);
      });
      it("sends liquidation fee to treasury", async function () {
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div("2");
        orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");
        const deadline = (await ethers.provider.getBlock("latest")).timestamp;
        const { v, r, s } = await getPermitSignature(
          this.signers.alice,
          this.opAAVEInvst,
          this.limitOrder.address,
          orderParams.liquidationAmountVT,
          BigNumber.from(deadline).add(1800),
          { version: "1" },
        );
        const permitData = ethers.utils.defaultAbiCoder.encode(
          ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
          [
            this.signers.alice.address,
            this.limitOrder.address,
            orderParams.liquidationAmountVT,
            BigNumber.from(deadline).add(1800),
            v,
            r,
            s,
          ],
        );
        orderParams.permitParams = permitData;
        orderParams.returnLimitUT = USDCAmount;
        //create order from maker
        await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

        const treasuryAddress = await this.limitOrder.treasury();
        const treasury = await ethers.getSigner(treasuryAddress);
        await expect(() =>
          this.limitOrder.connect(this.signers.alice).execute(this.signers.alice.address, this.opAAVEInvst.address),
        ).to.changeTokenBalance(this.usdc, treasury, fee);
      });

      it("sends opUSDC shares to maker after USDC minus fee been deposited", async function () {
        //calculate expectedOPUSDCShares to reach user after fees
        const opUSDCprice = await this.opUSDCSave.getPricePerFullShare();
        const USDCAmountAfterFee = USDCAmount.sub(fee);
        const expectedOPUSDCShares = USDCAmountAfterFee.mul(BASIS).div(opUSDCprice);
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);

        //create order from maker
        await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

        await expect(() =>
          this.limitOrder.connect(this.signers.alice).execute(this.signers.alice.address, this.opAAVEInvst.address),
        ).to.changeTokenBalance(this.opUSDCSave, this.signers.alice, expectedOPUSDCShares);
      });

      it("emits DeliverShares event after deposit to opUSDC vault", async function () {
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
        orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");
        //create order from maker
        await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

        await expect(
          this.limitOrder.connect(this.signers.alice).execute(this.signers.alice.address, this.opAAVEInvst.address),
        )
          .to.emit(this.limitOrder, "DeliverShares")
          .withArgs(this.signers.alice.address);
      });

      it("Gelato network emits TaskCancelled if non-gelato network signer fulfills limit order", async function () {
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
        orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");
        //create order from maker
        await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

        const makeropUSDCBalanceBefore = await this.opUSDCSave.balanceOf(this.signers.alice.address);
        const tx = await this.limitOrder
          .connect(this.signers.bob)
          .execute(this.signers.alice.address, this.opAAVEInvst.address);
        const { logs } = await tx.wait(1);
        const [TaskCancelledEventData, DeliverSharesEventData]: DecodedLogType[] = decodeLogs(logs);

        expect(TaskCancelledEventData.name).eq("TaskCancelled");
        expect(TaskCancelledEventData.events[0].name).to.eq("taskId");
        expect(TaskCancelledEventData.events[0].type).to.eq("bytes32");
        expect(TaskCancelledEventData.events[0].value).to.eq(
          await (
            await this.limitOrder.userVaultOrder(this.signers.alice.address, this.opAAVEInvst.address)
          ).taskId,
        );
        expect(TaskCancelledEventData.events[1].name).to.eq("taskCreator");
        expect(TaskCancelledEventData.events[1].type).to.eq("address");
        expect(getAddress(TaskCancelledEventData.events[1].value)).to.eq(getAddress(this.limitOrder.address));
        expect(ethers.utils.getAddress(TaskCancelledEventData.address)).to.eq(ethers.utils.getAddress(Gelato_Pokeme));

        expect(DeliverSharesEventData.name).to.eq("DeliverShares");
        expect(DeliverSharesEventData.events[0].name).to.eq("_maker");
        expect(DeliverSharesEventData.events[0].type).to.eq("address");
        expect(getAddress(DeliverSharesEventData.events[0].value)).to.eq(getAddress(this.signers.alice.address));
        expect(getAddress(DeliverSharesEventData.address)).to.eq(getAddress(this.limitOrder.address));

        const opUSDCSharesReceived = USDCAmount.sub(fee)
          .mul(ethers.utils.parseEther("1"))
          .div(await this.opUSDCSave.getPricePerFullShare());

        expect(await this.opUSDCSave.balanceOf(this.signers.alice.address)).to.eq(
          opUSDCSharesReceived.add(makeropUSDCBalanceBefore),
        );
      });

      it("UniV2: Gelato resolves the order, limit order emits DeliverShares event after deposit to opUSDC vault", async function () {
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
        orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");
        const resolverHash = ethers.utils.keccak256(
          new ethers.utils.AbiCoder().encode(
            ["address", "bytes"],
            [
              this.limitOrder.address,
              this.limitOrder.interface.encodeFunctionData("canExecuteOrder", [
                this.signers.alice.address,
                this.opAAVEInvst.address,
              ]),
            ],
          ),
        );

        const _taskId = await this.gelatoOps.getTaskId(
          this.limitOrder.address,
          this.limitOrder.address,
          await this.gelatoOps.getSelector("execute(address,address)"),
          true,
          ethers.constants.AddressZero,
          resolverHash,
        );

        const _resolverData = this.limitOrder.interface.encodeFunctionData("canExecuteOrder", [
          this.signers.alice.address,
          this.opAAVEInvst.address,
        ]);

        //create order from maker
        await expect(this.limitOrder.connect(this.signers.alice).createOrder(orderParams))
          .to.emit(this.gelatoOps, "TaskCreated")
          .withArgs(
            this.limitOrder.address,
            this.limitOrder.address,
            await this.gelatoOps.getSelector("execute(address,address)"),
            this.limitOrder.address,
            _taskId,
            _resolverData,
            true,
            ethers.constants.AddressZero,
            resolverHash,
          );

        const expectedPayload = this.limitOrder.interface.encodeFunctionData("execute", [
          this.signers.alice.address,
          this.opAAVEInvst.address,
        ]);

        const [canExec, execPayload] = ethers.utils.defaultAbiCoder.decode(
          ["bool", "bytes"],
          await ethers.provider.call({
            to: this.limitOrder.address,
            data: _resolverData,
          }),
        );

        // assert the payload
        expect(execPayload).to.eq(expectedPayload);

        expect(canExec).to.be.true;

        await expect(
          this.gelatoOps
            .connect(this.signers.gelatoNetworkSigner)
            .exec(
              ethers.utils.parseEther("1"),
              ETH,
              this.limitOrder.address,
              true,
              true,
              resolverHash,
              this.limitOrder.address,
              execPayload,
            ),
        )
          .to.emit(this.limitOrder, "DeliverShares")
          .withArgs(this.signers.alice.address);
      });

      it("UniV3: Gelato resolves the order, limit order emits DeliverShares event after deposit to opUSDC vault", async function () {
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParamsUniV3.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
        orderParamsUniV3.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");

        const opAAVEInvstPPS = await this.opAAVEInvst.getPricePerFullShare();
        const expectedAaveRedeemed = orderParamsUniV3.liquidationAmountVT.mul(opAAVEInvstPPS).div(BASIS);
        const [, , expectedUSDC] = await this.uniV2Router.getAmountsOut(expectedAaveRedeemed, [
          ethereumTokens.REWARD_TOKENS.AAVE,
          ethereumTokens.WRAPPED_TOKENS.WETH,
          ethereumTokens.PLAIN_TOKENS.USDC,
        ]);

        orderParamsUniV3.returnLimitUT = expectedUSDC;

        const tx = await this.opAAVEInvst
          .connect(this.signers.alice)
          .approve(this.limitOrder.address, ethers.constants.MaxUint256);
        await tx.wait(1);

        const resolverHash = ethers.utils.keccak256(
          new ethers.utils.AbiCoder().encode(
            ["address", "bytes"],
            [
              this.limitOrder.address,
              this.limitOrder.interface.encodeFunctionData("canExecuteOrder", [
                this.signers.alice.address,
                this.opAAVEInvst.address,
              ]),
            ],
          ),
        );

        const _taskId = await this.gelatoOps.getTaskId(
          this.limitOrder.address,
          this.limitOrder.address,
          await this.gelatoOps.getSelector("execute(address,address)"),
          true,
          ethers.constants.AddressZero,
          resolverHash,
        );

        const _resolverData = this.limitOrder.interface.encodeFunctionData("canExecuteOrder", [
          this.signers.alice.address,
          this.opAAVEInvst.address,
        ]);

        //create order from maker
        await expect(this.limitOrder.connect(this.signers.alice).createOrder(orderParamsUniV3))
          .to.emit(this.gelatoOps, "TaskCreated")
          .withArgs(
            this.limitOrder.address,
            this.limitOrder.address,
            await this.gelatoOps.getSelector("execute(address,address)"),
            this.limitOrder.address,
            _taskId,
            _resolverData,
            true,
            ethers.constants.AddressZero,
            resolverHash,
          );

        const expectedPayload = this.limitOrder.interface.encodeFunctionData("execute", [
          this.signers.alice.address,
          this.opAAVEInvst.address,
        ]);

        const [canExec, execPayload] = ethers.utils.defaultAbiCoder.decode(
          ["bool", "bytes"],
          await ethers.provider.call({
            to: this.limitOrder.address,
            data: _resolverData,
          }),
        );

        // assert the payload
        expect(execPayload).to.eq(expectedPayload);

        expect(canExec).to.be.true;

        await expect(
          this.gelatoOps
            .connect(this.signers.gelatoNetworkSigner)
            .exec(
              ethers.utils.parseEther("1"),
              ETH,
              this.limitOrder.address,
              true,
              true,
              resolverHash,
              this.limitOrder.address,
              execPayload,
            ),
        )
          .to.emit(this.limitOrder, "DeliverShares")
          .withArgs(this.signers.alice.address);
      });

      describe("reverts if", () => {
        it("user does not have an enough shares", async function () {
          orderParams.liquidationAmountVT = parseEther("1");
          orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");
          const tx = await this.limitOrder.connect(this.signers.bob).createOrder(orderParams);
          await tx.wait(1);
          const [_canExec, execPayload] = await this.limitOrder.canExecuteOrder(
            this.signers.bob.address,
            this.opAAVEInvst.address,
          );
          expect(_canExec).to.be.false;
          expect(execPayload).to.eq(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("Not enough shares")));

          await expect(
            this.limitOrder.connect(this.signers.bob).execute(this.signers.bob.address, this.opAAVEInvst.address),
          ).to.be.revertedWith("Not enough shares");
        });

        it("user does not have an active order", async function () {
          orderParams.liquidationAmountVT = parseEther("1");
          orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");

          await setTokenBalanceInStorage(this.aave, this.signers.bob.address, "100");
          let tx = await this.aave
            .connect(this.signers.bob)
            .approve(this.opAAVEInvst.address, ethers.constants.MaxUint256);
          await tx.wait(1);
          tx = await this.opAAVEInvst
            .connect(this.signers.bob)
            .userDepositVault(this.signers.bob.address, parseEther("100"), 0, "0x", []);
          await tx.wait(1);
          tx = await this.limitOrder.connect(this.signers.bob).createOrder(orderParams);
          await tx.wait(1);
          tx = await this.limitOrder.connect(this.signers.bob).cancelOrder(this.opAAVEInvst.address);
          await tx.wait(1);
          const [_canExec, execPayload] = await this.limitOrder.canExecuteOrder(
            this.signers.bob.address,
            this.opAAVEInvst.address,
          );
          expect(_canExec).to.be.false;
          expect(execPayload).to.eq(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("no active order")));

          await expect(
            this.limitOrder.connect(this.signers.bob).execute(this.signers.bob.address, this.opAAVEInvst.address),
          ).to.be.revertedWith("no active order");
        });

        it("order has expired", async function () {
          const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
          orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);

          await this.limitOrder.connect(this.signers.alice).createOrder({
            liquidationAmountVT: ethers.BigNumber.from("0"),
            expectedOutputUT: BigNumber.from("0"),
            expectedOutputVT: BigNumber.from("0"),
            expiration: (await (await ethers.provider.getBlock("latest")).timestamp) + 1,
            upperBound: ethers.utils.parseEther("150"),
            lowerBound: ethers.utils.parseEther("50"),
            direction: ethers.constants.One,
            returnLimitUT: ethers.utils.parseEther("0.99"),
            vault: this.opAAVEInvst.address,
            stablecoinVault: this.opUSDCSave.address,
            dexRouter: UniswapV2Router02Address,
            uniV2Path: [this.aave.address, this.usdc.address],
            permitParams: "0x",
            uniV3Path: "0x",
            swapOnUniV3: false,
          });

          const expiredTimestamp = (await (await ethers.provider.getBlock("latest")).timestamp) + 10000;

          await network.provider.send("evm_setNextBlockTimestamp", [expiredTimestamp]);

          const [_canExec, execPayload] = await this.limitOrder.canExecuteOrder(
            this.signers.alice.address,
            this.opAAVEInvst.address,
          );
          expect(_canExec).to.be.false;
          expect(execPayload).to.eq(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("expired")));

          await expect(
            this.limitOrder.connect(this.signers.alice).execute(this.signers.alice.address, this.opAAVEInvst.address),
          ).to.be.revertedWith("expired");
        });

        it("price is outwith bounds when set to be within bounds", async function () {
          const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
          modifyOrderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(3);
          modifyOrderParams.direction = ethers.constants.One;
          await this.limitOrder.connect(this.signers.alice).createOrder(modifyOrderParams);

          const [_canExec, execPayload] = await this.limitOrder.canExecuteOrder(
            this.signers.alice.address,
            this.opAAVEInvst.address,
          );
          expect(_canExec).to.be.false;
          expect(execPayload).to.eq(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("price out with bounds")));

          await expect(
            this.limitOrder.connect(this.signers.alice).execute(this.signers.alice.address, this.opAAVEInvst.address),
          ).to.be.revertedWith("price out with bounds");
        });

        it("price is within bounds when set to be outwith bounds", async function () {
          const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
          modifyOrderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(3);
          modifyOrderParams.direction = ethers.constants.Zero;
          const aavePriceInUSD = await this.optyfiOracle.getTokenPrice(this.aave.address, await this.limitOrder.USD());
          modifyOrderParams.lowerBound = aavePriceInUSD.sub(parseEther("20"));
          modifyOrderParams.upperBound = aavePriceInUSD.add(parseEther("10"));

          await this.limitOrder.connect(this.signers.alice).createOrder(modifyOrderParams);

          const [_canExec, execPayload] = await this.limitOrder.canExecuteOrder(
            this.signers.alice.address,
            this.opAAVEInvst.address,
          );
          expect(_canExec).to.be.false;
          expect(execPayload).to.eq(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("price within bounds")));

          await expect(
            this.limitOrder.connect(this.signers.alice).execute(this.signers.alice.address, this.opAAVEInvst.address),
          ).to.be.revertedWith("price within bounds");
        });

        it("return limit > swap output", async function () {
          const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
          orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
          //set return limi to be 3x what is swapped so will always fail
          orderParams.returnLimitUT = ethers.utils.parseEther("3.0");
          //create order from maker
          await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

          await expect(
            this.limitOrder.connect(this.signers.alice).execute(this.signers.alice.address, this.opAAVEInvst.address),
          ).to.be.revertedWith(`UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT`);
        });
      });

      describe("#modifyOrder(address,struct(OrderParams))", () => {
        it("modifies an existing order", async function () {
          const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
          orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);
          await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

          modifyOrderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(3);

          await this.limitOrder.connect(this.signers.alice).modifyOrder(this.opAAVEInvst.address, modifyOrderParams);

          const makerOrder = await this.limitOrder.userVaultOrder(this.signers.alice.address, this.opAAVEInvst.address);
          const modifiedOrder: Order = {
            liquidationAmountVT: BigNumber.from(makerOrder.liquidationAmountVT),
            expectedOutputUT: BigNumber.from(makerOrder.expectedOutputUT),
            expectedOutputVT: BigNumber.from(makerOrder.expectedOutputVT),
            expiration: BigNumber.from(makerOrder.expiration),
            lowerBound: BigNumber.from(makerOrder.lowerBound),
            upperBound: BigNumber.from(makerOrder.upperBound),
            direction: BigNumber.from(makerOrder.direction).toNumber(),
            returnLimitUT: BigNumber.from(makerOrder.returnLimitUT),
            stablecoinVault: this.opUSDCSave.address,
            maker: makerOrder.maker,
            vault: makerOrder.vault,
            swapOnUniV3: makerOrder.swapOnUniV3,
            dexRouter: makerOrder.dexRouter,
            uniV2Path: makerOrder.uniV2Path,
            uniV3Path: makerOrder.uniV3Path,
            permitParams: makerOrder.permitParams,
            taskId: makerOrder.taskId,
          };

          const order = convertOrderParamsToOrder(modifyOrderParams, this.signers.alice.address, modifiedOrder.taskId);

          expect(order).to.deep.eq(modifiedOrder);
        });

        describe("reverts if", () => {
          it("user does not have an active order to modify", async function () {
            const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
            modifyOrderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(3);
            await expect(
              this.limitOrder.connect(this.signers.alice).modifyOrder(this.opAAVEInvst.address, modifyOrderParams),
            ).to.be.revertedWith(`NoActiveOrder("${this.signers.alice.address}")`);
          });

          it("expiration is before current block timestamp", async function () {
            await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

            await network.provider.send("evm_setNextBlockTimestamp", [orderParams.expiration.toNumber()]);

            modifyOrderParams.expiration = ethers.constants.Zero;

            await expect(
              this.limitOrder.connect(this.signers.alice).modifyOrder(this.opAAVEInvst.address, modifyOrderParams),
            ).to.be.revertedWith(`PastExpiration(${orderParams.expiration}, ${modifyOrderParams.expiration})`);
          });

          it("lower bound is larger than upper bound", async function () {
            await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

            modifyOrderParams.upperBound = ethers.constants.Zero;
            modifyOrderParams.expiration = orderParams.expiration.add(BigNumber.from("10000"));
            await expect(
              this.limitOrder.connect(this.signers.alice).modifyOrder(this.opAAVEInvst.address, modifyOrderParams),
            ).to.be.revertedWith(`ReverseBounds()`);
          });

          it("vault is not whitelisted", async function () {
            await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

            modifyOrderParams.lowerBound = orderParams.lowerBound;
            modifyOrderParams.upperBound = orderParams.upperBound;
            modifyOrderParams.vault = this.signers.alice.address;
            await expect(
              this.limitOrder.connect(this.signers.alice).modifyOrder(this.opAAVEInvst.address, modifyOrderParams),
            ).to.be.revertedWith(`ForbiddenVault()`);
          });

          it("stablecoin vault is not whitelisted", async function () {
            await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);

            modifyOrderParams.lowerBound = orderParams.lowerBound;
            modifyOrderParams.upperBound = orderParams.upperBound;
            modifyOrderParams.stablecoinVault = this.signers.alice.address;
            await expect(
              this.limitOrder.connect(this.signers.alice).modifyOrder(this.opAAVEInvst.address, modifyOrderParams),
            ).to.be.revertedWith(`ForbiddenStablecoinVault()`);
          });
        });
      });
    });
  });
}
