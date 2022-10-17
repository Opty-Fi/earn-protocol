import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { addABI } from "abi-decoder";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { ILimitOrder__factory, IOps__factory } from "../../../typechain";
import { Order, OrderParams } from "../../../helpers/type";
import { getAddress, parseEther } from "ethers/lib/utils";
import { convertOrderParamsToOrder } from "../../../helpers/utils";

addABI(ILimitOrder__factory.abi);
addABI(IOps__factory.abi);

export function describeBehaviorOfLimitOrderView(_skips?: string[]): void {
  const Gelato_Pokeme = "0xB3f5503f93d5Ef84b06993a1975B9D21B962892F"; // mainnet

  //Params
  const expirationNum = 1657190461 + 120; //unix timestamp of block 15095000 + 120s
  const expiration = BigNumber.from(expirationNum.toString());

  const UniswapV2Router02Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; //mainnet
  const UniswapV3RouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; //mainnet

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

  const liquidationFeeBP = ethers.utils.parseEther("0.02");

  describe(":LimitOrderView", () => {
    before(async function () {
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
        swapDeadlineAdjustment: BigNumber.from("1200"), // 20 minutes
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
        swapDeadlineAdjustment: BigNumber.from("1200"), // 20 minutes
        stablecoinVault: this.opUSDCSave.address,
        vault: this.opAAVEInvst.address,
        expectedOutputVT: BigNumber.from("0"),
        permitParams: "0x",
        dexRouter: UniswapV3RouterAddress,
        uniV3Path: uniV3SwapPath,
        uniV2Path: [],
        swapOnUniV3: true,
      };
    });

    describe("#userVaultOrder(address,address)", () => {
      it("returns the order made by a given user for a given vault", async function () {
        orderParams.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");

        await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);
        const makerOrder = await this.limitOrder.userVaultOrder(this.signers.alice.address, this.opAAVEInvst.address);

        const createdOrder: Order = {
          liquidationAmountVT: BigNumber.from(makerOrder.liquidationAmountVT),
          expiration: BigNumber.from(makerOrder.expiration),
          lowerBound: BigNumber.from(makerOrder.lowerBound),
          upperBound: BigNumber.from(makerOrder.upperBound),
          returnLimitUT: BigNumber.from(makerOrder.returnLimitUT),
          stablecoinVault: this.opUSDCSave.address,
          maker: makerOrder.maker,
          vault: makerOrder.vault,
          direction: BigNumber.from(makerOrder.direction.toString()).toNumber(),
          dexRouter: makerOrder.dexRouter,
          swapOnUniV3: makerOrder.swapOnUniV3,
          uniV2Path: makerOrder.uniV2Path,
          uniV3Path: makerOrder.uniV3Path,
          expectedOutputUT: BigNumber.from(makerOrder.expectedOutputUT),
          expectedOutputVT: BigNumber.from(makerOrder.expectedOutputVT),
          swapDeadlineAdjustment: BigNumber.from(makerOrder.swapDeadlineAdjustment),
          taskId: makerOrder.taskId,
          permitParams: makerOrder.permitParams,
        };

        expect(createdOrder).to.deep.equal(
          convertOrderParamsToOrder(orderParams, this.signers.alice.address, createdOrder.taskId),
        );
      });
    });

    describe("#userVaultOrderActive(address,address)", () => {
      it("returns active status of a user vault order", async function () {
        await this.limitOrder.connect(this.signers.alice).createOrder(orderParams);
        expect(await this.limitOrder.userVaultOrderActive(this.signers.alice.address, this.opAAVEInvst.address)).to.eq(
          true,
        );
      });
    });

    describe("#vaultLiquidationFee(address)", () => {
      it("returns the fee in basis points for a given vault", async function () {
        await this.limitOrder
          .connect(this.signers.deployer)
          .setVaultLiquidationFee(liquidationFeeBP, this.opAAVEInvst.address);
        expect(await this.limitOrder.liquidationFee(this.opAAVEInvst.address)).to.eq(liquidationFeeBP);
      });
    });

    describe("#treasury()", () => {
      it("returns the address of the treasury", async function () {
        await this.limitOrder.connect(this.signers.deployer).setTreasury(this.signers.alice.address);
        expect(await this.limitOrder.treasury()).to.eq(this.signers.alice.address);
      });
    });

    describe("#accountProof(address)", () => {
      it("returns the accountProof of the LimitOrder instance for a given vault", async function () {
        //note: this is the initialization value
        expect((await this.limitOrder.accountProof(this.opAAVEInvst.address)).length).to.eq(ethers.constants.Zero);
      });
    });

    describe("#ops()", () => {
      it("returns the address of the opsInstance", async function () {
        expect(await this.limitOrder.ops()).to.eq(Gelato_Pokeme);
      });
    });

    describe("#canExecute(address,address)", () => {
      let snapshotId: any;

      beforeEach(async function () {
        snapshotId = await ethers.provider.send("evm_snapshot", []);

        //calculate user shares
        const userShares = await this.opAAVEInvst.balanceOf(this.signers.alice.address);
        orderParams.liquidationAmountVT = ethers.BigNumber.from(userShares).div("2");

        //approve LO contract
        await this.opAAVEInvst
          .connect(this.signers.alice)
          .approve(this.limitOrder.address, ethers.constants.MaxUint256);
      });

      afterEach(async function () {
        await ethers.provider.send("evm_revert", [snapshotId]);
      });

      it("if an order may be executed via UniV3 Router by gelato, returns true and the execution payload", async function () {
        orderParamsUniV3.liquidationAmountVT = BigNumber.from("1000");
        orderParamsUniV3.expiration = BigNumber.from((await ethers.provider.getBlock("latest")).timestamp).add("600");

        await this.limitOrder.connect(this.signers.alice).createOrder(orderParamsUniV3);
        const _currentTimeStamp = (await ethers.provider.getBlock("latest")).timestamp;
        const expectedPayload = this.limitOrder.interface.encodeFunctionData("execute", [
          this.signers.alice.address,
          this.opAAVEInvst.address,
          BigNumber.from(_currentTimeStamp).add(orderParamsUniV3.swapDeadlineAdjustment),
        ]);
        const [canExec, payload] = await this.limitOrder.canExecuteOrder(
          this.signers.alice.address,
          this.opAAVEInvst.address,
        );
        expect(payload).to.eq(expectedPayload);
        expect(canExec).to.be.true;
      });
    });

    describe("#vaultWhitelisted(address)", () => {
      it("returns the whitelisted state of a vault", async function () {
        expect(await this.limitOrder.vaultWhitelisted(this.opAAVEInvst.address)).to.eq(true);
      });
    });

    describe("#stablecoinVaultWhitelisted(address)", () => {
      it("returns the whitelisted state of a stablecoinvault", async function () {
        expect(await this.limitOrder.stablecoinVaultWhitelisted(this.opUSDCSave.address)).to.eq(true);
      });
    });
  });
}
