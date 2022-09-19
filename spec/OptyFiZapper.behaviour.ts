import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber } from "ethers";
import hre, { deployments } from "hardhat";
import {
  ERC20,
  ERC20Permit,
  ERC20Permit__factory,
  IUniswapV2Router02,
  IZap,
  IZapView,
  IZapView__factory,
  Vault,
} from "../typechain";
import { ZapData } from "../helpers/type";
import { expect } from "chai";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { getAccountsMerkleRoot, getCodesMerkleRoot } from "../helpers/utils";
import { getPermitSignature } from "../test/test-opty/utils";

export function describeBehaviorOfOptyFiZapper(deploy: () => Promise<IZap>, skips?: string[]) {
  const ethers = hre.ethers;
  let owner: SignerWithAddress;
  let maker: SignerWithAddress;
  let UNIWhale: SignerWithAddress;
  let USDCWhale: SignerWithAddress;

  let instance: IZap;
  let USDCERC20: ERC20Permit;
  let WETHERC20: ERC20;
  let UNIERC20: ERC20;
  let uniRouter: IUniswapV2Router02;
  let usdcVault: Vault;
  let wethVault: Vault;
  let zapData: ZapData;
  let zapView: IZapView;

  let snapshotId: number;
  let usdcZapOutAmount: BigNumber;
  let OPUSDCGROW_VAULT_ADDRESS: string;
  let OPWETHGROW_VAULT_ADDRESS: string;
  let SWAPPER_ADDRESS: string;

  //EOA mainnet
  const UNIWhaleAddress = "0x7d2d43e63666f45b40316b44212325625dbaeb40";
  const USDCWhaleAddress = "0xc4153b9b781789e899dee4e8b0d1784a81df3cc4";

  //tokens mainnet
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const UNI = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

  //contracts mainnet
  const UniswapV2Router02Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  const swapDeadline = BigNumber.from("1000000000000000000000000000000000000");
  const uniSwapAmount = ethers.utils.parseUnits("100", 18);
  const usdcSwapAmount = ethers.utils.parseUnits("100000", 6);
  const ethSwapAmount = ethers.utils.parseEther("10");

  describe("::Zap", () => {
    before(async () => {
      // USDC Vault
      OPUSDCGROW_VAULT_ADDRESS = (await deployments.get("opUSDCgrow")).address;
      usdcVault = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPUSDCGROW_VAULT_ADDRESS);

      // WETH Vault
      OPWETHGROW_VAULT_ADDRESS = (await deployments.get("opWETHgrow")).address;
      wethVault = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPWETHGROW_VAULT_ADDRESS);

      [owner, maker] = await ethers.getSigners();

      await usdcVault.connect(owner).setUnpaused(true);
      await usdcVault.connect(owner).setValueControlParams(
        "1000000000000", // userDepositCapUT: 1,000,000 USDC
        "0", // minimumDepositValueUT: 0 USDC
        "1000000000000000", // totalValueLockedLimitUT: 1,000,000,000 USDC
      );

      await wethVault.connect(owner).setUnpaused(true);
      await wethVault.connect(owner).setValueControlParams(
        "100000000000000000000", // userDepositCapUT: 100 WETH
        "0", // minimumDepositValueUT: 0 USDC
        "1000000000000000000000000", // totalValueLockedLimitUT: 1,000,000 USDC
      );

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [UNIWhaleAddress],
      });

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [USDCWhaleAddress],
      });

      UNIWhale = await ethers.getSigner(ethers.utils.getAddress(UNIWhaleAddress));
      USDCWhale = await ethers.getSigner(ethers.utils.getAddress(USDCWhaleAddress));
      uniRouter = await ethers.getContractAt("IUniswapV2Router02", UniswapV2Router02Address);
      USDCERC20 = <ERC20Permit>await ethers.getContractAt(ERC20Permit__factory.abi, USDC);
      WETHERC20 = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, WETH);
      UNIERC20 = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, UNI);
    });

    beforeEach(async () => {
      let tx;
      instance = await deploy();
      zapView = await ethers.getContractAt(IZapView__factory.abi, instance.address);
      SWAPPER_ADDRESS = await zapView.getSwapper();
      snapshotId = await ethers.provider.send("evm_snapshot", []);

      //whitelist zap code
      const code = await ethers.provider.getCode(instance.address);
      const codeHash = ethers.utils.keccak256(code);
      const _codeRoot = getCodesMerkleRoot([codeHash]);
      await usdcVault.setWhitelistedCodesRoot(_codeRoot);
      await wethVault.setWhitelistedCodesRoot(_codeRoot);

      //whitelist zap account
      const _accountRoot = getAccountsMerkleRoot([instance.address]);
      await usdcVault.setWhitelistedAccountsRoot(_accountRoot);
      await wethVault.setWhitelistedAccountsRoot(_accountRoot);

      //provide UNI whale with ETH to make required transactions
      tx = maker.sendTransaction({
        to: UNIWhaleAddress,
        value: ethers.utils.parseEther("0.1"),
        gasLimit: 10000000,
      });
      (await tx).wait();

      tx = UNIERC20.connect(UNIWhale).transfer(maker.address, ethers.utils.parseUnits("100000", 18));
      (await tx).wait();

      //provide USDC whale with ETH to make required transactions
      tx = maker.sendTransaction({
        to: USDCWhaleAddress,
        value: ethers.utils.parseEther("0.1"),
        gasLimit: 10000000,
      });
      (await tx).wait();

      tx = USDCERC20.connect(USDCWhale).transfer(maker.address, ethers.utils.parseUnits("1000000", 6));
      (await tx).wait();
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
    });

    describe("#ZapIn(address,uint256,struct(ZapData))", () => {
      describe("UNI => opUSDCgrow (using approve)", () => {
        beforeEach(async () => {
          await UNIERC20.connect(maker).approve(instance.address, uniSwapAmount);

          //calculate call datas for swap
          const uniswapData = uniRouter.interface.encodeFunctionData("swapExactTokensForTokens", [
            uniSwapAmount,
            ethers.constants.Zero,
            [UNI, USDC],
            SWAPPER_ADDRESS,
            swapDeadline,
          ]);
          const approveData = UNIERC20.interface.encodeFunctionData("approve", [
            uniRouter.address,
            uniSwapAmount.mul(2),
          ]);

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
        });

        it("vault emits Transfer event", async () => {
          const expectedReturns = await uniRouter.getAmountsOut(uniSwapAmount, [UNI, USDC]);

          //zap UNI -> opUSDCgrow
          await expect(instance.connect(maker).zapIn(UNI, uniSwapAmount, "0x", zapData))
            .to.emit(usdcVault, "Transfer")
            .withArgs(ethers.constants.AddressZero, maker.address, expectedReturns[1]);
        });

        it("increases opVault token balance by zapped amount", async () => {
          const expectedReturns = await uniRouter.getAmountsOut(uniSwapAmount, [UNI, USDC]);

          const _previousBalance = await usdcVault.balanceOf(maker.address);
          const _previousVaultBalance = await usdcVault.balanceUT();

          //zap UNI -> opUSDCgrow
          await expect(instance.connect(maker).zapIn(UNI, uniSwapAmount, "0x", zapData))
            .to.emit(usdcVault, "Transfer")
            .withArgs(ethers.constants.AddressZero, maker.address, expectedReturns[1]);
          expect(await USDCERC20.balanceOf(usdcVault.address)).to.eq(_previousVaultBalance.add(expectedReturns[1]));
          expect(await usdcVault.totalSupply()).to.eq(_previousVaultBalance.add(expectedReturns[1]));
          expect(await usdcVault.totalDeposits(maker.address)).to.eq(_previousBalance.add(expectedReturns[1]));
          // the vault shares VT will be same as total supply is zero
          expect(await usdcVault.balanceOf(maker.address)).to.eq(_previousBalance.add(expectedReturns[1]));
        });
      });

      describe("USDC => opWETHgrow (using permit)", () => {
        beforeEach(async () => {
          //calculate call datas for swap
          const uniswapData = uniRouter.interface.encodeFunctionData("swapExactTokensForTokens", [
            usdcSwapAmount,
            ethers.constants.Zero,
            [USDC, WETH],
            SWAPPER_ADDRESS,
            swapDeadline,
          ]);
          const approveData = USDCERC20.interface.encodeFunctionData("approve", [
            uniRouter.address,
            usdcSwapAmount.mul(2),
          ]);

          //construct swapData
          const calls: string[] = [approveData, uniswapData];
          const startIndexes = ["0"];
          let exchangeData = `0x`;
          for (const i in calls) {
            startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
            exchangeData = exchangeData.concat(calls[i].substring(2));
          }

          zapData = {
            vault: OPWETHGROW_VAULT_ADDRESS,
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
        });

        it("vault emits Transfer event", async () => {
          const deadline = ethers.constants.MaxUint256;
          const { v, r, s } = await getPermitSignature(maker, USDCERC20, instance.address, usdcSwapAmount, deadline, {
            version: "2",
          });
          const dataPermit = ethers.utils.defaultAbiCoder.encode(
            ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
            [maker.address, instance.address, usdcSwapAmount, deadline, v, r, s],
          );

          const expectedReturns = await uniRouter.getAmountsOut(usdcSwapAmount, [USDC, WETH]);
          //zap UNI -> opUSDCgrow
          await expect(instance.connect(maker).zapIn(USDC, usdcSwapAmount, dataPermit, zapData))
            .to.emit(wethVault, "Transfer")
            .withArgs(ethers.constants.AddressZero, maker.address, expectedReturns[1]);
        });

        it("increases opVault token balance by zapped amount", async () => {
          const deadline = ethers.constants.MaxUint256;
          const { v, r, s } = await getPermitSignature(maker, USDCERC20, instance.address, usdcSwapAmount, deadline, {
            version: "2",
          });
          const dataPermit = ethers.utils.defaultAbiCoder.encode(
            ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
            [maker.address, instance.address, usdcSwapAmount, deadline, v, r, s],
          );

          const expectedReturns = await uniRouter.getAmountsOut(usdcSwapAmount, [USDC, WETH]);
          const _previousBalance = await wethVault.balanceOf(maker.address);
          const _previousVaultBalance = await wethVault.balanceUT();
          //zap UNI -> opUSDCgrow
          await instance.connect(maker).zapIn(USDC, usdcSwapAmount, dataPermit, zapData);
          expect(await WETHERC20.balanceOf(wethVault.address)).to.eq(_previousVaultBalance.add(expectedReturns[1]));
          expect(await wethVault.totalSupply()).to.eq(_previousVaultBalance.add(expectedReturns[1]));
          expect(await wethVault.totalDeposits(maker.address)).to.eq(_previousBalance.add(expectedReturns[1]));
          // the vault shares VT will be same as total supply is zero
          expect(await wethVault.balanceOf(maker.address)).to.eq(_previousBalance.add(expectedReturns[1]));
        });
      });

      describe("ETH => opUSDCgrow", () => {
        beforeEach(async () => {
          //calculate call datas for swap
          const uniswapData = uniRouter.interface.encodeFunctionData("swapExactETHForTokens", [
            ethers.constants.Zero,
            [WETH, USDC],
            SWAPPER_ADDRESS,
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
        });

        it("vault emits Transfer event", async () => {
          const expectedReturns = await uniRouter.getAmountsOut(ethSwapAmount, [WETH, USDC]);

          //zap ETH -> opUSDCgrow
          await expect(instance.connect(maker).zapIn(ETH, ethSwapAmount, "0x", zapData, { value: ethSwapAmount }))
            .to.emit(usdcVault, "Transfer")
            .withArgs(ethers.constants.AddressZero, maker.address, expectedReturns[1]);
        });

        it("increases opVault token balance by zapped amount", async () => {
          const expectedReturns = await uniRouter.getAmountsOut(ethSwapAmount, [WETH, USDC]);

          const _previousBalance = await usdcVault.balanceOf(maker.address);
          const _previousVaultBalance = await usdcVault.balanceUT();

          //zap ETH -> opUSDCgrow
          await instance.connect(maker).zapIn(ETH, ethSwapAmount, "0x", zapData, { value: ethSwapAmount });
          expect(await USDCERC20.balanceOf(usdcVault.address)).to.eq(_previousVaultBalance.add(expectedReturns[1]));
          expect(await usdcVault.totalSupply()).to.eq(_previousVaultBalance.add(expectedReturns[1]));
          expect(await usdcVault.totalDeposits(maker.address)).to.eq(_previousBalance.add(expectedReturns[1]));
          // the vault shares VT will be same as total supply is zero
          expect(await usdcVault.balanceOf(maker.address)).to.eq(_previousBalance.add(expectedReturns[1]));
        });
      });
    });

    describe("#ZapOut(address,uint256,struct(ZapData))", () => {
      beforeEach(async () => {
        const uniswapData = uniRouter.interface.encodeFunctionData("swapExactETHForTokens", [
          ethers.constants.Zero,
          [WETH, USDC],
          SWAPPER_ADDRESS,
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

      describe("opUSDCgrow => ETH", () => {
        beforeEach(async () => {
          usdcZapOutAmount = await usdcVault.balanceOf(maker.address);

          //calculate call datas for swap
          const uniswapData = uniRouter.interface.encodeFunctionData("swapExactTokensForETH", [
            usdcZapOutAmount,
            ethers.constants.Zero,
            [USDC, WETH],
            SWAPPER_ADDRESS,
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
        });

        it("increases ETH balance by zapped amount using permit", async () => {
          const expectedReturns = await uniRouter.getAmountsOut(usdcZapOutAmount, [USDC, WETH]);

          const deadline = ethers.constants.MaxUint256;
          const { v, r, s } = await getPermitSignature(maker, usdcVault, instance.address, usdcZapOutAmount, deadline, {
            name: "OptyFi Vault Name",
          });
          const dataPermit = ethers.utils.defaultAbiCoder.encode(
            ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
            [maker.address, instance.address, usdcZapOutAmount, deadline, v, r, s],
          );
          //zap UNI -> opUSDCgrow
          await expect(
            await instance.connect(maker).zapOut(ETH, usdcZapOutAmount, dataPermit, zapData),
          ).to.changeEtherBalance(maker, expectedReturns[1]);
        });

        it("increases ETH balance by zapped amount using approve", async () => {
          const expectedReturns = await uniRouter.getAmountsOut(usdcZapOutAmount, [USDC, WETH]);

          await usdcVault.connect(maker).approve(instance.address, usdcZapOutAmount);
          //zap UNI -> opUSDCgrow
          await expect(
            await instance.connect(maker).zapOut(ETH, usdcZapOutAmount, "0x", zapData),
          ).to.changeEtherBalance(maker, expectedReturns[1]);
        });
      });

      describe("opUSDCgrow => WETH", () => {
        beforeEach(async () => {
          usdcZapOutAmount = await usdcVault.balanceOf(maker.address);

          //calculate call datas for swap
          const uniswapData = uniRouter.interface.encodeFunctionData("swapExactTokensForTokens", [
            usdcZapOutAmount,
            ethers.constants.Zero,
            [USDC, WETH],
            SWAPPER_ADDRESS,
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
        });

        it("increases token balance by zapped amount using permit", async () => {
          const expectedReturns = await uniRouter.getAmountsOut(usdcZapOutAmount, [USDC, WETH]);

          const deadline = ethers.constants.MaxUint256;
          const { v, r, s } = await getPermitSignature(maker, usdcVault, instance.address, usdcZapOutAmount, deadline, {
            name: "OptyFi Vault Name",
          });
          const dataPermit = ethers.utils.defaultAbiCoder.encode(
            ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
            [maker.address, instance.address, usdcZapOutAmount, deadline, v, r, s],
          );

          // zap opUSDCgrow => WETH
          await expect(() =>
            instance.connect(maker).zapOut(WETH, usdcZapOutAmount, dataPermit, zapData),
          ).to.changeTokenBalance(WETHERC20, maker, expectedReturns[1]);
        });

        it("increases token balance by zapped amount using approve", async () => {
          const expectedReturns = await uniRouter.getAmountsOut(usdcZapOutAmount, [USDC, WETH]);

          await usdcVault.connect(maker).approve(instance.address, usdcZapOutAmount);

          // zap opUSDCgrow => WETH
          await expect(() =>
            instance.connect(maker).zapOut(WETH, usdcZapOutAmount, "0x", zapData),
          ).to.changeTokenBalance(WETHERC20, maker, expectedReturns[1]);
        });
      });
    });
  });
}
