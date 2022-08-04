import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber } from "ethers";
import hre, { deployments } from "hardhat";
import { IERC20, IOptyFiZapper, IUniswapV2Router02 } from "../typechain";
import { ZapData } from "../helpers/type";
import { expect } from "chai";

export function describeBehaviorOfOptyFiZapper(deploy: () => Promise<IOptyFiZapper>, skips?: string[]) {
  const ethers = hre.ethers;
  let owner: SignerWithAddress;
  let maker: SignerWithAddress;
  let USDCWhale: SignerWithAddress;

  let instance: IOptyFiZapper;
  let USDCERC20: IERC20;
  let WETHERC20: IERC20;
  let uniRouter: IUniswapV2Router02;

  let zapData: ZapData;

  let snapshotId: number;
  let OPUSDCGROW_VAULT_ADDRESS: string;

  //EOA
  const USDCWhaleAddress = "0x4da085ef29a25af96e3a53a53e6ba899f1766a71";

  //tokens
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  //contracts
  const UniswapV2Router02Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  const swapDeadline = BigNumber.from("1000000000000000000000000000000000000");
  const usdcSwapAmount = ethers.utils.parseUnits("10000000", 6);
  const ethSwapAmount = ethers.utils.parseEther("100");

  describe("::Zap", () => {
    before(async () => {
      OPUSDCGROW_VAULT_ADDRESS = (await deployments.get("opUSDCgrow")).address;

      [owner, maker] = await ethers.getSigners();

      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [USDCWhaleAddress],
      });
      USDCWhale = await ethers.getSigner(ethers.utils.getAddress(USDCWhaleAddress));
      uniRouter = await ethers.getContractAt("IUniswapV2Router02", UniswapV2Router02Address);
      USDCERC20 = <IERC20>await ethers.getContractAt("@solidstate/contracts/token/ERC20/IERC20.sol:IERC20", USDC);
      WETHERC20 = <IERC20>await ethers.getContractAt("@solidstate/contracts/token/ERC20/IERC20.sol:IERC20", WETH);
    });

    beforeEach(async () => {
      let tx;
      instance = await deploy();
      snapshotId = await ethers.provider.send("evm_snapshot", []);

      //provide USDC whale with ETH to make required transactions
      tx = maker.sendTransaction({
        to: USDCWhaleAddress,
        value: ethers.utils.parseEther("1.0"),
        gasLimit: 10000000,
      });

      (await tx).wait();

      tx = USDCERC20.connect(USDCWhale).transfer(maker.address, ethers.utils.parseUnits("100000000", 6));

      (await tx).wait();
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
    });

    describe("#ZapInETH(struct(ZapData))", () => {
      it("zapInETH => opUSDCgrow", async () => {
        //calculate call datas for swap
        const uniswapData = uniRouter.interface.encodeFunctionData("swapExactETHForTokens", [
          ethers.constants.Zero,
          [WETH, USDC],
          instance.address,
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

        const expectedReturns = await uniRouter
          .connect(maker)
          .callStatic.swapExactETHForTokens(ethers.constants.Zero, [WETH, USDC], instance.address, swapDeadline, {
            value: ethSwapAmount,
          });

        zapData = {
          vault: OPUSDCGROW_VAULT_ADDRESS,
          toAmount: expectedReturns[1],
          deadline: swapDeadline,
          exchangeData: exchangeData,
          permit: "0x",
          callees: [uniRouter.address],
          startIndexes: startIndexes,
          values: [ethSwapAmount],
          accountsProof: [],
          codesProof: [],
        };

        await instance.connect(maker).zapInETH(zapData, { value: ethSwapAmount });

        // //Note: if instaed of "await" in expect(), "() =>" is used, then function expects maker
        // //to spend 2x (because it is called 2x). Must use changeTokenBalance => changeEtherBalance
        // //ordering as well.
        // await expect(
        //   await instance
        //     .connect(maker)
        //     .swap(swapData, { value: ethSwapAmount }),
        // )
        //   .to.changeTokenBalance(USDCERC20, maker, expectedReturns[1])
        //   .to.changeEtherBalance(
        //     maker,
        //     ethSwapAmount.mul(ethers.constants.NegativeOne),
        //   );
      });

      it("swaps USDC => ETH", async () => {
        // await USDCERC20.connect(maker).approve(
        //   uniRouter.address,
        //   ethers.utils.parseEther("10000"),
        // );
        // await USDCERC20.connect(maker).approve(
        //   await instance.tokenTransferProxy(),
        //   ethers.utils.parseEther("10000"),
        // );
        // //calculate call datas for swap
        // const uniswapData = uniRouter.interface.encodeFunctionData(
        //   "swapExactTokensForETH",
        //   [
        //     usdcSwapAmount,
        //     ethers.constants.Zero,
        //     [USDC, WETH],
        //     instance.address,
        //     swapDeadline,
        //   ],
        // );
        // const approveData = USDCERC20.interface.encodeFunctionData("approve", [
        //   uniRouter.address,
        //   ethers.utils.parseEther("1000000"),
        // ]);
        // //construct swapData
        // const calls: string[] = [approveData, uniswapData];
        // const startIndexes = ["0"];
        // let exchangeData = `0x`;
        // for (const i in calls) {
        //   startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
        //   exchangeData = exchangeData.concat(calls[i].substring(2));
        // }
        // swapData = {
        //   fromToken: USDC,
        //   fromAmount: usdcSwapAmount,
        //   toToken: ETH,
        //   toAmount: ethers.constants.One,
        //   callees: [USDCERC20.address, uniRouter.address],
        //   exchangeData: exchangeData,
        //   startIndexes: startIndexes,
        //   values: [ethers.constants.Zero, ethers.constants.Zero],
        //   beneficiary: maker.address,
        //   permit: "0x",
        //   deadline: swapDeadline,
        // };
        // const expectedReturns = await uniRouter
        //   .connect(maker)
        //   .callStatic.swapExactTokensForETH(
        //     usdcSwapAmount,
        //     ethers.constants.Zero,
        //     [USDC, WETH],
        //     instance.address,
        //     swapDeadline,
        //   );
        // //Note: if instaed of "await" in expect(), "() =>" is used, then function expects maker
        // //to spend 2x (because it is called 2x). Must use changeTokenBalance => changeEtherBalance
        // //ordering as well.
        // await expect(await instance.connect(maker).swap(swapData))
        //   .to.changeTokenBalance(
        //     USDCERC20,
        //     maker,
        //     usdcSwapAmount.mul(ethers.constants.NegativeOne),
        //   )
        //   .to.changeEtherBalance(maker, expectedReturns[1]);
      });

      it("swaps USDC => WETH", async () => {
        // await USDCERC20.connect(maker).approve(
        //   uniRouter.address,
        //   ethers.utils.parseEther("10000"),
        // );
        // await USDCERC20.connect(maker).approve(
        //   await instance.tokenTransferProxy(),
        //   ethers.utils.parseEther("10000"),
        // );
        // const uniswapData = uniRouter.interface.encodeFunctionData(
        //   "swapExactTokensForTokens",
        //   [
        //     usdcSwapAmount,
        //     ethers.constants.Zero,
        //     [USDC, WETH],
        //     instance.address,
        //     swapDeadline,
        //   ],
        // );
        // const approveData = USDCERC20.interface.encodeFunctionData("approve", [
        //   uniRouter.address,
        //   ethers.utils.parseEther("1000000"),
        // ]);
        // //construct swapData
        // const calls: string[] = [approveData, uniswapData];
        // const startIndexes = ["0"];
        // let exchangeData = `0x`;
        // for (const i in calls) {
        //   startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
        //   exchangeData = exchangeData.concat(calls[i].substring(2));
        // }
        // swapData = {
        //   fromToken: USDC,
        //   fromAmount: usdcSwapAmount,
        //   toToken: WETH,
        //   toAmount: ethers.constants.One,
        //   callees: [USDCERC20.address, uniRouter.address],
        //   exchangeData: exchangeData,
        //   startIndexes: startIndexes,
        //   values: [ethers.constants.Zero, ethers.constants.Zero],
        //   beneficiary: maker.address,
        //   permit: "0x",
        //   deadline: swapDeadline,
        // };
        // const expectedReturns = await uniRouter
        //   .connect(maker)
        //   .callStatic.swapExactTokensForTokens(
        //     usdcSwapAmount,
        //     ethers.constants.Zero,
        //     [USDC, WETH],
        //     instance.address,
        //     swapDeadline,
        //   );
        // const oldBalance = await USDCERC20.balanceOf(maker.address);
        // await expect(() =>
        //   instance.connect(maker).swap(swapData),
        // ).to.changeTokenBalance(WETHERC20, maker, expectedReturns[1]);
        // const newBalance = await USDCERC20.balanceOf(maker.address);
        // //workaround for expect issue of being unable to chain two "changetokenBalance"
        // expect(newBalance.sub(oldBalance)).to.eq(
        //   usdcSwapAmount.mul(ethers.constants.NegativeOne),
        // );
      });
    });
  });
}
