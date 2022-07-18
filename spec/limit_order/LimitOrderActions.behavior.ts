import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import hre from 'hardhat';
import { Order, OrderParams, SwapData } from '../../utils/types';
import {
  IERC20,
  ILimitOrder,
  ISwapper,
  OptyFiOracle,
  IUniswapV2Router02,
  IVault,
  IVault__factory,
} from '../../typechain-types';
import { DataTypes } from '../../typechain-types/contracts/swap/ISwap';
import { BigNumber } from 'ethers';
import { expect } from 'chai';
import { convertOrderParamsToOrder } from '../../utils/converters';
import { Interface } from 'ethers/lib/utils';
import {
  generateMerkleTree,
  generateMerkleTreeForCodehash,
  getProof,
  getProofForCode,
  hashCodehash,
} from '../../scripts/utils';
import { IERC20__factory } from '../../typechain-types/factories/@solidstate/contracts/token/ERC20';

export function describeBehaviorOfLimitOrderActions(
  deploy: () => Promise<ILimitOrder>,
  deploySwapper: () => Promise<ISwapper>,
  skips?: string[],
) {
  const ethers = hre.ethers;
  let owner: SignerWithAddress;
  let maker: SignerWithAddress;
  let optyFiVaultOperator: SignerWithAddress;
  let AaveWhale: SignerWithAddress;
  let USDCWhale: SignerWithAddress;

  let instance: ILimitOrder;
  let AaveVaultInstance: IVault;
  let UsdcVaultInstance: IERC20;
  let AaveERC20: IERC20;
  let USDCERC20: IERC20;
  let opAaveToken: IERC20;
  let swapper: ISwapper;
  let uniRouter: IUniswapV2Router02;

  //EOA
  const AaveWhaleAddress = '0x80845058350b8c3df5c3015d8a717d64b3bf9267';
  const USDCWhaleAddress = '0x4da085ef29a25af96e3a53a53e6ba899f1766a71';
  const optyFiVaultOperatorAddress =
    '0x6bd60f089B6E8BA75c409a54CDea34AA511277f6';

  //Tokens
  const USD = '0x0000000000000000000000000000000000000348';
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const AaveERC20Address = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9';

  //Contracts
  const AaveVaultProxy = '0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19';
  const UsdcVaultProxy = '0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88';
  const UniswapV2Router02Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; //mainnet

  //Params
  const endTimeNum = 1657190461 + 120; //unix timestamp of block 15095000 + 120s
  const endTime = BigNumber.from(endTimeNum.toString());
  const newEndTime = endTime.add(BigNumber.from('120'));

  const priceTarget = ethers.utils.parseEther('100'); //always high enough to execute order for testing
  const newPriceTarget = priceTarget.add(ethers.utils.parseEther('10'));

  const orderParams: OrderParams = {
    priceTarget: priceTarget,
    liquidationShare: ethers.utils.parseEther('0.1'),
    endTime: endTime,
    upperBound: ethers.utils.parseEther('0.5'),
    lowerBound: ethers.utils.parseEther('0.5'),
    vault: AaveVaultProxy,
    depositUSDC: false,
  };

  const failedOrderParams: OrderParams = {
    priceTarget: priceTarget,
    liquidationShare: ethers.utils.parseEther('0.1'),
    endTime: endTime.sub(BigNumber.from('1000')),
    upperBound: ethers.utils.parseEther('0.5'),
    lowerBound: ethers.utils.parseEther('0.05'),
    vault: AaveVaultProxy,
    depositUSDC: false,
  };

  const modifyOrderParams: OrderParams = {
    priceTarget: newPriceTarget,
    liquidationShare: ethers.utils.parseEther('0.05'),
    endTime: newEndTime,
    upperBound: ethers.utils.parseEther('0.1'),
    lowerBound: ethers.utils.parseEther('0.1'),
    vault: AaveVaultProxy,
    depositUSDC: true,
  };

  const liquidationFeeBP = ethers.utils.parseEther('0.02');
  const BASIS = ethers.utils.parseEther('1.0');

  const aaveDepositAmount = ethers.utils.parseEther('0.1');

  before(async () => {
    [owner, maker] = await ethers.getSigners();
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [ethers.utils.getAddress(optyFiVaultOperatorAddress)],
    });
    optyFiVaultOperator = await ethers.getSigner(
      ethers.utils.getAddress(optyFiVaultOperatorAddress),
    );
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [AaveWhaleAddress],
    });
    AaveWhale = await ethers.getSigner(
      ethers.utils.getAddress(AaveWhaleAddress),
    );
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

    AaveVaultInstance = await ethers.getContractAt('IVault', AaveVaultProxy);
    UsdcVaultInstance = <IERC20>(
      await ethers.getContractAt(
        '@solidstate/contracts/token/ERC20/IERC20.sol:IERC20',
        UsdcVaultProxy,
      )
    );
    AaveERC20 = <IERC20>(
      await ethers.getContractAt(
        '@solidstate/contracts/token/ERC20/IERC20.sol:IERC20',
        AaveERC20Address,
      )
    );
    USDCERC20 = <IERC20>(
      await ethers.getContractAt(
        '@solidstate/contracts/token/ERC20/IERC20.sol:IERC20',
        USDC,
      )
    );
    opAaveToken = <IERC20>(
      await ethers.getContractAt(
        '@solidstate/contracts/token/ERC20/IERC20.sol:IERC20',
        AaveVaultInstance.address,
      )
    );
  });

  beforeEach(async () => {
    instance = await deploy();
    swapper = await deploySwapper();
    //set vault fee to non-zero amount
    await instance
      .connect(owner)
      .setVaultLiquidationFee(liquidationFeeBP, AaveVaultProxy);
  });
  describe(':LimitOrderActions', () => {
    describe('#createOrder(struct(orderParams)))', () => {
      it('successfully created a limit order', async () => {
        await instance.connect(maker).createOrder(orderParams);

        const makerOrder = await instance.userVaultOrder(
          maker.address,
          AaveVaultProxy,
        );
        const createdOrder: Order = {
          priceTarget: makerOrder.priceTarget,
          liquidationShare: makerOrder.liquidationShare,
          endTime: makerOrder.endTime,
          lowerBound: makerOrder.lowerBound,
          upperBound: makerOrder.upperBound,
          maker: makerOrder.maker,
          vault: makerOrder.vault,
          depositUSDC: makerOrder.depositUSDC,
        };

        const order = convertOrderParamsToOrder(orderParams, maker.address);

        expect(createdOrder).to.deep.equal(order);
      });

      it('emits LimitOrderCreated event', async () => {
        const order = convertOrderParamsToOrder(orderParams, maker.address);
        await expect(await instance.connect(maker).createOrder(orderParams))
          .to.emit(instance, 'LimitOrderCreated')
          .withArgs([
            order.priceTarget,
            order.liquidationShare,
            order.endTime,
            order.lowerBound,
            order.upperBound,
            order.maker,
            order.vault,
            order.depositUSDC,
          ]);
      });

      describe('reverts if', () => {
        it('user has an active limit order', async () => {
          await instance.connect(maker).createOrder(orderParams);

          await expect(
            instance.connect(maker).createOrder(orderParams),
          ).to.be.revertedWith('user already has an active limit order');
        });

        it('end time is before current block timestamp', async () => {
          await expect(
            instance.connect(maker).createOrder(failedOrderParams),
          ).to.be.revertedWith('end time in past');
        });
      });
    });

    describe('#cancelOrder(address)', () => {
      it('cancels an active order', async () => {
        await instance.connect(maker).createOrder(orderParams);

        expect(
          await instance.userVaultOrderActive(maker.address, AaveVaultProxy),
        ).to.eq(true);
        await instance.connect(maker).cancelOrder(AaveVaultProxy);
        expect(
          await instance.userVaultOrderActive(maker.address, AaveVaultProxy),
        ).to.eq(false);
      });

      describe('reverts if', () => {
        it('order is non-existent', async () => {
          await expect(
            instance.connect(maker).cancelOrder(AaveVaultProxy),
          ).to.be.revertedWith('Order non-existent');
        });
      });
    });

    describe('#execute(struct(Order),struct(SwapData))', () => {
      let snapshotId;
      let tx;
      let codeRoot;
      let accountRoot;
      let orderSwapData: DataTypes.SwapDataStruct;
      let fee: BigNumber;
      let aaveRedeemed: BigNumber;
      let USDCAmount: BigNumber;
      let instanceProof;

      beforeEach(async () => {
        snapshotId = await ethers.provider.send('evm_snapshot', []);

        //provide USDC whale with ETH to make required transactions
        tx = maker.sendTransaction({
          to: USDCWhaleAddress,
          value: ethers.utils.parseEther('1.0'),
          gasLimit: 10000000,
        });

        (await tx).wait();

        //transfer aave tokens from whale to maker
        await AaveERC20.connect(AaveWhale).transfer(
          maker.address,
          ethers.utils.parseEther('10000'),
        );

        //transfer aave tokens from whale to usdc whale for liquidity provision
        await AaveERC20.connect(AaveWhale).transfer(
          USDCWhale.address,
          ethers.utils.parseEther('10000'),
        );

        await AaveERC20.connect(USDCWhale).approve(
          UniswapV2Router02Address,
          ethers.utils.parseEther('5000'),
        );
        await USDCERC20.connect(USDCWhale).approve(
          UniswapV2Router02Address,
          BigNumber.from('20000000000000'),
        ); //20million USDC since usdc has 6 decimals)

        //provide liquidity to pool to ensure execute works
        await uniRouter
          .connect(USDCWhale)
          [
            'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)'
          ](
            AaveERC20Address,
            USDC,
            ethers.utils.parseEther('5000'),
            BigNumber.from('10000000000000'),
            ethers.constants.Zero,
            ethers.constants.Zero,
            USDCWhaleAddress,
            endTime.add(BigNumber.from('10000000')),
          );

        //make AaveVault not whitelisted
        //replaced only 06 with 02 to remove the whitelisted state
        const newVaultConfig =
          '0x02026bd60f089B6E8BA75c409a54CDea34AA511277f600320000000000000000';

        const instanceCodeHash = ethers.utils.keccak256(
          await ethers.provider.getCode(instance.address),
        );
        const codeMerkleTree = generateMerkleTreeForCodehash([
          instanceCodeHash,
        ]);
        instanceProof = getProofForCode(codeMerkleTree, instanceCodeHash);

        const accountMerkleTree = generateMerkleTree([instance.address]);
        //TODO: setter for empty proof of account
        const instanceAccountProof = getProof(
          accountMerkleTree,
          instance.address,
        );
        await instance.connect(owner).setProof(instanceProof);

        codeRoot = codeMerkleTree.getHexRoot();
        accountRoot = accountMerkleTree.getHexRoot();

        //transfer ether to optyfi vault operator
        tx = maker.sendTransaction({
          to: optyFiVaultOperatorAddress,
          value: ethers.utils.parseEther('1.0'),
          gasLimit: 10000000,
        });
        await (await tx).wait();

        //set vault configuration to remove whitelisted state
        await AaveVaultInstance.connect(
          optyFiVaultOperator,
        ).setVaultConfiguration(BigNumber.from(newVaultConfig));

        await AaveVaultInstance.connect(
          optyFiVaultOperator,
        ).setWhitelistedCodesRoot(codeRoot);

        await AaveVaultInstance.connect(optyFiVaultOperator)[
          'setWhitelistedAccountsRoot(bytes32)'
        ](accountRoot);

        //approve vault to take aave from maker
        await AaveERC20.connect(maker).approve(
          AaveVaultInstance.address,
          aaveDepositAmount,
        );
        //deposit aave in opAAVE from maker
        await AaveVaultInstance.connect(maker).userDepositVault(
          aaveDepositAmount,
          [ethers.constants.HashZero],
          [ethers.constants.HashZero],
        );
        //calculate user shares
        const userShares = await opAaveToken.balanceOf(maker.address);
        const userSharesLiquidated = orderParams.liquidationShare
          .mul(userShares)
          .div(BASIS);

        //approve tokenTransferProxy
        await opAaveToken
          .connect(maker)
          .approve(await instance['transferProxy()'](), userSharesLiquidated);

        //no fees in opAAVEvault so should be precise
        const expectedAaveRedeemed = userSharesLiquidated
          .mul(await AaveVaultInstance.getPricePerFullShare())
          .div(BASIS); //must divide by basis as getPricePerFullShare returns 10**18

        //calculate call datas for approve + swap
        const aaveERC20Interface = AaveERC20.interface;
        const approveData = aaveERC20Interface.encodeFunctionData('approve', [
          uniRouter.address,
          ethers.utils.parseEther('10000'),
        ]);

        const swapDiamondAddress = await instance.swapDiamond();
        const swapDeadline = endTime.add(
          BigNumber.from('1000000000000000000000000000000000000'),
        );

        const uniswapData = uniRouter.interface.encodeFunctionData(
          'swapExactTokensForTokens',
          [
            expectedAaveRedeemed,
            ethers.constants.Zero,
            [AaveERC20Address, USDC],
            swapDiamondAddress,
            swapDeadline,
          ],
        );

        //construct swapData
        const calls: string[] = [approveData, uniswapData];
        const startIndexes = ['0'];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        orderSwapData = {
          fromToken: AaveERC20Address,
          toToken: USDC,
          fromAmount: userSharesLiquidated.mul(
            await AaveVaultInstance.getPricePerFullShare(),
          ),
          toAmount: ethers.constants.One, //note: just for testing
          expectedAmount: ethers.constants.Zero, //TODO: verify purpose
          callees: [AaveERC20Address, UniswapV2Router02Address],
          exchangeData,
          startIndexes,
          values: [BigNumber.from('0'), BigNumber.from('0')],
          beneficiary: instance.address,
          permit: '0x',
          deadline: swapDeadline,
        };

        //simulate swap call for test values
        await AaveERC20.connect(AaveWhale).approve(
          uniRouter.address,
          ethers.utils.parseEther('1000000'),
        );
        [aaveRedeemed, USDCAmount] = await uniRouter
          .connect(AaveWhale)
          .callStatic[
            'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)'
          ](
            expectedAaveRedeemed,
            ethers.constants.Zero,
            [AaveERC20Address, USDC],
            swapDiamondAddress,
            swapDeadline,
          );

        fee = USDCAmount.mul(liquidationFeeBP).div(BASIS);
      });

      afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshotId]);
      });

      it('returns USDC amount liquidated minus liquidation fee to maker', async () => {
        //create order from maker
        await instance.connect(maker).createOrder(orderParams);

        await expect(() =>
          instance
            .connect(maker)
            .execute(maker.address, AaveVaultProxy, orderSwapData),
        ).to.changeTokenBalance(USDCERC20, maker, USDCAmount.sub(fee));
      });

      it('sends liquidation fee to treasury', async () => {
        //create order from maker
        await instance.connect(maker).createOrder(orderParams);

        const treasuryAddress = await instance.treasury();
        const treasury = await ethers.getSigner(treasuryAddress);
        await expect(() =>
          instance
            .connect(maker)
            .execute(maker.address, AaveVaultProxy, orderSwapData),
        ).to.changeTokenBalance(USDCERC20, treasury, fee);
      });

      it('sends opUSDC shares to maker after USDC minus fee been deposited', async () => {
        //calculate expectedOPUSDCShares to reach user after fees
        const opUSDCVault = await ethers.getContractAt(
          'IVault',
          UsdcVaultProxy,
        );
        const opUSDCprice = await opUSDCVault.getPricePerFullShare();
        const USDCAmountAfterFee = USDCAmount.sub(fee);
        const expectedOPUSDCShares =
          USDCAmountAfterFee.mul(BASIS).div(opUSDCprice);
        //taken from opUSDCVault.vaultConfiguration() and replace 0x06 with 0x02
        const newVaultConfig =
          '0x0201000000000000000000000000000000000000000000640000000000000000';
        //remove opUSDCVault whitelist
        const tx = await opUSDCVault
          .connect(optyFiVaultOperator)
          .setVaultConfiguration(BigNumber.from(newVaultConfig));

        await tx.wait();
        //set code + account merkle roots and remove minimum deposit value
        await opUSDCVault
          .connect(optyFiVaultOperator)
          .setWhitelistedAccountsRoot(accountRoot);
        await opUSDCVault
          .connect(optyFiVaultOperator)
          .setWhitelistedCodesRoot(codeRoot);
        await opUSDCVault
          .connect(optyFiVaultOperator)
          .setMinimumDepositValueUT(ethers.constants.Zero);

        //create order from maker
        //set params so that received USDC after swap are deposited in opUSDC vault
        orderParams.depositUSDC = true;
        await instance.connect(maker).createOrder(orderParams);

        await expect(() =>
          instance
            .connect(maker)
            .execute(maker.address, AaveVaultProxy, orderSwapData),
        ).to.changeTokenBalance(UsdcVaultInstance, maker, expectedOPUSDCShares);
      });

      it('sends USDC minus fee to maker if vault does not permit deposits', async () => {
        //set params so that
        orderParams.depositUSDC = true;

        //create order from maker
        await instance.connect(maker).createOrder(orderParams);
        //since opUSDCVault is whitelisted, LimitOrder Contracts will not be able to deposit so 'catch' statement
        //will execute, returning USDC to maker
        await expect(() =>
          instance
            .connect(maker)
            .execute(maker.address, AaveVaultProxy, orderSwapData),
        ).to.changeTokenBalance(USDCERC20, maker, USDCAmount.sub(fee));
      });
    });

    describe('#modifyOrder(address,struct(OrderParams))', () => {
      it('modifies an existing order', async () => {
        await instance.connect(maker).createOrder(orderParams);

        await instance
          .connect(maker)
          .modifyOrder(AaveVaultProxy, modifyOrderParams);

        const makerOrder = await instance.userVaultOrder(
          maker.address,
          AaveVaultProxy,
        );
        const modifiedOrder: Order = {
          priceTarget: makerOrder.priceTarget,
          liquidationShare: makerOrder.liquidationShare,
          endTime: makerOrder.endTime,
          lowerBound: makerOrder.lowerBound,
          upperBound: makerOrder.upperBound,
          maker: makerOrder.maker,
          vault: makerOrder.vault,
          depositUSDC: makerOrder.depositUSDC,
        };

        const order = convertOrderParamsToOrder(
          modifyOrderParams,
          maker.address,
        );

        expect(order).to.deep.eq(modifiedOrder);
      });

      describe('reverts if', () => {
        it('user does not have an active order to modify', async () => {
          await expect(
            instance
              .connect(maker)
              .modifyOrder(AaveVaultProxy, modifyOrderParams),
          ).to.be.revertedWith('user does not have an active order');
        });
      });
    });
  });
}
