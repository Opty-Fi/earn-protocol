import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import hre from 'hardhat';
import { Order, OrderParams, SwapParams } from '../../utils/types';
import {
  IERC20,
  ILimitOrder,
  ISwapper,
  UniswapV2Router02,
  Vault,
  OptyFiOracle,
} from '../../typechain-types';
import { BigNumber } from 'ethers';
import { expect } from 'chai';
import { convertOrderParamsToOrder } from '../../utils/converters';
import {
  generateMerkleTree,
  generateMerkleTreeForCodehash,
  getProof,
  getProofForCode,
} from '../../scripts/utils';

export function describeBehaviorOfLimitOrderActions(
  deploy: () => Promise<ILimitOrder>,
  deploySwapper: () => Promise<ISwapper>,
  skips?: string[],
) {
  const ethers = hre.ethers;
  let owner: SignerWithAddress;
  let maker: SignerWithAddress;
  let attacker: SignerWithAddress;
  let nonMaker: SignerWithAddress;
  let optyFiVaultOperator: SignerWithAddress;
  let AaveWhale: SignerWithAddress;
  let USDCWhale: SignerWithAddress;

  let instance: ILimitOrder;
  let AaveVaultInstance: Vault;
  let UsdcVaultInstance: IERC20;
  let AaveERC20: IERC20;
  let USDCERC20: IERC20;
  let opAaveToken: IERC20;
  let swapper: ISwapper;
  let uniRouter: UniswapV2Router02;

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
  const expirationNum = 1657190461 + 120; //unix timestamp of block 15095000 + 120s
  const expiration = BigNumber.from(expirationNum.toString());
  const newExpiration = expiration.add(BigNumber.from('120'));

  const priceTarget = ethers.utils.parseEther('100'); //always high enough to execute order for testing
  const newPriceTarget = ethers.utils.parseEther('1');

  const orderParams: OrderParams = {
    priceTarget: priceTarget,
    liquidationShareBP: ethers.utils.parseEther('0.1'),
    expiration: expiration,
    upperBound: ethers.utils.parseEther('0.5'),
    lowerBound: ethers.utils.parseEther('0.5'),
    returnLimitBP: ethers.utils.parseEther('0.99'),
    vault: AaveVaultProxy,
    depositUSDC: false,
  };

  const failedOrderParams: OrderParams = {
    priceTarget: priceTarget,
    liquidationShareBP: ethers.utils.parseEther('0.1'),
    expiration: expiration.sub(BigNumber.from('1000')),
    upperBound: ethers.utils.parseEther('0.5'),
    lowerBound: ethers.utils.parseEther('0.05'),
    returnLimitBP: ethers.utils.parseEther('0.99'),
    vault: AaveVaultProxy,
    depositUSDC: false,
  };

  const modifyOrderParams: OrderParams = {
    priceTarget: newPriceTarget,
    liquidationShareBP: ethers.utils.parseEther('0.05'),
    expiration: newExpiration,
    upperBound: ethers.utils.parseEther('0.1'),
    lowerBound: ethers.utils.parseEther('0.1'),
    returnLimitBP: ethers.utils.parseEther('0.9'),
    vault: AaveVaultProxy,
    depositUSDC: true,
  };

  const liquidationFeeBP = ethers.utils.parseEther('0.02');
  const BASIS = ethers.utils.parseEther('1.0');

  const aaveDepositAmount = ethers.utils.parseEther('0.1');

  before(async () => {
    [owner, maker, attacker, nonMaker] = await ethers.getSigners();
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
      'UniswapV2Router02',
      UniswapV2Router02Address,
    );

    const proxyAdminAddress = '0xF980ea5758f71F418909688b6448B41ACb5522E9';

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [ethers.utils.getAddress(proxyAdminAddress)],
    });

    AaveVaultInstance = await ethers.getContractAt('Vault', AaveVaultProxy);

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
          liquidationShareBP: makerOrder.liquidationShareBP,
          expiration: makerOrder.expiration,
          lowerBound: makerOrder.lowerBound,
          upperBound: makerOrder.upperBound,
          returnLimitBP: makerOrder.returnLimitBP,
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
            order.liquidationShareBP,
            order.expiration,
            order.lowerBound,
            order.upperBound,
            order.returnLimitBP,
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
          ).to.be.revertedWith(
            `ActiveOrder("${maker.address}", "${orderParams.vault}")`,
          );
        });

        it('expiration is before current block timestamp', async () => {
          await hre.network.provider.send('evm_setNextBlockTimestamp', [
            orderParams.expiration.toNumber(),
          ]);

          await expect(
            instance.connect(maker).createOrder(failedOrderParams),
          ).to.be.revertedWith(
            `PastExpiration(${orderParams.expiration}, ${failedOrderParams.expiration})`,
          );
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
          ).to.be.revertedWith('OrderNonExistent()');
        });
      });
    });

    describe('#execute(struct(Order),struct(SwapData))', () => {
      let snapshotId: any;
      let tx;
      let codeRoot: any;
      let accountRoot: any;
      let swapParams: SwapParams;
      let fee: BigNumber;
      let aaveRedeemed: BigNumber;
      let USDCAmount: BigNumber;
      let instanceCodeProof;
      let instanceAccountProof;

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
          .addLiquidity(
            AaveERC20Address,
            USDC,
            ethers.utils.parseEther('5000'),
            BigNumber.from('10000000000000'),
            ethers.constants.Zero,
            ethers.constants.Zero,
            USDCWhaleAddress,
            expiration.add(BigNumber.from('10000000')),
          );

        //make AaveVault not whitelisted
        //replaced only 06 with 02 to remove the whitelisted state
        const newVaultConfig =
          '0x02026bd60f089B6E8BA75c409a54CDea34AA511277f600320000000000000000';

        //set proofs for instance
        const instanceCodeHash = ethers.utils.keccak256(
          await ethers.provider.getCode(instance.address),
        );
        const codeMerkleTree = generateMerkleTreeForCodehash([
          instanceCodeHash,
        ]);

        instanceCodeProof = getProofForCode(codeMerkleTree, instanceCodeHash);

        const accountMerkleTree = generateMerkleTree([instance.address]);

        const instanceAccountProof = getProof(
          accountMerkleTree,
          instance.address,
        );
        await instance
          .connect(owner)
          .setAccountProof(instanceAccountProof, AaveVaultProxy);
        await instance
          .connect(owner)
          .setCodeProof(instanceCodeProof, AaveVaultProxy);
        await instance
          .connect(owner)
          .setAccountProof(instanceAccountProof, UsdcVaultProxy);
        await instance
          .connect(owner)
          .setCodeProof(instanceCodeProof, UsdcVaultProxy);

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

        //set AaveVault merkle roots
        await AaveVaultInstance.connect(
          optyFiVaultOperator,
        ).setWhitelistedCodesRoot(codeRoot);

        await AaveVaultInstance.connect(
          optyFiVaultOperator,
        ).setWhitelistedAccountsRoot(accountRoot);

        //approve vault to take aave from maker
        await AaveERC20.connect(maker).approve(
          AaveVaultInstance.address,
          aaveDepositAmount,
        );

        //deposit aave in opAAVE from maker
        await AaveVaultInstance.connect(maker).userDepositVault(
          maker.address,
          aaveDepositAmount,
          '0x',
          [ethers.constants.HashZero],
          [ethers.constants.HashZero],
        );

        //calculate user shares
        const userShares = await opAaveToken.balanceOf(maker.address);
        const userSharesLiquidated = orderParams.liquidationShareBP
          .mul(userShares)
          .div(BASIS);

        //approve LO contract
        await opAaveToken
          .connect(maker)
          .approve(instance.address, userSharesLiquidated);

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
        const swapDeadline = expiration.add(
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
        let startIndexes: any[] = ['0'];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(startIndexes[i] + calls[i].substring(2).length / 2);
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        startIndexes = startIndexes.map((i) => BigNumber.from(i));

        swapParams = {
          deadline: swapDeadline,
          startIndexes: startIndexes,
          callees: [AaveERC20Address, UniswapV2Router02Address],
          values: [BigNumber.from('0'), BigNumber.from('0')],
          exchangeData,
          permit: '0x',
        };

        //simulate swap call for test values
        await AaveERC20.connect(AaveWhale).approve(
          uniRouter.address,
          ethers.utils.parseEther('1000000'),
        );
        [aaveRedeemed, USDCAmount] = await uniRouter
          .connect(AaveWhale)
          .callStatic.swapExactTokensForTokens(
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
            .execute(maker.address, AaveVaultProxy, swapParams),
        ).to.changeTokenBalance(USDCERC20, maker, USDCAmount.sub(fee));
      });

      it('emits DeliverUSDC after liquidation', async () => {
        //create order from maker
        await instance.connect(maker).createOrder(orderParams);

        await expect(
          instance
            .connect(maker)
            .execute(maker.address, AaveVaultProxy, swapParams),
        )
          .to.emit(instance, 'DeliverUSDC')
          .withArgs(maker.address, USDCAmount.sub(fee));
      });

      it('sends liquidation fee to treasury', async () => {
        //create order from maker
        await instance.connect(maker).createOrder(orderParams);

        const treasuryAddress = await instance.treasury();
        const treasury = await ethers.getSigner(treasuryAddress);
        await expect(() =>
          instance
            .connect(maker)
            .execute(maker.address, AaveVaultProxy, swapParams),
        ).to.changeTokenBalance(USDCERC20, treasury, fee);
      });

      it('sends opUSDC shares to maker after USDC minus fee been deposited', async () => {
        //calculate expectedOPUSDCShares to reach user after fees
        const opUSDCVault = await ethers.getContractAt('Vault', UsdcVaultProxy);
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
            .execute(maker.address, AaveVaultProxy, swapParams),
        ).to.changeTokenBalance(UsdcVaultInstance, maker, expectedOPUSDCShares);
      });

      it('emits DeliverShares event after deposit to opUSDC vault', async () => {
        //calculate expectedOPUSDCShares to reach user after fees
        const opUSDCVault = await ethers.getContractAt('Vault', UsdcVaultProxy);
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

        await expect(
          instance
            .connect(maker)
            .execute(maker.address, AaveVaultProxy, swapParams),
        )
          .to.emit(instance, 'DeliverShares')
          .withArgs(maker.address);
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
            .execute(maker.address, AaveVaultProxy, swapParams),
        ).to.changeTokenBalance(USDCERC20, maker, USDCAmount.sub(fee));
      });

      it('emits DeliverUSDC after liquidation if the vault does not permit deposits', async () => {
        //create order from maker
        await instance.connect(maker).createOrder(orderParams);

        await expect(
          instance
            .connect(maker)
            .execute(maker.address, AaveVaultProxy, swapParams),
        )
          .to.emit(instance, 'DeliverUSDC')
          .withArgs(maker.address, USDCAmount.sub(fee));
      });

      it('may be called by any caller', async () => {
        //create order from maker
        await instance.connect(maker).createOrder(orderParams);

        await expect(() =>
          instance
            .connect(nonMaker)
            .execute(maker.address, AaveVaultProxy, swapParams),
        ).to.changeTokenBalance(USDCERC20, maker, USDCAmount.sub(fee));
      });

      describe('reverts if', () => {
        it('user does not have an active order', async () => {
          await expect(
            instance
              .connect(optyFiVaultOperator)
              .execute(optyFiVaultOperator.address, AaveVaultProxy, swapParams),
          ).to.be.revertedWith(
            `NoActiveOrder("${optyFiVaultOperator.address}")`,
          );
        });
        it('order has expired', async () => {
          const expiredTimestamp = orderParams.expiration.toNumber() + 10000;

          await instance.connect(maker).createOrder(orderParams);

          await hre.network.provider.send('evm_setNextBlockTimestamp', [
            expiredTimestamp,
          ]);

          await expect(
            instance
              .connect(maker)
              .execute(maker.address, AaveVaultProxy, swapParams),
          ).to.be.revertedWith(
            `Expired(${expiredTimestamp}, ${orderParams.expiration})`,
          );
        });
        it('price is not within bounds', async () => {
          await instance.connect(maker).createOrder(modifyOrderParams);

          const lowerError = newPriceTarget
            .mul(modifyOrderParams.lowerBound)
            .div(BASIS);
          const upperError = newPriceTarget
            .mul(modifyOrderParams.upperBound)
            .div(BASIS);
          const lowerBound = newPriceTarget.sub(lowerError);
          const upperBound = newPriceTarget.add(upperError);

          const oracle: OptyFiOracle = await ethers.getContractAt(
            'OptyFiOracle',
            await instance.oracle(),
          );
          const price = await oracle.getTokenPrice(AaveERC20.address, USD);

          await expect(
            instance
              .connect(maker)
              .execute(maker.address, AaveVaultProxy, swapParams),
          ).to.be.revertedWith(
            `UnboundPrice(${price}, ${lowerBound}, ${upperBound})`,
          );
        });

        it('return limit > swap output', async () => {
          //set return limi to be 3x what is swapped so will always fail
          orderParams.returnLimitBP = ethers.utils.parseEther('3.0');
          //create order from maker
          await instance.connect(maker).createOrder(orderParams);

          await expect(
            instance
              .connect(maker)
              .execute(maker.address, AaveVaultProxy, swapParams),
          ).to.be.revertedWith(`InsufficientReturn()`);
        });
      });

      describe('prevent malicious swap data attack vectors', () => {
        it('prevents false beneficiary attack via internal setting beneficiary == LimitOrderDiamond.address', async () => {
          //create order from maker
          await instance.connect(maker).createOrder(orderParams);

          //calculate user shares
          const userShares = await opAaveToken.balanceOf(maker.address);
          const userSharesLiquidated = orderParams.liquidationShareBP
            .mul(userShares)
            .div(BASIS);

          //approve LO contract
          await opAaveToken
            .connect(maker)
            .approve(instance.address, userSharesLiquidated);

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

          const swapDeadline = expiration.add(
            BigNumber.from('1000000000000000000000000000000000000'),
          );

          //ENCODE MALICIOUS SWAP DATA
          const uniswapData = uniRouter.interface.encodeFunctionData(
            'swapExactTokensForTokens',
            [
              expectedAaveRedeemed,
              ethers.constants.Zero,
              [AaveERC20Address, USDC],
              attacker.address,
              swapDeadline,
            ],
          );

          //construct swapData
          const calls: string[] = [approveData, uniswapData];
          let startIndexes: any[] = ['0'];
          let exchangeData = `0x`;
          for (const i in calls) {
            startIndexes.push(
              startIndexes[i] + calls[i].substring(2).length / 2,
            );
            exchangeData = exchangeData.concat(calls[i].substring(2));
          }

          startIndexes = startIndexes.map((i) => BigNumber.from(i));

          swapParams = {
            callees: [AaveERC20Address, UniswapV2Router02Address],
            exchangeData,
            startIndexes,
            values: [BigNumber.from('0'), BigNumber.from('0')],
            permit: '0x',
            deadline: swapDeadline,
          };

          //attacker attempts to send liquidated + swapped tokens to themselves, however
          //OptyFiSwapper has received no tokens, therefore reverts
          await expect(
            instance
              .connect(attacker)
              .execute(maker.address, AaveVaultProxy, swapParams),
          ).to.be.revertedWith('InsufficientReturn()');
        });
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
          liquidationShareBP: makerOrder.liquidationShareBP,
          expiration: makerOrder.expiration,
          lowerBound: makerOrder.lowerBound,
          upperBound: makerOrder.upperBound,
          returnLimitBP: makerOrder.returnLimitBP,
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
          ).to.be.revertedWith(`NoActiveOrder("${maker.address}")`);
        });
      });
    });
  });
}
