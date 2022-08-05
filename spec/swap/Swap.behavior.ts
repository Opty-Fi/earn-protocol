import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';
import hre from 'hardhat';
import { IERC20, ISwapper, IUniswapV2Router02 } from '../../typechain-types';
import { SwapData } from '../../utils/types';
import { expect } from 'chai';

export function describeBehaviorOfSwap(
  deploy: () => Promise<ISwapper>,
  skips?: string[],
) {
  const ethers = hre.ethers;
  let owner: SignerWithAddress;
  let maker: SignerWithAddress;
  let USDCWhale: SignerWithAddress;

  let instance: ISwapper;
  let USDCERC20: IERC20;
  let WETHERC20: IERC20;
  let uniRouter: IUniswapV2Router02;

  let swapData: SwapData;

  let snapshotId: number;

  //EOA
  const USDCWhaleAddress = '0x4da085ef29a25af96e3a53a53e6ba899f1766a71';

  //tokens
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

  //contracts
  const UniswapV2Router02Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

  const swapDeadline = BigNumber.from('1000000000000000000000000000000000000');
  const usdcSwapAmount = ethers.utils.parseUnits('10000000', 6);
  const ethSwapAmount = ethers.utils.parseEther('100');

  describe('::Swap', () => {
    before(async () => {
      [owner, maker] = await ethers.getSigners();

      await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [USDCWhaleAddress],
      });
      USDCWhale = await ethers.getSigner(
        ethers.utils.getAddress(USDCWhaleAddress),
      );
      uniRouter = await ethers.getContractAt(
        'IUniswapV2Router02',
        UniswapV2Router02Address,
      );
      USDCERC20 = <IERC20>(
        await ethers.getContractAt(
          '@solidstate/contracts/token/ERC20/IERC20.sol:IERC20',
          USDC,
        )
      );
      WETHERC20 = <IERC20>(
        await ethers.getContractAt(
          '@solidstate/contracts/token/ERC20/IERC20.sol:IERC20',
          WETH,
        )
      );
    });

    beforeEach(async () => {
      let tx;
      instance = await deploy();
      snapshotId = await ethers.provider.send('evm_snapshot', []);

      //provide USDC whale with ETH to make required transactions
      tx = maker.sendTransaction({
        to: USDCWhaleAddress,
        value: ethers.utils.parseEther('1.0'),
        gasLimit: 10000000,
      });

      (await tx).wait();

      tx = USDCERC20.connect(USDCWhale).transfer(
        maker.address,
        ethers.utils.parseUnits('100000000', 6),
      );

      (await tx).wait();
    });

    afterEach(async () => {
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    describe('#swap(struct(SwapData))', () => {
      it('swaps ETH => USDC', async () => {
        //calculate call datas for swap
        const uniswapData = uniRouter.interface.encodeFunctionData(
          'swapExactETHForTokens',
          [ethers.constants.Zero, [WETH, USDC], instance.address, swapDeadline],
        );

        //construct swapData
        const calls: string[] = [uniswapData];
        let startIndexes: any[] = ['0'];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        startIndexes = startIndexes.map((i) => BigNumber.from(i));

        swapData = {
          fromToken: ETH,
          fromAmount: ethSwapAmount,
          toToken: USDC,
          toAmount: ethers.constants.One,
          callees: [uniRouter.address],
          exchangeData: exchangeData,
          startIndexes: startIndexes,
          values: [ethSwapAmount],
          beneficiary: maker.address,
          permit: '0x',
          deadline: swapDeadline,
        };

        const expectedReturns = await uniRouter
          .connect(maker)
          .callStatic.swapExactETHForTokens(
            ethers.constants.Zero,
            [WETH, USDC],
            instance.address,
            swapDeadline,
            {
              value: ethSwapAmount,
            },
          );

        //Note: if instaed of 'await' in expect(), '() =>' is used, then function expects maker
        //to spend 2x (because it is called 2x). Must use changeTokenBalance => changeEtherBalance
        //ordering as well.
        await expect(
          await instance
            .connect(maker)
            .swap(swapData, { value: ethSwapAmount }),
        )
          .to.changeTokenBalance(USDCERC20, maker, expectedReturns[1])
          .to.changeEtherBalance(
            maker,
            ethSwapAmount.mul(ethers.constants.NegativeOne),
          );
      });

      it('swaps USDC => ETH', async () => {
        await USDCERC20.connect(maker).approve(
          uniRouter.address,
          ethers.utils.parseEther('10000'),
        );
        await USDCERC20.connect(maker).approve(
          await instance.tokenTransferProxy(),
          ethers.utils.parseEther('10000'),
        );
        //calculate call datas for swap
        const uniswapData = uniRouter.interface.encodeFunctionData(
          'swapExactTokensForETH',
          [
            usdcSwapAmount,
            ethers.constants.Zero,
            [USDC, WETH],
            instance.address,
            swapDeadline,
          ],
        );

        const approveData = USDCERC20.interface.encodeFunctionData('approve', [
          uniRouter.address,
          ethers.utils.parseEther('1000000'),
        ]);

        //construct swapData
        const calls: string[] = [approveData, uniswapData];
        let startIndexes: any[] = ['0'];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        startIndexes = startIndexes.map((i) => BigNumber.from(i));

        swapData = {
          fromToken: USDC,
          fromAmount: usdcSwapAmount,
          toToken: ETH,
          toAmount: ethers.constants.One,
          callees: [USDCERC20.address, uniRouter.address],
          exchangeData: exchangeData,
          startIndexes: startIndexes,
          values: [ethers.constants.Zero, ethers.constants.Zero],
          beneficiary: maker.address,
          permit: '0x',
          deadline: swapDeadline,
        };

        const expectedReturns = await uniRouter
          .connect(maker)
          .callStatic.swapExactTokensForETH(
            usdcSwapAmount,
            ethers.constants.Zero,
            [USDC, WETH],
            instance.address,
            swapDeadline,
          );

        //Note: if instaed of 'await' in expect(), '() =>' is used, then function expects maker
        //to spend 2x (because it is called 2x). Must use changeTokenBalance => changeEtherBalance
        //ordering as well.
        await expect(await instance.connect(maker).swap(swapData))
          .to.changeTokenBalance(
            USDCERC20,
            maker,
            usdcSwapAmount.mul(ethers.constants.NegativeOne),
          )
          .to.changeEtherBalance(maker, expectedReturns[1]);
      });

      it('swaps USDC => WETH', async () => {
        await USDCERC20.connect(maker).approve(
          uniRouter.address,
          ethers.utils.parseEther('10000'),
        );
        await USDCERC20.connect(maker).approve(
          await instance.tokenTransferProxy(),
          ethers.utils.parseEther('10000'),
        );

        const uniswapData = uniRouter.interface.encodeFunctionData(
          'swapExactTokensForTokens',
          [
            usdcSwapAmount,
            ethers.constants.Zero,
            [USDC, WETH],
            instance.address,
            swapDeadline,
          ],
        );

        const approveData = USDCERC20.interface.encodeFunctionData('approve', [
          uniRouter.address,
          ethers.utils.parseEther('1000000'),
        ]);

        //construct swapData
        const calls: string[] = [approveData, uniswapData];
        let startIndexes: any[] = ['0'];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        startIndexes = startIndexes.map((i) => BigNumber.from(i));

        swapData = {
          fromToken: USDC,
          fromAmount: usdcSwapAmount,
          toToken: WETH,
          toAmount: ethers.constants.One,
          callees: [USDCERC20.address, uniRouter.address],
          exchangeData: exchangeData,
          startIndexes: startIndexes,
          values: [ethers.constants.Zero, ethers.constants.Zero],
          beneficiary: maker.address,
          permit: '0x',
          deadline: swapDeadline,
        };

        const expectedReturns = await uniRouter
          .connect(maker)
          .callStatic.swapExactTokensForTokens(
            usdcSwapAmount,
            ethers.constants.Zero,
            [USDC, WETH],
            instance.address,
            swapDeadline,
          );

        const oldBalance = await USDCERC20.balanceOf(maker.address);

        await expect(() =>
          instance.connect(maker).swap(swapData),
        ).to.changeTokenBalance(WETHERC20, maker, expectedReturns[1]);

        const newBalance = await USDCERC20.balanceOf(maker.address);
        //workaround for expect issue of being unable to chain two 'changetokenBalance'
        expect(newBalance.sub(oldBalance)).to.eq(
          usdcSwapAmount.mul(ethers.constants.NegativeOne),
        );
      });

      describe('reverts if', () => {
        let uniswapData;
        let approveData: any;
        let exchangeData;

        beforeEach(() => {
          uniswapData = uniRouter.interface.encodeFunctionData(
            'swapExactTokensForTokens',
            [
              usdcSwapAmount,
              ethers.constants.Zero,
              [USDC, WETH],
              instance.address,
              swapDeadline,
            ],
          );

          approveData = USDCERC20.interface.encodeFunctionData('approve', [
            uniRouter.address,
            ethers.utils.parseEther('1000000'),
          ]);

          //construct swapData
          const calls: string[] = [approveData, uniswapData];
          let startIndexes: any[] = ['0'];
          exchangeData = `0x`;
          for (const i in calls) {
            startIndexes.push(
              startIndexes[i] + calls[i].substring(2).length / 2,
            );
            exchangeData = exchangeData.concat(calls[i].substring(2));
          }

          startIndexes = startIndexes.map((i) => BigNumber.from(i));

          swapData = {
            fromToken: USDC,
            fromAmount: usdcSwapAmount,
            toToken: WETH,
            toAmount: ethers.constants.One,
            callees: [USDCERC20.address, uniRouter.address],
            exchangeData: exchangeData,
            startIndexes: startIndexes,
            values: [ethers.constants.Zero, ethers.constants.Zero],
            beneficiary: maker.address,
            permit: '0x',
            deadline: swapDeadline,
          };
        });

        it('callees length + 1 does not match indexes length', async () => {
          swapData.startIndexes = [BigNumber.from('0'), BigNumber.from('10')];
          await expect(
            instance.connect(maker).swap(swapData),
          ).to.be.revertedWith('ExchangeDataArrayMismatch()');
        });

        it('callees length does not match values length', async () => {
          swapData.values = [ethers.constants.Zero];
          await expect(
            instance.connect(maker).swap(swapData),
          ).to.be.revertedWith('ExchangeDataArrayMismatch()');
        });

        it('timestamp is larger than deadline', async () => {
          swapData.deadline = BigNumber.from('0');

          await expect(
            instance.connect(maker).swap(swapData),
          ).to.be.revertedWith('DeadlineBreach()');
        });

        it('msg.value is not 0 when ETH is not fromToken', async () => {
          await expect(
            instance
              .connect(maker)
              .swap(swapData, { value: ethers.utils.parseEther('1') }),
          ).to.be.revertedWith('ETHValueMismatch()');
        });

        it('msg.value is not equal to fromAmount when ETH is fromToken', async () => {
          swapData.fromToken = ETH;
          swapData.fromAmount = ethers.utils.parseEther('100');

          await expect(
            instance
              .connect(maker)
              .swap(swapData, { value: ethers.utils.parseEther('10') }),
          ).to.be.revertedWith('ETHValueMismatch');
        });

        it('toAmount is equal to 0', async () => {
          swapData.toAmount = BigNumber.from(0);
          await expect(
            instance.connect(maker).swap(swapData),
          ).to.be.revertedWith('ZeroExpectedReturns()');
        });

        it('call to TokenTransferProxy contract is made', async () => {
          swapData.callees[0] = await instance.tokenTransferProxy();
          await USDCERC20.connect(maker).approve(
            await instance.tokenTransferProxy(),
            ethers.utils.parseEther('10000'),
          );

          await expect(
            instance.connect(maker).swap(swapData),
          ).to.be.revertedWith('TokenTransferProxyCall()');
        });

        it('encoded call is TransferFrom', async () => {
          await USDCERC20.connect(maker).approve(
            await instance.tokenTransferProxy(),
            ethers.utils.parseEther('10000'),
          );

          const transferFromData = USDCERC20.interface.encodeFunctionData(
            'transferFrom',
            [
              maker.address,
              uniRouter.address,
              ethers.utils.parseEther('0.001'),
            ],
          );

          const calls: string[] = [transferFromData];
          const startIndexes = ['0'];
          exchangeData = `0x`;
          for (const i in calls) {
            startIndexes.push(
              startIndexes[i] + calls[i].substring(2).length / 2,
            );
            exchangeData = exchangeData.concat(calls[i].substring(2));
          }

          swapData.exchangeData = exchangeData;

          await expect(
            instance.connect(maker).swap(swapData),
          ).to.be.revertedWith('TransferFromCall()');
        });

        it('external call fails', async () => {
          await USDCERC20.connect(maker).approve(
            await instance.tokenTransferProxy(),
            ethers.utils.parseEther('10000'),
          );

          uniswapData = uniRouter.interface.encodeFunctionData(
            'swapExactTokensForTokens',
            [
              usdcSwapAmount,
              ethers.constants.Zero,
              [WETH, USDC],
              instance.address,
              swapDeadline,
            ],
          );

          const calls: string[] = [approveData, uniswapData];
          const startIndexes = ['0'];
          exchangeData = `0x`;
          for (const i in calls) {
            startIndexes.push(
              startIndexes[i] + calls[i].substring(2).length / 2,
            );
            exchangeData = exchangeData.concat(calls[i].substring(2));
          }

          swapData.exchangeData = exchangeData;

          await expect(
            instance.connect(maker).swap(swapData),
          ).to.be.revertedWith('ExternalCallFailure()');
        });

        it('insufficient amount of toToken returned to OptyFiSwapper', async () => {
          await USDCERC20.connect(maker).approve(
            uniRouter.address,
            ethers.utils.parseEther('10000'),
          );
          await USDCERC20.connect(maker).approve(
            await instance.tokenTransferProxy(),
            ethers.utils.parseEther('10000'),
          );

          uniswapData = uniRouter.interface.encodeFunctionData(
            'swapExactTokensForTokens',
            [
              usdcSwapAmount,
              ethers.constants.Zero,
              [USDC, WETH],
              maker.address,
              swapDeadline,
            ],
          );

          approveData = USDCERC20.interface.encodeFunctionData('approve', [
            uniRouter.address,
            ethers.utils.parseEther('1000000'),
          ]);

          //construct swapData
          const calls: string[] = [approveData, uniswapData];
          const startIndexes = ['0'];
          exchangeData = `0x`;
          for (const i in calls) {
            startIndexes.push(
              startIndexes[i] + calls[i].substring(2).length / 2,
            );
            exchangeData = exchangeData.concat(calls[i].substring(2));
          }

          swapData.exchangeData = exchangeData;

          await expect(
            instance.connect(maker).swap(swapData),
          ).to.be.revertedWith('InsufficientReturn()');
        });
      });
    });
  });
}
