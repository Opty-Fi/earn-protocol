import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber } from "ethers";
import hre, { deployments } from "hardhat";
import {
  ERC20,
  ERC20Permit,
  IncentivisedERC20__factory,
  IOptyFiZapper,
  ISwapper,
  IUniswapV2Router02,
  Vault,
} from "../typechain";
import { ZapData } from "../helpers/type";
import { expect } from "chai";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { getAccountsMerkleRoot, getCodesMerkleRoot } from "../helpers/utils";
import { getPermitSignature } from "./utils";

export function describeBehaviorOfOptyFiZapper(deploy: () => Promise<IOptyFiZapper>, skips?: string[]) {
  const ethers = hre.ethers;
  let owner: SignerWithAddress;
  let maker: SignerWithAddress;
  let UNIWhale: SignerWithAddress;

  let instance: IOptyFiZapper;
  let swapper: ISwapper;
  let USDCERC20: ERC20;
  let WETHERC20: ERC20;
  let UNIERC20: ERC20;
  let uniRouter: IUniswapV2Router02;
  let vault: Vault;
  let vaultToken: ERC20Permit;
  let zapData: ZapData;

  let snapshotId: number;
  let usdcZapOutAmount: BigNumber;
  let OPUSDCGROW_VAULT_ADDRESS: string;

  //EOA
  const UNIWhaleAddress = "0x7d2d43e63666f45b40316b44212325625dbaeb40";

  //tokens
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const UNI = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

  //contracts
  const UniswapV2Router02Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  const swapDeadline = BigNumber.from("1000000000000000000000000000000000000");
  const uniSwapAmount = ethers.utils.parseUnits("100", 18);
  const ethSwapAmount = ethers.utils.parseEther("10");

  describe("::Zap", () => {
    before(async () => {
      OPUSDCGROW_VAULT_ADDRESS = (await deployments.get("opUSDCgrow")).address;
      vault = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPUSDCGROW_VAULT_ADDRESS);
      vaultToken = <ERC20Permit>await ethers.getContractAt(IncentivisedERC20__factory.abi, OPUSDCGROW_VAULT_ADDRESS);

      await vault.setUnpaused(true);
      await vault.setValueControlParams(
        "1000000000000", // userDepositCapUT: 1,000,000 USDC
        "0", // minimumDepositValueUT: 0 USDC
        "1000000000000000", // totalValueLockedLimitUT: 1,000,000,000 USDC
      );

      [owner, maker] = await ethers.getSigners();

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [UNIWhaleAddress],
      });

      UNIWhale = await ethers.getSigner(ethers.utils.getAddress(UNIWhaleAddress));
      uniRouter = await ethers.getContractAt("IUniswapV2Router02", UniswapV2Router02Address);
      USDCERC20 = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, USDC);
      WETHERC20 = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, WETH);
      UNIERC20 = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, UNI);
    });

    beforeEach(async () => {
      let tx;
      instance = await deploy();
      snapshotId = await ethers.provider.send("evm_snapshot", []);

      //whitelist zap code
      const code = await ethers.provider.getCode(instance.address);
      const codeHash = ethers.utils.keccak256(code);
      const _codeRoot = getCodesMerkleRoot([codeHash]);
      await vault.setWhitelistedCodesRoot(_codeRoot);

      //whitelist zap account
      const _accountRoot = getAccountsMerkleRoot([instance.address]);
      await vault.setWhitelistedAccountsRoot(_accountRoot);

      //provide UNI whale with ETH to make required transactions
      tx = maker.sendTransaction({
        to: UNIWhaleAddress,
        value: ethers.utils.parseEther("1.0"),
        gasLimit: 10000000,
      });

      (await tx).wait();

      tx = UNIERC20.connect(UNIWhale).transfer(maker.address, ethers.utils.parseUnits("100000", 18));

      (await tx).wait();
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
    });

    describe("#ZapIn(address,uint256,struct(ZapData))", () => {
      it("ETH => opUSDCgrow", async () => {
        //calculate call datas for swap
        const uniswapData = uniRouter.interface.encodeFunctionData("swapExactETHForTokens", [
          ethers.constants.Zero,
          [WETH, USDC],
          await instance.getSwapper(),
          swapDeadline,
        ]);

        //construct swapData
        const calls: string[] = [uniswapData];
        const startIndexes = ["0"];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        zapData = {
          vault: OPUSDCGROW_VAULT_ADDRESS,
          toAmount: ethers.constants.One,
          deadline: swapDeadline,
          exchangeData: exchangeData,
          permit: "0x",
          callees: [uniRouter.address],
          startIndexes: startIndexes,
          values: [ethSwapAmount],
          accountsProof: [],
          codesProof: [],
        };

        const expectedReturns = await uniRouter.getAmountsOut(ethSwapAmount, [WETH, USDC]);

        const _previousBalance = await vault.balanceOf(maker.address);
        const _previousVaultBalance = await vault.balanceUT();

        //zap ETH -> opUSDCgrow
        await expect(instance.connect(maker).zapIn(ETH, ethSwapAmount, "0x", zapData, { value: ethSwapAmount }))
          .to.emit(vault, "Transfer")
          .withArgs(ethers.constants.AddressZero, maker.address, expectedReturns[1]);
        expect(await USDCERC20.balanceOf(vault.address)).to.eq(_previousVaultBalance.add(expectedReturns[1]));
        expect(await vault.totalSupply()).to.eq(_previousVaultBalance.add(expectedReturns[1]));
        expect(await vault.totalDeposits(maker.address)).to.eq(_previousBalance.add(expectedReturns[1]));
        // the vault shares VT will be same as total supply is zero
        expect(await vault.balanceOf(maker.address)).to.eq(_previousBalance.add(expectedReturns[1]));
      });

      it("UNI => opUSDCgrow", async () => {
        await UNIERC20.connect(maker).approve(instance.address, uniSwapAmount);

        //calculate call datas for swap
        const uniswapData = uniRouter.interface.encodeFunctionData("swapExactTokensForTokens", [
          uniSwapAmount,
          ethers.constants.Zero,
          [UNI, USDC],
          await instance.getSwapper(),
          swapDeadline,
        ]);
        const approveData = UNIERC20.interface.encodeFunctionData("approve", [uniRouter.address, uniSwapAmount.mul(2)]);

        //construct swapData
        const calls: string[] = [approveData, uniswapData];
        const startIndexes = ["0"];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        zapData = {
          vault: OPUSDCGROW_VAULT_ADDRESS,
          toAmount: ethers.constants.One,
          deadline: swapDeadline,
          exchangeData: exchangeData,
          permit: "0x",
          callees: [UNIERC20.address, uniRouter.address],
          startIndexes: startIndexes,
          values: [ethers.constants.Zero, ethers.constants.Zero],
          accountsProof: [],
          codesProof: [],
        };

        const expectedReturns = await uniRouter.getAmountsOut(uniSwapAmount, [UNI, USDC]);

        const _previousBalance = await vault.balanceOf(maker.address);
        const _previousVaultBalance = await vault.balanceUT();

        //zap UNI -> opUSDCgrow
        await expect(instance.connect(maker).zapIn(UNI, uniSwapAmount, "0x", zapData))
          .to.emit(vault, "Transfer")
          .withArgs(ethers.constants.AddressZero, maker.address, expectedReturns[1]);
        expect(await USDCERC20.balanceOf(vault.address)).to.eq(_previousVaultBalance.add(expectedReturns[1]));
        expect(await vault.totalSupply()).to.eq(_previousVaultBalance.add(expectedReturns[1]));
        expect(await vault.totalDeposits(maker.address)).to.eq(_previousBalance.add(expectedReturns[1]));
        // the vault shares VT will be same as total supply is zero
        expect(await vault.balanceOf(maker.address)).to.eq(_previousBalance.add(expectedReturns[1]));
      });
    });

    describe("#ZapOut(address,uint256,struct(ZapData))", () => {
      beforeEach(async () => {
        const uniswapData = uniRouter.interface.encodeFunctionData("swapExactETHForTokens", [
          ethers.constants.Zero,
          [WETH, USDC],
          await instance.getSwapper(),
          swapDeadline,
        ]);

        //construct swapData
        const calls: string[] = [uniswapData];
        const startIndexes = ["0"];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        zapData = {
          vault: OPUSDCGROW_VAULT_ADDRESS,
          toAmount: ethers.constants.One,
          deadline: swapDeadline,
          exchangeData: exchangeData,
          permit: "0x",
          callees: [uniRouter.address],
          startIndexes: startIndexes,
          values: [ethSwapAmount],
          accountsProof: [],
          codesProof: [],
        };

        //zap ETH -> opUSDCgrow
        await instance.connect(maker).zapIn(ETH, ethSwapAmount, "0x", zapData, { value: ethSwapAmount });
      });

      it("opUSDCgrow => ETH", async () => {
        usdcZapOutAmount = await vault.balanceOf(maker.address);

        //calculate call datas for swap
        const uniswapData = uniRouter.interface.encodeFunctionData("swapExactTokensForETH", [
          usdcZapOutAmount,
          ethers.constants.Zero,
          [USDC, WETH],
          await instance.getSwapper(),
          swapDeadline,
        ]);

        const approveData = USDCERC20.interface.encodeFunctionData("approve", [uniRouter.address, usdcZapOutAmount]);

        //construct swapData
        const calls: string[] = [approveData, uniswapData];
        const startIndexes = ["0"];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        zapData = {
          vault: OPUSDCGROW_VAULT_ADDRESS,
          toAmount: ethers.constants.One,
          deadline: swapDeadline,
          exchangeData: exchangeData,
          permit: "0x",
          callees: [USDCERC20.address, uniRouter.address],
          startIndexes: startIndexes,
          values: [ethers.constants.Zero, ethers.constants.Zero],
          accountsProof: [],
          codesProof: [],
        };

        const expectedReturns = await uniRouter.getAmountsOut(usdcZapOutAmount, [USDC, WETH]);

        // const deadline = ethers.constants.MaxUint256;
        // const { v, r, s } = await getPermitSignature(maker, vaultToken, instance.address, usdcZapOutAmount, deadline);
        // const dataPermit = ethers.utils.defaultAbiCoder.encode(
        //   ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
        //   [maker.address, instance.address, usdcZapOutAmount, deadline, v, r, s],
        // );
        await vaultToken.connect(maker).approve(instance.address, usdcZapOutAmount);
        //zap UNI -> opUSDCgrow
        await expect(await instance.connect(maker).zapOut(ETH, usdcZapOutAmount, "0x", zapData)).to.changeEtherBalance(
          maker,
          expectedReturns[1],
        );
      });

      it("opUSDCgrow => WETH", async () => {
        usdcZapOutAmount = await vault.balanceOf(maker.address);

        await vaultToken.connect(maker).approve(instance.address, usdcZapOutAmount);

        //calculate call datas for swap
        const uniswapData = uniRouter.interface.encodeFunctionData("swapExactTokensForTokens", [
          usdcZapOutAmount,
          ethers.constants.Zero,
          [USDC, WETH],
          await instance.getSwapper(),
          swapDeadline,
        ]);

        const approveData = USDCERC20.interface.encodeFunctionData("approve", [uniRouter.address, usdcZapOutAmount]);

        //construct swapData
        const calls: string[] = [approveData, uniswapData];
        const startIndexes = ["0"];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        zapData = {
          vault: OPUSDCGROW_VAULT_ADDRESS,
          toAmount: ethers.constants.One,
          deadline: swapDeadline,
          exchangeData: exchangeData,
          permit: "0x",
          callees: [USDCERC20.address, uniRouter.address],
          startIndexes: startIndexes,
          values: [ethers.constants.Zero, ethers.constants.Zero],
          accountsProof: [],
          codesProof: [],
        };

        const expectedReturns = await uniRouter.getAmountsOut(usdcZapOutAmount, [USDC, WETH]);

        // const deadline = ethers.constants.MaxUint256;
        // const { v, r, s } = await getPermitSignature(
        //   maker,
        //   vaultToken,
        //   instance.address,
        //   usdcZapOutAmount,
        //   deadline
        // );
        // const dataPermit = ethers.utils.defaultAbiCoder.encode(
        //   ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
        //   [maker.address, instance.address, usdcZapOutAmount, deadline, v, r, s],
        // );
        await vaultToken.connect(maker).approve(instance.address, usdcZapOutAmount);
        // zap opUSDCgrow => WETH
        await expect(() => instance.connect(maker).zapOut(WETH, usdcZapOutAmount, "0x", zapData)).to.changeTokenBalance(
          WETHERC20,
          maker,
          expectedReturns[1],
        );
      });
    });
  });
}
