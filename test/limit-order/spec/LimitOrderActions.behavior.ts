import { ethers, deployments } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";
import { decodeLogs, addABI } from "abi-decoder";
import { getAddress, parseEther, parseUnits } from "ethers/lib/utils";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { DecodedLogType, Order, OrderParams } from "../../../utils/types";
import {
  IERC20,
  ILimitOrder,
  Vault,
  OptyFiOracle,
  IOps__factory,
  IOps,
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
import { convertOrderParamsToOrder } from "../../../utils/converters";
import { generateMerkleTree, generateMerkleTreeForCodehash, getProof, getProofForCode } from "../../../scripts/utils";
import { generateTokenHashV2 } from "../../../helpers/helpers";
import { StrategiesByTokenByChain } from "../../../helpers/data/adapter-with-strategies";
import { setTokenBalanceInStorage } from "../../test-opty/utils";

addABI(ILimitOrder__factory.abi);
addABI(IOps__factory.abi);

const fork = process.env.FORK as eEVMNetwork;
const DEBUG = process.env.DEBUG === "true" ? true : false;

export function describeBehaviorOfLimitOrderActions(_skips?: string[]): void {
  let liquidationAmount: BigNumber;

  //Tokens
  const USD = "0x0000000000000000000000000000000000000348";
  const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  //Contracts
  const UniswapV2Router02Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; //mainnet
  const UniswapV3RouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; //mainnet
  const Gelato_Network = "0x3CACa7b48D0573D793d3b0279b5F0029180E83b6"; // mainnet
  const Gelato_Pokeme = "0xB3f5503f93d5Ef84b06993a1975B9D21B962892F"; // mainnet
  const Gelato_Task_Treasury = "0x2807B4aE232b624023f87d0e237A3B1bf200Fd99"; // mainnet

  //Params
  const expirationNum = 1657190461 + 120; //unix timestamp of block 15095000 + 120s
  const expiration = BigNumber.from(expirationNum.toString());
  const newExpiration = expiration.add(BigNumber.from("120"));

  const priceTarget = ethers.utils.parseEther("100"); //always high enough to execute order for testing
  const newPriceTarget = ethers.utils.parseEther("1");

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

  const aaveDepositAmount = ethers.utils.parseEther("0.1");

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
    await setTokenBalanceInStorage(this.aave, this.signers.alice.address, "100");
    tx = await this.aave.connect(this.signers.alice).approve(this.opAAVEInvst.address, parseEther("100"));
    await tx.wait(1);
    tx = await this.opAAVEInvst
      .connect(this.signers.alice)
      .userDepositVault(this.signers.alice.address, parseEther("100"), 0, "", []);
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
      .userDepositVault(this.signers.bob.address, parseUnits("100", 6), 0, "", []);
    await tx.wait(1);
    await this.opUSDCSave.connect(this.signers.bob).rebalance();
    await tx.wait(1);

    orderParams = {
      liquidationAmountVT: ethers.BigNumber.from("0"),
      expectedOutputUT: BigNumber.from("0"),
      expiration: expiration,
      upperBound: ethers.utils.parseEther("150"),
      lowerBound: ethers.utils.parseEther("50"),
      direction: ethers.constants.One,
      returnLimitUT: ethers.utils.parseEther("99"),
      expectedOutputVT: BigNumber.from("0"),
      stablecoinVault: this.opUSDCSave.address,
      vault: this.opAAVEInvst.address,
      dexRouter: UniswapV2Router02Address,
      uniV3Path: "0x",
      permitParams: "",
      uniV2Path: [this.aave.address, this.usdc.address],
      swapOnUniV3: false,
    };

    orderParamsUniV3 = {
      liquidationAmountVT: ethers.BigNumber.from("0"),
      expectedOutputUT: BigNumber.from("0"),
      expiration: expiration,
      upperBound: ethers.utils.parseEther("150"),
      lowerBound: ethers.utils.parseEther("50"),
      direction: ethers.constants.One,
      returnLimitUT: ethers.utils.parseEther("99"),
      stablecoinVault: this.opUSDCSave.address,
      vault: this.opAAVEInvst.address,
      expectedOutputVT: BigNumber.from("0"),
      permitParams: "",
      dexRouter: UniswapV3RouterAddress,
      uniV3Path: uniV3SwapPath,
      uniV2Path: [],
      swapOnUniV3: true,
    };

    failedOrderParams = {
      liquidationAmountVT: ethers.BigNumber.from("0"),
      expectedOutputUT: BigNumber.from("0"),
      expiration: expiration.sub(BigNumber.from("1000")),
      upperBound: ethers.utils.parseEther("150"),
      lowerBound: ethers.utils.parseEther("50"),
      direction: ethers.constants.Zero,
      returnLimitUT: ethers.utils.parseEther("99"),
      stablecoinVault: this.opUSDCSave.address,
      vault: this.opAAVEInvst.address,
      expectedOutputVT: BigNumber.from("0"),
      permitParams: "",
      dexRouter: UniswapV2Router02Address,
      uniV3Path: "0x",
      uniV2Path: [ethereumTokens.REWARD_TOKENS.AAVE, ethereumTokens.PLAIN_TOKENS.USDC],
      swapOnUniV3: false,
    };

    modifyOrderParams = {
      liquidationAmountVT: ethers.BigNumber.from("0"),
      expectedOutputUT: BigNumber.from("0"),
      expiration: newExpiration,
      upperBound: ethers.utils.parseEther("250"),
      lowerBound: ethers.utils.parseEther("150"),
      direction: ethers.constants.Zero,
      returnLimitUT: ethers.utils.parseEther("9"),
      stablecoinVault: this.opUSDCSave.address,
      vault: this.opAAVEInvst.address,
      expectedOutputVT: BigNumber.from("0"),
      permitParams: "",
      dexRouter: UniswapV3RouterAddress,
      uniV3Path: uniV3SwapPath,
      uniV2Path: [ethers.constants.AddressZero],
      swapOnUniV3: true,
    };
  });

  beforeEach(async function () {
    //set vault fee to non-zero amount
    await this.limitOrder
      .connect(this.signers.deployer)
      .setVaultLiquidationFee(liquidationFeeBP, this.opAAVEInvst.address);
  });
  describe(":LimitOrderActions", () => {
    describe("#createOrder(struct(orderParams)))", () => {
      it("successfully created a limit order", async function () {
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div(2);

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
          .withArgs([
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
            orderParams.uniV3Path,
            orderParams.permitParams,
            orderParams.uniV2Path,
          ]);

        const makerOrder = await this.limitOrder.userVaultOrder(this.signers.alice.address, this.opAAVEInvst.address);

        const createdOrder: Order = {
          liquidationAmountVT: makerOrder.liquidationAmountVT,
          expectedOutputUT: makerOrder.expectedOutputUT,
          expiration: makerOrder.expiration,
          lowerBound: makerOrder.lowerBound,
          upperBound: makerOrder.upperBound,
          returnLimitUT: makerOrder.returnLimitUT,
          stablecoinVault: makerOrder.stablecoinVault,
          maker: makerOrder.maker,
          vault: makerOrder.vault,
          direction: BigNumber.from(makerOrder.direction).toNumber(),
          dexRouter: makerOrder.dexRouter,
          swapOnUniV3: makerOrder.swapOnUniV3,
          uniV2Path: makerOrder.uniV2Path,
          uniV3Path: makerOrder.uniV3Path,
          permitParams: makerOrder.permitParams,
          expectedOutputVT: makerOrder.expectedOutputVT,
          taskId: makerOrder.taskId,
        };
        const order = convertOrderParamsToOrder(orderParams, this.signers.alice.address);
        expect(createdOrder).to.deep.equal(order);
      });

      // it("emits LimitOrderCreated event", async () => {
      //   const userShares = await opAaveToken.balanceOf(maker.address);
      //   orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);
      //   const order = convertOrderParamsToOrder(orderParams, maker.address);
      //   const resolverHash = ethers.utils.keccak256(
      //     new ethers.utils.AbiCoder().encode(
      //       ["address", "bytes"],
      //       [
      //         instance.address,
      //         instance.interface.encodeFunctionData("canExecuteOrder", [maker.address, opAaveToken.address]),
      //       ],
      //     ),
      //   );

      //   const _taskId = await opsInstance.getTaskId(
      //     instance.address,
      //     instance.address,
      //     await opsInstance.getSelector("execute(address,address,(uint256,uint256[],uint256[],address[],bytes,bytes))"),
      //     true,
      //     ethers.constants.AddressZero,
      //     resolverHash,
      //   );

      //   // const creationTx = await instance.connect(maker).createOrder(orderParams);

      //   // const { events } = await creationTx.wait();

      //   // const makerOrder  = events?.find((e) => e.event == 'LimitOrderCreated')?.args;

      //   // interface OrderWithTask {
      //   //   order: Order;
      //   //   taskId: string;
      //   // }

      //   // const orderWithTask: OrderWithTask = {
      //   //   order: order,
      //   //   taskId: _taskId
      //   // };
      //   // const createdOrder: Order = {
      //   //   liquidationAmount: makerOrder[0][0],
      //   //   expiration: makerOrder?.expiration,
      //   //   lowerBound: makerOrder?.lowerBound,
      //   //   upperBound: makerOrder?.upperBound,
      //   //   returnLimitBP: makerOrder?.returnLimitBP,
      //   //   stablecoinVault: UsdcVaultProxy,
      //   //   maker: makerOrder?.maker,
      //   //   vault: makerOrder?.vault,
      //   //   direction: BigNumber.from(makerOrder?.direction?.toString()),
      //   //   dexRouter: makerOrder?.dexRouter,
      //   //   swapOnUniV3: makerOrder?.swapOnUniV3,
      //   //   uniV2Path: makerOrder?.uniV2Path,
      //   //   uniV3Path: makerOrder?.uniV3Path
      //   // };
      //   // const createdOrderWithTask: OrderWithTask = {
      //   //   order: createdOrder,
      //   //   taskId: _taskId,
      //   // };

      //   // console.log(createdOrder);
      //   // console.log(order);
      //   // expect(createdOrderWithTask).to.deep.eq(orderWithTask);

      //   await expect(await instance.connect(maker).createOrder(orderParams))
      //     .to.emit(instance, "LimitOrderCreated")
      //     .withArgs([
      //       order.liquidationAmount,
      //       order.expiration,
      //       order.lowerBound,
      //       order.upperBound,
      //       order.returnLimitBP,
      //       _taskId,
      //       order.maker,
      //       order.vault,
      //       ethers.utils.getAddress(order.stablecoinVault),
      //       order.dexRouter,
      //       order.swapOnUniV3,
      //       order.direction,
      //       order.uniV3Path,
      //       [ethers.utils.getAddress(order.uniV2Path[0]), ethers.utils.getAddress(order.uniV2Path[1])],
      //     ]);
      // });

      // describe("reverts if", () => {
      //   it("user has an active limit order", async () => {
      //     const userShares = await opAaveToken.balanceOf(maker.address);
      //     orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);
      //     await instance.connect(maker).createOrder(orderParams);

      //     await expect(instance.connect(maker).createOrder(orderParams)).to.be.revertedWith(
      //       `ActiveOrder("${maker.address}", "${orderParams.vault}")`,
      //     );
      //   });

      //   it("expiration is before current block timestamp", async () => {
      //     const userShares = await opAaveToken.balanceOf(maker.address);
      //     orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);
      //     await hre.network.provider.send("evm_setNextBlockTimestamp", [orderParams.expiration.toNumber()]);

      //     failedOrderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);

      //     await expect(instance.connect(maker).createOrder(failedOrderParams)).to.be.revertedWith(
      //       `PastExpiration(${orderParams.expiration}, ${failedOrderParams.expiration})`,
      //     );
      //   });

      //   it("lower bound is larger than upper bound", async () => {
      //     const userShares = await opAaveToken.balanceOf(maker.address);
      //     failedOrderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);
      //     failedOrderParams.upperBound = ethers.constants.Zero;
      //     failedOrderParams.expiration = failedOrderParams.expiration.add(BigNumber.from("10000"));
      //     await expect(instance.connect(maker).createOrder(failedOrderParams)).to.be.revertedWith(`ReverseBounds()`);
      //   });

      //   it("destination is not whitelisted", async () => {
      //     failedOrderParams.upperBound = orderParams.upperBound;
      //     failedOrderParams.expiration = orderParams.expiration;
      //     failedOrderParams.stablecoinVault = maker.address;
      //     await expect(instance.connect(maker).createOrder(failedOrderParams)).to.be.revertedWith(
      //       `ForbiddenDestination()`,
      //     );
      //   });
      // });
    });

    // describe("#cancelOrder(address)", () => {
    //   it("cancels an active order", async () => {
    //     const userShares = await opAaveToken.balanceOf(maker.address);
    //     orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);
    //     await instance.connect(maker).createOrder(orderParams);

    //     expect(await instance.userVaultOrderActive(maker.address, AaveVaultProxy)).to.eq(true);

    //     expect(await instance.connect(maker).cancelOrder(AaveVaultProxy))
    //       .to.emit(opsInstance, "TaskCancelled")
    //       .withArgs([
    //         await (await instance.userVaultOrder(maker.address, opAaveToken.address)).taskId,
    //         instance.address,
    //       ]);

    //     expect(await instance.userVaultOrderActive(maker.address, AaveVaultProxy)).to.eq(false);
    //   });

    //   describe("reverts if", () => {
    //     it("order is non-existent", async () => {
    //       await expect(instance.connect(maker).cancelOrder(AaveVaultProxy)).to.be.revertedWith("OrderNonExistent()");
    //     });
    //   });
    // });

    // describe("#execute(struct(Order),struct(SwapData))", () => {
    //   let snapshotId: any;
    //   let tx;
    //   let codeRoot: any;
    //   let accountRoot: any;
    //   let swapParams: SwapParams;
    //   let fee: BigNumber;
    //   let aaveRedeemed: BigNumber;
    //   let USDCAmount: BigNumber;
    //   let instanceCodeProof;
    //   let instanceAccountProof;

    //   beforeEach(async () => {
    //     snapshotId = await ethers.provider.send("evm_snapshot", []);

    //     //provide USDC whale with ETH to make required transactions
    //     tx = maker.sendTransaction({
    //       to: USDCWhaleAddress,
    //       value: ethers.utils.parseEther("1.0"),
    //       gasLimit: 10000000,
    //     });

    //     (await tx).wait();

    //     //transfer aave tokens from whale to maker
    //     await AaveERC20.connect(AaveWhale).transfer(maker.address, ethers.utils.parseEther("10000"));

    //     //transfer aave tokens from whale to usdc whale for liquidity provision
    //     await AaveERC20.connect(AaveWhale).transfer(USDCWhale.address, ethers.utils.parseEther("10000"));

    //     await AaveERC20.connect(USDCWhale).approve(UniswapV2Router02Address, ethers.utils.parseEther("5000"));
    //     await USDCERC20.connect(USDCWhale).approve(UniswapV2Router02Address, BigNumber.from("20000000000000")); //20million USDC since usdc has 6 decimals)

    //     //provide liquidity to pool to ensure execute works
    //     await uniRouter
    //       .connect(USDCWhale)
    //       .addLiquidity(
    //         AaveERC20Address,
    //         USDC,
    //         ethers.utils.parseEther("5000"),
    //         BigNumber.from("10000000000000"),
    //         ethers.constants.Zero,
    //         ethers.constants.Zero,
    //         USDCWhaleAddress,
    //         expiration.add(BigNumber.from("10000000")),
    //       );

    //     //make AaveVault not whitelisted
    //     //replaced only 06 with 02 to remove the whitelisted state
    //     const newVaultConfig = "0x02026bd60f089B6E8BA75c409a54CDea34AA511277f600320000000000000000";

    //     //set proofs for instance
    //     const instanceCodeHash = ethers.utils.keccak256(await ethers.provider.getCode(instance.address));
    //     const codeMerkleTree = generateMerkleTreeForCodehash([instanceCodeHash]);

    //     instanceCodeProof = getProofForCode(codeMerkleTree, instanceCodeHash);

    //     const accountMerkleTree = generateMerkleTree([instance.address]);

    //     const instanceAccountProof = getProof(accountMerkleTree, instance.address);
    //     await instance.connect(owner).setAccountProof(instanceAccountProof, AaveVaultProxy);
    //     await instance.connect(owner).setCodeProof(instanceCodeProof, AaveVaultProxy);
    //     await instance.connect(owner).setAccountProof(instanceAccountProof, UsdcVaultProxy);
    //     await instance.connect(owner).setCodeProof(instanceCodeProof, UsdcVaultProxy);

    //     codeRoot = codeMerkleTree.getHexRoot();
    //     accountRoot = accountMerkleTree.getHexRoot();

    //     //transfer ether to optyfi vault operator
    //     tx = maker.sendTransaction({
    //       to: optyFiVaultOperatorAddress,
    //       value: ethers.utils.parseEther("1.0"),
    //       gasLimit: 10000000,
    //     });
    //     await (await tx).wait();

    //     //set vault configuration to remove whitelisted state
    //     await AaveVaultInstance.connect(optyFiVaultOperator).setVaultConfiguration(BigNumber.from(newVaultConfig));

    //     //set AaveVault merkle roots
    //     await AaveVaultInstance.connect(optyFiVaultOperator).setWhitelistedCodesRoot(codeRoot);

    //     await AaveVaultInstance.connect(optyFiVaultOperator).setWhitelistedAccountsRoot(accountRoot);

    //     //approve vault to take aave from maker
    //     await AaveERC20.connect(maker).approve(AaveVaultInstance.address, aaveDepositAmount);

    //     //deposit aave in opAAVE from maker
    //     await AaveVaultInstance.connect(maker).userDepositVault(
    //       maker.address,
    //       aaveDepositAmount,
    //       "0x",
    //       [ethers.constants.HashZero],
    //       [ethers.constants.HashZero],
    //     );

    //     //calculate user shares
    //     const userShares = await opAaveToken.balanceOf(maker.address);
    //     orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div("2");
    //     const userSharesLiquidated = orderParams.liquidationAmount;

    //     //approve LO contract
    //     await opAaveToken.connect(maker).approve(instance.address, ethers.constants.MaxUint256);

    //     //no fees in opAAVEvault so should be precise
    //     const expectedAaveRedeemed = userSharesLiquidated
    //       .mul(await AaveVaultInstance.getPricePerFullShare())
    //       .div(BASIS); //must divide by basis as getPricePerFullShare returns 10**18

    //     //calculate call datas for approve + swap
    //     const aaveERC20Interface = AaveERC20.interface;
    //     const approveData = aaveERC20Interface.encodeFunctionData("approve", [
    //       uniRouter.address,
    //       ethers.utils.parseEther("10000"),
    //     ]);

    //     const swapDiamondAddress = await instance.swapDiamond();
    //     const swapDeadline = expiration.add(BigNumber.from("1000000000000000000000000000000000000"));

    //     const uniswapData = uniRouter.interface.encodeFunctionData("swapExactTokensForTokens", [
    //       expectedAaveRedeemed,
    //       ethers.constants.Zero,
    //       [AaveERC20Address, USDC],
    //       swapDiamondAddress,
    //       swapDeadline,
    //     ]);

    //     //construct swapData
    //     const calls: string[] = [approveData, uniswapData];
    //     let startIndexes: any[] = ["0"];
    //     let exchangeData = `0x`;
    //     for (const i in calls) {
    //       startIndexes.push(parseInt(startIndexes[i]) + calls[i].substring(2).length / 2);
    //       exchangeData = exchangeData.concat(calls[i].substring(2));
    //     }

    //     startIndexes = startIndexes.map(i => BigNumber.from(i));

    //     swapParams = {
    //       deadline: swapDeadline,
    //       startIndexes: startIndexes,
    //       callees: [AaveERC20Address, UniswapV2Router02Address],
    //       values: [BigNumber.from("0"), BigNumber.from("0")],
    //       exchangeData,
    //       permit: "0x",
    //     };

    //     //simulate swap call for test values
    //     await AaveERC20.connect(AaveWhale).approve(uniRouter.address, ethers.utils.parseEther("1000000"));
    //     [aaveRedeemed, USDCAmount] = await uniRouter
    //       .connect(AaveWhale)
    //       .callStatic.swapExactTokensForTokens(
    //         expectedAaveRedeemed,
    //         ethers.constants.Zero,
    //         [AaveERC20Address, USDC],
    //         swapDiamondAddress,
    //         swapDeadline,
    //       );

    //     fee = USDCAmount.mul(liquidationFeeBP).div(BASIS);

    //     // fund Gelato
    //     await gelatoTaskTreasury.connect(maker).depositFunds(instance.address, ETH, ethers.utils.parseEther("1"), {
    //       value: ethers.utils.parseEther("1"),
    //     });
    //   });

    //   afterEach(async () => {
    //     await ethers.provider.send("evm_revert", [snapshotId]);
    //   });
    //   it("sends liquidation fee to treasury", async () => {
    //     //calculate expectedOPUSDCShares to reach user after fees
    //     const opUSDCVault = await ethers.getContractAt("Vault", UsdcVaultProxy);
    //     //taken from opUSDCVault.vaultConfiguration() and replace 0x06 with 0x02
    //     const newVaultConfig = "0x0201000000000000000000000000000000000000000000640000000000000000";
    //     //remove opUSDCVault whitelist
    //     const tx = await opUSDCVault.connect(optyFiVaultOperator).setVaultConfiguration(BigNumber.from(newVaultConfig));

    //     await tx.wait();
    //     //set code + account merkle roots and remove minimum deposit value
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedAccountsRoot(accountRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedCodesRoot(codeRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setMinimumDepositValueUT(ethers.constants.Zero);

    //     const userShares = await opAaveToken.balanceOf(maker.address);
    //     orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div("2");
    //     //create order from maker
    //     await instance.connect(maker).createOrder(orderParams);

    //     const treasuryAddress = await instance.treasury();
    //     const treasury = await ethers.getSigner(treasuryAddress);
    //     await expect(() =>
    //       instance.connect(maker).execute(maker.address, AaveVaultProxy, swapParams),
    //     ).to.changeTokenBalance(USDCERC20, treasury, fee);
    //   });

    //   it("sends opUSDC shares to maker after USDC minus fee been deposited", async () => {
    //     //calculate expectedOPUSDCShares to reach user after fees
    //     const opUSDCVault = await ethers.getContractAt("Vault", UsdcVaultProxy);
    //     const opUSDCprice = await opUSDCVault.getPricePerFullShare();
    //     const USDCAmountAfterFee = USDCAmount.sub(fee);
    //     const expectedOPUSDCShares = USDCAmountAfterFee.mul(BASIS).div(opUSDCprice);
    //     //taken from opUSDCVault.vaultConfiguration() and replace 0x06 with 0x02
    //     const newVaultConfig = "0x0201000000000000000000000000000000000000000000640000000000000000";
    //     //remove opUSDCVault whitelist
    //     const tx = await opUSDCVault.connect(optyFiVaultOperator).setVaultConfiguration(BigNumber.from(newVaultConfig));

    //     await tx.wait();
    //     //set code + account merkle roots and remove minimum deposit value
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedAccountsRoot(accountRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedCodesRoot(codeRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setMinimumDepositValueUT(ethers.constants.Zero);

    //     const userShares = await opAaveToken.balanceOf(maker.address);
    //     orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);

    //     //create order from maker
    //     await instance.connect(maker).createOrder(orderParams);

    //     await expect(() =>
    //       instance.connect(maker).execute(maker.address, AaveVaultProxy, swapParams),
    //     ).to.changeTokenBalance(UsdcVaultInstance, maker, expectedOPUSDCShares);
    //   });

    //   it("emits DeliverShares event after deposit to opUSDC vault", async () => {
    //     //calculate expectedOPUSDCShares to reach user after fees
    //     const opUSDCVault = await ethers.getContractAt("Vault", UsdcVaultProxy);
    //     const opUSDCprice = await opUSDCVault.getPricePerFullShare();
    //     const USDCAmountAfterFee = USDCAmount.sub(fee);
    //     //taken from opUSDCVault.vaultConfiguration() and replace 0x06 with 0x02
    //     const newVaultConfig = "0x0201000000000000000000000000000000000000000000640000000000000000";
    //     //remove opUSDCVault whitelist
    //     const tx = await opUSDCVault.connect(optyFiVaultOperator).setVaultConfiguration(BigNumber.from(newVaultConfig));

    //     await tx.wait();
    //     //set code + account merkle roots and remove minimum deposit value
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedAccountsRoot(accountRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedCodesRoot(codeRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setMinimumDepositValueUT(ethers.constants.Zero);

    //     const userShares = await opAaveToken.balanceOf(maker.address);
    //     orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);

    //     //create order from maker
    //     await instance.connect(maker).createOrder(orderParams);

    //     await expect(instance.connect(maker).execute(maker.address, AaveVaultProxy, swapParams))
    //       .to.emit(instance, "DeliverShares")
    //       .withArgs(maker.address);
    //   });

    //   it("may be called by any caller, task should be cancelled", async () => {
    //     //calculate expectedOPUSDCShares to reach user after fees
    //     const opUSDCVault = await ethers.getContractAt("Vault", UsdcVaultProxy);
    //     //taken from opUSDCVault.vaultConfiguration() and replace 0x06 with 0x02
    //     const newVaultConfig = "0x0201000000000000000000000000000000000000000000640000000000000000";
    //     //remove opUSDCVault whitelist
    //     let tx = await opUSDCVault.connect(optyFiVaultOperator).setVaultConfiguration(BigNumber.from(newVaultConfig));

    //     await tx.wait();
    //     //set code + account merkle roots and remove minimum deposit value
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedAccountsRoot(accountRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedCodesRoot(codeRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setMinimumDepositValueUT(ethers.constants.Zero);

    //     const userShares = await opAaveToken.balanceOf(maker.address);
    //     orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);
    //     //create order from maker
    //     await instance.connect(maker).createOrder(orderParams);

    //     const makeropUSDCBalanceBefore = await opUSDCVault.balanceOf(maker.address);
    //     tx = await instance.connect(nonMaker).execute(maker.address, AaveVaultProxy, swapParams);
    //     const { logs } = await tx.wait(1);
    //     const [TaskCancelledEventData, DeliverSharesEventData]: DecodedLogType[] = decodeLogs(logs);

    //     expect(TaskCancelledEventData.name).eq("TaskCancelled");
    //     expect(TaskCancelledEventData.events[0].name).to.eq("taskId");
    //     expect(TaskCancelledEventData.events[0].type).to.eq("bytes32");
    //     expect(TaskCancelledEventData.events[0].value).to.eq(
    //       await (
    //         await instance.userVaultOrder(maker.address, opAaveToken.address)
    //       ).taskId,
    //     );
    //     expect(TaskCancelledEventData.events[1].name).to.eq("taskCreator");
    //     expect(TaskCancelledEventData.events[1].type).to.eq("address");
    //     expect(getAddress(TaskCancelledEventData.events[1].value)).to.eq(getAddress(instance.address));
    //     expect(ethers.utils.getAddress(TaskCancelledEventData.address)).to.eq(ethers.utils.getAddress(Gelato_Pokeme));

    //     expect(DeliverSharesEventData.name).to.eq("DeliverShares");
    //     expect(DeliverSharesEventData.events[0].name).to.eq("_maker");
    //     expect(DeliverSharesEventData.events[0].type).to.eq("address");
    //     expect(getAddress(DeliverSharesEventData.events[0].value)).to.eq(getAddress(maker.address));
    //     expect(getAddress(DeliverSharesEventData.address)).to.eq(getAddress(instance.address));

    //     const opUSDCSharesReceived = USDCAmount.sub(fee)
    //       .mul(ethers.utils.parseEther("1"))
    //       .div(await opUSDCVault.getPricePerFullShare());

    //     expect(await opUSDCVault.balanceOf(maker.address)).to.eq(opUSDCSharesReceived.add(makeropUSDCBalanceBefore));
    //   });

    //   it("UniV2: Gelato resolves the order, limit order emits DeliverShares event after deposit to opUSDC vault", async () => {
    //     //calculate expectedOPUSDCShares to reach user after fees
    //     const opUSDCVault = await ethers.getContractAt("Vault", UsdcVaultProxy);
    //     const opAAVEprice = await AaveVaultInstance.getPricePerFullShare();
    //     const opUSDCprice = await opUSDCVault.getPricePerFullShare();
    //     const USDCAmountAfterFee = USDCAmount.sub(fee);
    //     //taken from opUSDCVault.vaultConfiguration() and replace 0x06 with 0x02
    //     const newVaultConfig = "0x0201000000000000000000000000000000000000000000640000000000000000";
    //     //remove opUSDCVault whitelist
    //     const tx = await opUSDCVault.connect(optyFiVaultOperator).setVaultConfiguration(BigNumber.from(newVaultConfig));

    //     await tx.wait();
    //     //set code + account merkle roots and remove minimum deposit value
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedAccountsRoot(accountRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedCodesRoot(codeRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setMinimumDepositValueUT(ethers.constants.Zero);

    //     const userShares = await opAaveToken.balanceOf(maker.address);
    //     orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);

    //     const resolverHash = ethers.utils.keccak256(
    //       new ethers.utils.AbiCoder().encode(
    //         ["address", "bytes"],
    //         [
    //           instance.address,
    //           instance.interface.encodeFunctionData("canExecuteOrder", [maker.address, opAaveToken.address]),
    //         ],
    //       ),
    //     );

    //     const _taskId = await opsInstance.getTaskId(
    //       instance.address,
    //       instance.address,
    //       await opsInstance.getSelector("execute(address,address,(uint256,uint256[],uint256[],address[],bytes,bytes))"),
    //       true,
    //       ethers.constants.AddressZero,
    //       resolverHash,
    //     );

    //     const _resolverData = instance.interface.encodeFunctionData("canExecuteOrder", [
    //       maker.address,
    //       opAaveToken.address,
    //     ]);

    //     //create order from maker
    //     expect(await instance.connect(maker).createOrder(orderParams))
    //       .to.emit(opsInstance, "TaskCreated")
    //       .withArgs([
    //         instance.address,
    //         instance.address,
    //         await opsInstance.getSelector(
    //           "execute(address,address,(uint256,uint256[],uint256[],address[],bytes,bytes))",
    //         ),
    //         instance.address,
    //         _taskId,
    //         _resolverData,
    //         true,
    //         ethers.constants.AddressZero,
    //         resolverHash,
    //       ]);

    //     const timestamp = await (await ethers.provider.getBlock("latest")).timestamp;

    //     const approveData = AaveERC20.interface.encodeFunctionData("approve", [
    //       UniswapV2Router02Address,
    //       ethers.constants.MaxUint256,
    //     ]);

    //     const expectedAaveRedeemed = opAAVEprice.mul(orderParams.liquidationAmount).div(BigNumber.from("10").pow("18"));

    //     const oracle: OptyFiOracle = await ethers.getContractAt("OptyFiOracle", await instance.oracle());

    //     const expectedUSDC = BigNumber.from(
    //       expectedAaveRedeemed
    //         .mul(await oracle.getTokenPrice(AaveERC20Address, USDC))
    //         .mul(BigNumber.from("10").pow("6")),
    //     )
    //       .div(BigNumber.from("10").pow(BigNumber.from("18").add("18")))
    //       .mul(BigNumber.from("99"))
    //       .div("100");

    //     const uniswapData = uniRouter.interface.encodeFunctionData("swapExactTokensForTokens", [
    //       expectedAaveRedeemed,
    //       expectedUSDC,
    //       [AaveERC20Address, USDC],
    //       await instance.swapDiamond(),
    //       timestamp + 20 * 60,
    //     ]);

    //     //construct swapData
    //     const calls: string[] = [approveData, uniswapData];
    //     let startIndexes: any[] = ["0"];
    //     let exchangeData = `0x`;
    //     for (const i in calls) {
    //       startIndexes.push(parseInt(startIndexes[i]) + calls[i].substring(2).length / 2);
    //       exchangeData = exchangeData.concat(calls[i].substring(2));
    //     }

    //     startIndexes = startIndexes.map(i => BigNumber.from(i));

    //     swapParams = {
    //       deadline: BigNumber.from(timestamp + 10 * 60),
    //       startIndexes: startIndexes,
    //       values: [BigNumber.from("0"), BigNumber.from("0")],
    //       callees: [AaveERC20Address, UniswapV2Router02Address],
    //       exchangeData,
    //       permit: "0x",
    //     };

    //     const expectedPayload = instance.interface.encodeFunctionData("execute", [
    //       maker.address,
    //       opAaveToken.address,
    //       swapParams,
    //     ]);

    //     const [canExec, execPayload] = ethers.utils.defaultAbiCoder.decode(
    //       ["bool", "bytes"],
    //       await ethers.provider.call({
    //         to: instance.address,
    //         data: _resolverData,
    //       }),
    //     );

    //     // assert the payload
    //     expect(execPayload).to.eq(expectedPayload);

    //     expect(canExec).to.be.true;

    //     expect(
    //       await opsInstance
    //         .connect(GelatoNetworkSigner)
    //         .exec(
    //           ethers.utils.parseEther("1"),
    //           ETH,
    //           instance.address,
    //           true,
    //           true,
    //           resolverHash,
    //           instance.address,
    //           execPayload,
    //         ),
    //     )
    //       .to.emit(instance, "DeliverShares")
    //       .withArgs(maker.address);
    //   });

    //   it("UniV3: Gelato resolves the order, limit order emits DeliverShares event after deposit to opUSDC vault", async () => {
    //     //calculate expectedOPUSDCShares to reach user after fees
    //     const opUSDCVault = await ethers.getContractAt("Vault", UsdcVaultProxy);
    //     const opAAVEprice = await AaveVaultInstance.getPricePerFullShare();
    //     const opUSDCprice = await opUSDCVault.getPricePerFullShare();
    //     const USDCAmountAfterFee = USDCAmount.sub(fee);
    //     //taken from opUSDCVault.vaultConfiguration() and replace 0x06 with 0x02
    //     const newVaultConfig = "0x0201000000000000000000000000000000000000000000640000000000000000";
    //     //remove opUSDCVault whitelist
    //     const tx = await opUSDCVault.connect(optyFiVaultOperator).setVaultConfiguration(BigNumber.from(newVaultConfig));

    //     await tx.wait();
    //     //set code + account merkle roots and remove minimum deposit value
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedAccountsRoot(accountRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setWhitelistedCodesRoot(codeRoot);
    //     await opUSDCVault.connect(optyFiVaultOperator).setMinimumDepositValueUT(ethers.constants.Zero);

    //     const userShares = await opAaveToken.balanceOf(maker.address);
    //     orderParamsUniV3.liquidationAmount = ethers.BigNumber.from(userShares).div(2);

    //     const resolverHash = ethers.utils.keccak256(
    //       new ethers.utils.AbiCoder().encode(
    //         ["address", "bytes"],
    //         [
    //           instance.address,
    //           instance.interface.encodeFunctionData("canExecuteOrder", [maker.address, opAaveToken.address]),
    //         ],
    //       ),
    //     );

    //     const _taskId = await opsInstance.getTaskId(
    //       instance.address,
    //       instance.address,
    //       await opsInstance.getSelector("execute(address,address,(uint256,uint256[],uint256[],address[],bytes,bytes))"),
    //       true,
    //       ethers.constants.AddressZero,
    //       resolverHash,
    //     );

    //     const _resolverData = instance.interface.encodeFunctionData("canExecuteOrder", [
    //       maker.address,
    //       opAaveToken.address,
    //     ]);

    //     //create order from maker
    //     expect(await instance.connect(maker).createOrder(orderParamsUniV3))
    //       .to.emit(opsInstance, "TaskCreated")
    //       .withArgs([
    //         instance.address,
    //         instance.address,
    //         await opsInstance.getSelector(
    //           "execute(address,address,(uint256,uint256[],uint256[],address[],bytes,bytes))",
    //         ),
    //         instance.address,
    //         _taskId,
    //         _resolverData,
    //         true,
    //         ethers.constants.AddressZero,
    //         resolverHash,
    //       ]);

    //     const timestamp = await (await ethers.provider.getBlock("latest")).timestamp;

    //     const approveData = AaveERC20.interface.encodeFunctionData("approve", [
    //       uniV3Router.address,
    //       ethers.constants.MaxUint256,
    //     ]);

    //     const expectedAaveRedeemed = opAAVEprice
    //       .mul(orderParamsUniV3.liquidationAmount)
    //       .div(BigNumber.from("10").pow("18"));

    //     const oracle: OptyFiOracle = await ethers.getContractAt("OptyFiOracle", await instance.oracle());

    //     const expectedUSDC = BigNumber.from(
    //       expectedAaveRedeemed
    //         .mul(await oracle.getTokenPrice(AaveERC20Address, USDC))
    //         .mul(BigNumber.from("10").pow("6")),
    //     )
    //       .div(BigNumber.from("10").pow(BigNumber.from("18").add("18")))
    //       .mul(BigNumber.from("99"))
    //       .div("100");

    //     const uniswapV3Data = uniV3Router.interface.encodeFunctionData("exactInput", [
    //       {
    //         path: uniV3SwapPath,
    //         recipient: await instance.swapDiamond(),
    //         deadline: timestamp + 20 * 60,
    //         amountIn: expectedAaveRedeemed,
    //         amountOutMinimum: expectedUSDC,
    //       },
    //     ]);

    //     //construct swapData
    //     const calls: string[] = [approveData, uniswapV3Data];
    //     let startIndexes: any[] = ["0"];
    //     let exchangeData = `0x`;
    //     for (const i in calls) {
    //       startIndexes.push(parseInt(startIndexes[i]) + calls[i].substring(2).length / 2);
    //       exchangeData = exchangeData.concat(calls[i].substring(2));
    //     }

    //     startIndexes = startIndexes.map(i => BigNumber.from(i));

    //     swapParams = {
    //       deadline: BigNumber.from(timestamp + 10 * 60),
    //       startIndexes: startIndexes,
    //       values: [BigNumber.from("0"), BigNumber.from("0")],
    //       callees: [AaveERC20Address, uniV3Router.address],
    //       exchangeData,
    //       permit: "0x",
    //     };

    //     const expectedPayload = instance.interface.encodeFunctionData("execute", [
    //       maker.address,
    //       opAaveToken.address,
    //       swapParams,
    //     ]);

    //     const [canExec, execPayload] = ethers.utils.defaultAbiCoder.decode(
    //       ["bool", "bytes"],
    //       await ethers.provider.call({
    //         to: instance.address,
    //         data: _resolverData,
    //       }),
    //     );

    //     // assert the payload
    //     expect(execPayload).to.eq(expectedPayload);

    //     expect(canExec).to.be.true;

    //     expect(
    //       await opsInstance
    //         .connect(GelatoNetworkSigner)
    //         .exec(
    //           ethers.utils.parseEther("1"),
    //           ETH,
    //           instance.address,
    //           true,
    //           true,
    //           resolverHash,
    //           instance.address,
    //           execPayload,
    //         ),
    //     )
    //       .to.emit(instance, "DeliverShares")
    //       .withArgs(maker.address);
    //   });

    //   describe("reverts if", () => {
    //     it("user does not have an active order", async () => {
    //       const [_canExec, execPayload] = await instance.canExecuteOrder(optyFiVaultOperator.address, AaveVaultProxy);
    //       expect(_canExec).to.be.false;
    //       expect(execPayload).to.eq(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("no active order")));

    //       await expect(
    //         instance.connect(optyFiVaultOperator).execute(optyFiVaultOperator.address, AaveVaultProxy, swapParams),
    //       ).to.be.revertedWith("no active order");
    //     });

    //     it("vault does not permit deposits", async () => {
    //       const userShares = await opAaveToken.balanceOf(maker.address);
    //       orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);
    //       //create order from maker
    //       await instance.connect(maker).createOrder(orderParams);
    //       //since opUSDCVault is whitelisted, LimitOrder Contracts will not be able to deposit so 'catch' statement
    //       //will execute, returning USDC to maker
    //       await expect(instance.connect(maker).execute(maker.address, AaveVaultProxy, swapParams)).to.be.reverted;
    //     });

    //     it("order has expired", async () => {
    //       const userShares = await opAaveToken.balanceOf(maker.address);
    //       orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);

    //       await instance.connect(maker).createOrder({
    //         liquidationAmount: ethers.BigNumber.from("0"),
    //         expiration: (await (await ethers.provider.getBlock("latest")).timestamp) + 1,
    //         upperBound: ethers.utils.parseEther("150"),
    //         lowerBound: ethers.utils.parseEther("50"),
    //         direction: ethers.constants.One,
    //         returnLimitBP: ethers.utils.parseEther("0.99"),
    //         vault: AaveVaultProxy,
    //         stablecoinVault: UsdcVaultProxy,
    //         dexRouter: UniswapV2Router02Address,
    //         uniV2Path: [AaveERC20Address, USDC],
    //         uniV3Path: "0x",
    //         swapOnUniV3: false,
    //       });

    //       const expiredTimestamp = (await (await ethers.provider.getBlock("latest")).timestamp) + 10000;

    //       await hre.network.provider.send("evm_setNextBlockTimestamp", [expiredTimestamp]);

    //       const [_canExec, execPayload] = await instance.canExecuteOrder(maker.address, AaveVaultProxy);
    //       expect(_canExec).to.be.false;
    //       expect(execPayload).to.eq(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("expired")));

    //       await expect(instance.connect(maker).execute(maker.address, AaveVaultProxy, swapParams)).to.be.revertedWith(
    //         "expired",
    //       );
    //     });

    //     it("price is outwith bounds when set to be within bounds", async () => {
    //       const userShares = await opAaveToken.balanceOf(maker.address);
    //       modifyOrderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(3);
    //       modifyOrderParams.direction = ethers.constants.One;
    //       await instance.connect(maker).createOrder(modifyOrderParams);

    //       const oracle: OptyFiOracle = await ethers.getContractAt("OptyFiOracle", await instance.oracle());
    //       const price = await oracle.getTokenPrice(AaveERC20.address, USD);

    //       const [_canExec, execPayload] = await instance.canExecuteOrder(maker.address, AaveVaultProxy);
    //       expect(_canExec).to.be.false;
    //       expect(execPayload).to.eq(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("price out with bounds")));

    //       await expect(instance.connect(maker).execute(maker.address, AaveVaultProxy, swapParams)).to.be.revertedWith(
    //         "price out with bounds",
    //       );
    //     });

    //     it("price is within bounds when set to be outwith bounds", async () => {
    //       const userShares = await opAaveToken.balanceOf(maker.address);
    //       modifyOrderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(3);
    //       modifyOrderParams.direction = ethers.constants.Zero;
    //       modifyOrderParams.lowerBound = ethers.utils.parseEther("50.0");
    //       modifyOrderParams.upperBound = ethers.utils.parseEther("70.0");

    //       await instance.connect(maker).createOrder(modifyOrderParams);

    //       const oracle: OptyFiOracle = await ethers.getContractAt("OptyFiOracle", await instance.oracle());
    //       const price = await oracle.getTokenPrice(AaveERC20.address, USD);

    //       const [_canExec, execPayload] = await instance.canExecuteOrder(maker.address, AaveVaultProxy);
    //       expect(_canExec).to.be.false;
    //       expect(execPayload).to.eq(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("price within bounds")));

    //       await expect(instance.connect(maker).execute(maker.address, AaveVaultProxy, swapParams)).to.be.revertedWith(
    //         "price within bounds",
    //       );
    //     });

    //     it("return limit > swap output", async () => {
    //       const userShares = await opAaveToken.balanceOf(maker.address);
    //       orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);
    //       //set return limi to be 3x what is swapped so will always fail
    //       orderParams.returnLimitBP = ethers.utils.parseEther("3.0");
    //       //create order from maker
    //       await instance.connect(maker).createOrder(orderParams);

    //       await expect(instance.connect(maker).execute(maker.address, AaveVaultProxy, swapParams)).to.be.revertedWith(
    //         `InsufficientReturn()`,
    //       );
    //     });

    //     it("user does not have enough share balance", async () => {
    //       const userShares = await opAaveToken.balanceOf(maker.address);
    //       orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);

    //       await instance.connect(maker).createOrder(orderParams);

    //       await opAaveToken.connect(maker).transfer(nonMaker.address, userShares);

    //       const [_canExec, execPayload] = await instance.canExecuteOrder(maker.address, AaveVaultProxy);
    //       expect(_canExec).to.be.false;
    //       expect(execPayload).to.eq(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("Not enough shares")));

    //       await opAaveToken.connect(nonMaker).transfer(maker.address, userShares);
    //     });
    //   });

    //   describe("prevent malicious swap data attack vectors", () => {
    //     it("prevents false beneficiary attack via internal setting beneficiary == LimitOrderDiamond.address", async () => {
    //       const userShares = await opAaveToken.balanceOf(maker.address);
    //       orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);
    //       //create order from maker
    //       await instance.connect(maker).createOrder(orderParams);

    //       //calculate user shares
    //       const userSharesLiquidated = orderParams.liquidationAmount;

    //       //approve LO contract
    //       await opAaveToken.connect(maker).approve(instance.address, userSharesLiquidated);

    //       //no fees in opAAVEvault so should be precise
    //       const expectedAaveRedeemed = userSharesLiquidated
    //         .mul(await AaveVaultInstance.getPricePerFullShare())
    //         .div(BASIS); //must divide by basis as getPricePerFullShare returns 10**18

    //       //calculate call datas for approve + swap
    //       const aaveERC20Interface = AaveERC20.interface;
    //       const approveData = aaveERC20Interface.encodeFunctionData("approve", [
    //         uniRouter.address,
    //         ethers.utils.parseEther("10000"),
    //       ]);

    //       const swapDeadline = expiration.add(BigNumber.from("1000000000000000000000000000000000000"));

    //       //ENCODE MALICIOUS SWAP DATA
    //       const uniswapData = uniRouter.interface.encodeFunctionData("swapExactTokensForTokens", [
    //         expectedAaveRedeemed,
    //         ethers.constants.Zero,
    //         [AaveERC20Address, USDC],
    //         attacker.address,
    //         swapDeadline,
    //       ]);

    //       //construct swapData
    //       const calls: string[] = [approveData, uniswapData];
    //       let startIndexes: any[] = ["0"];
    //       let exchangeData = `0x`;
    //       for (const i in calls) {
    //         startIndexes.push(parseInt(startIndexes[i]) + calls[i].substring(2).length / 2);
    //         exchangeData = exchangeData.concat(calls[i].substring(2));
    //       }

    //       startIndexes = startIndexes.map(i => BigNumber.from(i));

    //       swapParams = {
    //         callees: [AaveERC20Address, UniswapV2Router02Address],
    //         exchangeData,
    //         startIndexes,
    //         values: [BigNumber.from("0"), BigNumber.from("0")],
    //         permit: "0x",
    //         deadline: swapDeadline,
    //       };

    //       //attacker attempts to send liquidated + swapped tokens to themselves, however
    //       //OptyFiSwapper has received no tokens, therefore reverts
    //       await expect(
    //         instance.connect(attacker).execute(maker.address, AaveVaultProxy, swapParams),
    //       ).to.be.revertedWith("InsufficientReturn()");
    //     });
    //   });
    // });

    // describe("#modifyOrder(address,struct(OrderParams))", () => {
    //   it("modifies an existing order", async () => {
    //     const userShares = await opAaveToken.balanceOf(maker.address);
    //     orderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(2);
    //     await instance.connect(maker).createOrder(orderParams);

    //     modifyOrderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(3);

    //     await instance.connect(maker).modifyOrder(AaveVaultProxy, modifyOrderParams);

    //     const makerOrder = await instance.userVaultOrder(maker.address, AaveVaultProxy);
    //     const modifiedOrder: Order = {
    //       liquidationAmount: makerOrder.liquidationAmount,
    //       expiration: makerOrder.expiration,
    //       lowerBound: makerOrder.lowerBound,
    //       upperBound: makerOrder.upperBound,
    //       direction: BigNumber.from(makerOrder.direction.toString()),
    //       returnLimitBP: makerOrder.returnLimitBP,
    //       stablecoinVault: UsdcVaultProxy,
    //       maker: makerOrder.maker,
    //       vault: makerOrder.vault,
    //       swapOnUniV3: makerOrder.swapOnUniV3,
    //       dexRouter: makerOrder.dexRouter,
    //       uniV2Path: makerOrder.uniV2Path,
    //       uniV3Path: makerOrder.uniV3Path,
    //     };

    //     const order = convertOrderParamsToOrder(modifyOrderParams, maker.address);

    //     expect(order).to.deep.eq(modifiedOrder);
    //   });

    //   describe("reverts if", () => {
    //     it("user does not have an active order to modify", async () => {
    //       const userShares = await opAaveToken.balanceOf(maker.address);
    //       modifyOrderParams.liquidationAmount = ethers.BigNumber.from(userShares).div(3);
    //       await expect(instance.connect(maker).modifyOrder(AaveVaultProxy, modifyOrderParams)).to.be.revertedWith(
    //         `NoActiveOrder("${maker.address}")`,
    //       );
    //     });

    //     it("expiration is before current block timestamp", async () => {
    //       await instance.connect(maker).createOrder(orderParams);

    //       await hre.network.provider.send("evm_setNextBlockTimestamp", [orderParams.expiration.toNumber()]);

    //       modifyOrderParams.expiration = ethers.constants.Zero;

    //       await expect(instance.connect(maker).modifyOrder(AaveVaultProxy, modifyOrderParams)).to.be.revertedWith(
    //         `PastExpiration(${orderParams.expiration}, ${modifyOrderParams.expiration})`,
    //       );
    //     });

    //     it("lower bound is larger than upper bound", async () => {
    //       await instance.connect(maker).createOrder(orderParams);

    //       modifyOrderParams.upperBound = ethers.constants.Zero;
    //       modifyOrderParams.expiration = orderParams.expiration.add(BigNumber.from("10000"));
    //       await expect(instance.connect(maker).modifyOrder(AaveVaultProxy, modifyOrderParams)).to.be.revertedWith(
    //         `ReverseBounds()`,
    //       );
    //     });

    //     it("destination is not whitelisted", async () => {
    //       await instance.connect(maker).createOrder(orderParams);

    //       modifyOrderParams.lowerBound = orderParams.lowerBound;
    //       modifyOrderParams.upperBound = orderParams.upperBound;
    //       modifyOrderParams.stablecoinVault = maker.address;
    //       await expect(instance.connect(maker).modifyOrder(AaveVaultProxy, modifyOrderParams)).to.be.revertedWith(
    //         `ForbiddenDestination()`,
    //       );
    //     });
    //   });
    // });
  });
}
