import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import hre from 'hardhat';
import { BigNumber, providers } from 'ethers';
import { expect } from 'chai';
import { decodeLogs, addABI } from 'abi-decoder';
import { getAddress } from 'ethers/lib/utils';
import {
  DecodedLogType,
  Order,
  OrderParams,
  SwapParams,
} from '../../utils/types';
import {
  IERC20,
  ILimitOrder,
  ISwapper,
  UniswapV2Router02,
  Vault,
  OptyFiOracle,
  IOps__factory,
  IOps,
  ITaskTreasury,
  ITaskTreasury__factory,
  ILimitOrder__factory,
} from '../../typechain-types';
import { convertOrderParamsToOrder } from '../../utils/converters';
import {
  generateMerkleTree,
  generateMerkleTreeForCodehash,
  getProof,
  getProofForCode,
} from '../../scripts/utils';

addABI(ILimitOrder__factory.abi);
addABI(IOps__factory.abi);

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
  let GelatoNetworkSigner: SignerWithAddress;

  let instance: ILimitOrder;
  let AaveVaultInstance: Vault;
  let opsInstance: IOps;
  let gelatoTaskTreasury: ITaskTreasury;
  let UsdcVaultInstance: IERC20;
  let AaveERC20: IERC20;
  let USDCERC20: IERC20;
  let opAaveToken: IERC20;
  let swapper: ISwapper;
  let uniRouter: UniswapV2Router02;
  let liquidationAmount: BigNumber;

  //EOA
  const AaveWhaleAddress = '0x80845058350b8c3df5c3015d8a717d64b3bf9267';
  const USDCWhaleAddress = '0x4da085ef29a25af96e3a53a53e6ba899f1766a71';
  const optyFiVaultOperatorAddress =
    '0x6bd60f089B6E8BA75c409a54CDea34AA511277f6';

  //Tokens
  const USD = '0x0000000000000000000000000000000000000348';
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const AaveERC20Address = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9';
  const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

  //Contracts
  const AaveVaultProxy = '0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19';
  const UsdcVaultProxy = '0x6d8BfdB4c4975bB086fC9027e48D5775f609fF88';
  const UniswapV2Router02Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; //mainnet
  const Gelato_Network = '0x3CACa7b48D0573D793d3b0279b5F0029180E83b6'; // mainnet
  const Gelato_Pokeme = '0xB3f5503f93d5Ef84b06993a1975B9D21B962892F'; // mainnet
  const Gelato_Task_Treasury = '0x2807B4aE232b624023f87d0e237A3B1bf200Fd99'; // mainnet

  //Params
  const expirationNum = 1657190461 + 120; //unix timestamp of block 15095000 + 120s
  const expiration = BigNumber.from(expirationNum.toString());
  const newExpiration = expiration.add(BigNumber.from('120'));

  const priceTarget = ethers.utils.parseEther('100'); //always high enough to execute order for testing
  const newPriceTarget = ethers.utils.parseEther('1');

  const orderParams: OrderParams = {
    liquidationAmount: ethers.BigNumber.from('0'),
    expiration: expiration,
    upperBound: ethers.utils.parseEther('150'),
    lowerBound: ethers.utils.parseEther('50'),
    direction: ethers.constants.One,
    returnLimitBP: ethers.utils.parseEther('0.99'),
    stablecoinVault: UsdcVaultProxy,
    vault: AaveVaultProxy,
  };

  const failedOrderParams: OrderParams = {
    liquidationAmount: ethers.BigNumber.from('0'),
    expiration: expiration.sub(BigNumber.from('1000')),
    upperBound: ethers.utils.parseEther('150'),
    lowerBound: ethers.utils.parseEther('50'),
    direction: ethers.constants.Zero,
    returnLimitBP: ethers.utils.parseEther('0.99'),
    stablecoinVault: UsdcVaultProxy,
    vault: AaveVaultProxy,
  };

  const modifyOrderParams: OrderParams = {
    liquidationAmount: ethers.BigNumber.from('0'),
    expiration: newExpiration,
    upperBound: ethers.utils.parseEther('250'),
    lowerBound: ethers.utils.parseEther('150'),
    direction: ethers.constants.Zero,
    returnLimitBP: ethers.utils.parseEther('0.9'),
    stablecoinVault: UsdcVaultProxy,
    vault: AaveVaultProxy,
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
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [Gelato_Network],
    });
    GelatoNetworkSigner = await ethers.getSigner(Gelato_Network);
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

    opsInstance = <IOps>(
      await ethers.getContractAt(IOps__factory.abi, Gelato_Pokeme)
    );

    gelatoTaskTreasury = <ITaskTreasury>(
      await ethers.getContractAt(
        ITaskTreasury__factory.abi,
        Gelato_Task_Treasury,
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
        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(2);
        await instance.connect(maker).createOrder(orderParams);

        const makerOrder = await instance.userVaultOrder(
          maker.address,
          AaveVaultProxy,
        );

        const createdOrder: Order = {
          liquidationAmount: makerOrder.liquidationAmount,
          expiration: makerOrder.expiration,
          lowerBound: makerOrder.lowerBound,
          upperBound: makerOrder.upperBound,
          returnLimitBP: makerOrder.returnLimitBP,
          maker: makerOrder.maker,
          vault: makerOrder.vault,
          stablecoinVault: UsdcVaultProxy,
          direction: BigNumber.from(makerOrder.direction.toString()),
        };

        const order = convertOrderParamsToOrder(orderParams, maker.address);
        expect(createdOrder).to.deep.equal(order);
      });

      it('emits LimitOrderCreated event', async () => {
        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(2);
        const order = convertOrderParamsToOrder(orderParams, maker.address);
        const resolverHash = ethers.utils.keccak256(
          new ethers.utils.AbiCoder().encode(
            ['address', 'bytes'],
            [
              instance.address,
              instance.interface.encodeFunctionData('canExecuteOrder', [
                maker.address,
                opAaveToken.address,
              ]),
            ],
          ),
        );

        const _taskId = await opsInstance.getTaskId(
          instance.address,
          instance.address,
          await opsInstance.getSelector(
            'execute(address,address,(uint256,uint256[],uint256[],address[],bytes,bytes))',
          ),
          true,
          ethers.constants.AddressZero,
          resolverHash,
        );

        await expect(await instance.connect(maker).createOrder(orderParams))
          .to.emit(instance, 'LimitOrderCreated')
          .withArgs([
            order.liquidationAmount,
            order.expiration,
            order.lowerBound,
            order.upperBound,
            order.returnLimitBP,
            _taskId,
            order.maker,
            order.vault,
            order.stablecoinVault,
            order.direction,
          ]);
      });

      describe('reverts if', () => {
        it('user has an active limit order', async () => {
          const userShares = await opAaveToken.balanceOf(maker.address);
          orderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(2);
          await instance.connect(maker).createOrder(orderParams);

          await expect(
            instance.connect(maker).createOrder(orderParams),
          ).to.be.revertedWith(
            `ActiveOrder("${maker.address}", "${orderParams.vault}")`,
          );
        });

        it('expiration is before current block timestamp', async () => {
          const userShares = await opAaveToken.balanceOf(maker.address);
          orderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(2);
          await hre.network.provider.send('evm_setNextBlockTimestamp', [
            orderParams.expiration.toNumber(),
          ]);

          failedOrderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(2);

          await expect(
            instance.connect(maker).createOrder(failedOrderParams),
          ).to.be.revertedWith(
            `PastExpiration(${orderParams.expiration}, ${failedOrderParams.expiration})`,
          );
        });

        it('lower bound is larger than upper bound', async () => {
          const userShares = await opAaveToken.balanceOf(maker.address);
          failedOrderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(2);
          failedOrderParams.upperBound = ethers.constants.Zero;
          failedOrderParams.expiration = failedOrderParams.expiration.add(
            BigNumber.from('10000'),
          );
          await expect(
            instance.connect(maker).createOrder(failedOrderParams),
          ).to.be.revertedWith(`ReverseBounds()`);
        });

        it('destination is not whitelisted', async () => {
          failedOrderParams.upperBound = orderParams.upperBound;
          failedOrderParams.expiration = orderParams.expiration;
          failedOrderParams.stablecoinVault = maker.address;
          await expect(
            instance.connect(maker).createOrder(failedOrderParams),
          ).to.be.revertedWith(`ForbiddenDestination()`);
        });
      });
    });

    describe('#cancelOrder(address)', () => {
      it('cancels an active order', async () => {
        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(2);
        await instance.connect(maker).createOrder(orderParams);

        expect(
          await instance.userVaultOrderActive(maker.address, AaveVaultProxy),
        ).to.eq(true);

        expect(await instance.connect(maker).cancelOrder(AaveVaultProxy))
          .to.emit(opsInstance, 'TaskCancelled')
          .withArgs([
            await (
              await instance.userVaultOrder(maker.address, opAaveToken.address)
            ).taskId,
            instance.address,
          ]);

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
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div('2');
        const userSharesLiquidated = orderParams.liquidationAmount;

        //approve LO contract
        await opAaveToken
          .connect(maker)
          .approve(instance.address, ethers.constants.MaxUint256);

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
          startIndexes.push(
            parseInt(startIndexes[i]) + calls[i].substring(2).length / 2,
          );
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

        // fund Gelato
        await gelatoTaskTreasury
          .connect(maker)
          .depositFunds(instance.address, ETH, ethers.utils.parseEther('1'), {
            value: ethers.utils.parseEther('1'),
          });
      });

      afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshotId]);
      });
      it('sends liquidation fee to treasury', async () => {
        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div('2');
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

        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(2);

        //create order from maker
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

        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(2);

        //create order from maker
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
        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(2);
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
        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(2);
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

      it('may be called by any caller, task should be cancelled', async () => {
        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(2);
        //create order from maker
        await instance.connect(maker).createOrder(orderParams);

        const makerUSDCBalanceBefore = await USDCERC20.balanceOf(maker.address);
        const tx = await instance
          .connect(nonMaker)
          .execute(maker.address, AaveVaultProxy, swapParams);
        const { logs } = await tx.wait(1);
        const [TaskCancelledEventData, DeliverUSDCEventData]: DecodedLogType[] =
          decodeLogs(logs);

        expect(TaskCancelledEventData.name).eq('TaskCancelled');
        expect(TaskCancelledEventData.events[0].name).to.eq('taskId');
        expect(TaskCancelledEventData.events[0].type).to.eq('bytes32');
        expect(TaskCancelledEventData.events[0].value).to.eq(
          await (
            await instance.userVaultOrder(maker.address, opAaveToken.address)
          ).taskId,
        );
        expect(TaskCancelledEventData.events[1].name).to.eq('taskCreator');
        expect(TaskCancelledEventData.events[1].type).to.eq('address');
        expect(getAddress(TaskCancelledEventData.events[1].value)).to.eq(
          getAddress(instance.address),
        );
        expect(ethers.utils.getAddress(TaskCancelledEventData.address)).to.eq(
          ethers.utils.getAddress(Gelato_Pokeme),
        );

        expect(DeliverUSDCEventData.name).to.eq('DeliverUSDC');
        expect(DeliverUSDCEventData.events[0].name).to.eq('_maker');
        expect(DeliverUSDCEventData.events[0].type).to.eq('address');
        expect(getAddress(DeliverUSDCEventData.events[0].value)).to.eq(
          getAddress(maker.address),
        );
        expect(DeliverUSDCEventData.events[1].name).to.eq('_amount');
        expect(DeliverUSDCEventData.events[1].type).to.eq('uint256');
        expect(DeliverUSDCEventData.events[1].value.toString()).to.eq(
          USDCAmount.sub(fee).toString(),
        );
        expect(getAddress(DeliverUSDCEventData.address)).to.eq(
          getAddress(instance.address),
        );

        expect(await USDCERC20.balanceOf(maker.address)).to.eq(
          USDCAmount.sub(fee).add(makerUSDCBalanceBefore),
        );
      });

      it('Gelato resolves the order, limit order emits DeliverShares event after deposit to opUSDC vault', async () => {
        //calculate expectedOPUSDCShares to reach user after fees
        const opUSDCVault = await ethers.getContractAt('Vault', UsdcVaultProxy);
        const opAAVEprice = await AaveVaultInstance.getPricePerFullShare();
        const opUSDCprice = await opUSDCVault.getPricePerFullShare();
        const USDCAmountAfterFee = USDCAmount.sub(fee);
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

        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(2);

        const resolverHash = ethers.utils.keccak256(
          new ethers.utils.AbiCoder().encode(
            ['address', 'bytes'],
            [
              instance.address,
              instance.interface.encodeFunctionData('canExecuteOrder', [
                maker.address,
                opAaveToken.address,
              ]),
            ],
          ),
        );

        const _taskId = await opsInstance.getTaskId(
          instance.address,
          instance.address,
          await opsInstance.getSelector(
            'execute(address,address,(uint256,uint256[],uint256[],address[],bytes,bytes))',
          ),
          true,
          ethers.constants.AddressZero,
          resolverHash,
        );

        const _resolverData = instance.interface.encodeFunctionData(
          'canExecuteOrder',
          [maker.address, opAaveToken.address],
        );

        //create order from maker
        expect(await instance.connect(maker).createOrder(orderParams))
          .to.emit(opsInstance, 'TaskCreated')
          .withArgs([
            instance.address,
            instance.address,
            await opsInstance.getSelector(
              'execute(address,address,(uint256,uint256[],uint256[],address[],bytes,bytes))',
            ),
            instance.address,
            _taskId,
            _resolverData,
            true,
            ethers.constants.AddressZero,
            resolverHash,
          ]);

        const timestamp = await (
          await ethers.provider.getBlock('latest')
        ).timestamp;

        const approveData = AaveERC20.interface.encodeFunctionData('approve', [
          uniRouter.address,
          ethers.constants.MaxUint256,
        ]);

        const expectedAaveRedeemed = opAAVEprice
          .mul(orderParams.liquidationAmount)
          .div(BigNumber.from('10').pow('18'));

        const oracle: OptyFiOracle = await ethers.getContractAt(
          'OptyFiOracle',
          await instance.oracle(),
        );

        const expectedUSDC = BigNumber.from(
          expectedAaveRedeemed
            .mul(await oracle.getTokenPrice(AaveERC20Address, USDC))
            .mul(BigNumber.from('10').pow('6')),
        )
          .div(BigNumber.from('10').pow(BigNumber.from('18').add('18')))
          .mul(BigNumber.from('99'))
          .div('100');

        const uniswapData = uniRouter.interface.encodeFunctionData(
          'swapExactTokensForTokens',
          [
            expectedAaveRedeemed,
            expectedUSDC,
            [AaveERC20Address, USDC],
            await instance.swapDiamond(),
            timestamp + 20 * 60,
          ],
        );

        //construct swapData
        const calls: string[] = [approveData, uniswapData];
        let startIndexes: any[] = ['0'];
        let exchangeData = `0x`;
        for (const i in calls) {
          startIndexes.push(
            parseInt(startIndexes[i]) + calls[i].substring(2).length / 2,
          );
          exchangeData = exchangeData.concat(calls[i].substring(2));
        }

        startIndexes = startIndexes.map((i) => BigNumber.from(i));

        swapParams = {
          deadline: BigNumber.from(timestamp + 10 * 60),
          startIndexes: startIndexes,
          values: [BigNumber.from('0'), BigNumber.from('0')],
          callees: [AaveERC20Address, UniswapV2Router02Address],
          exchangeData,
          permit: '0x',
        };

        const expectedPayload = instance.interface.encodeFunctionData(
          'execute',
          [maker.address, opAaveToken.address, swapParams],
        );

        const [canExec, execPayload] = ethers.utils.defaultAbiCoder.decode(
          ['bool', 'bytes'],
          await ethers.provider.call({
            to: instance.address,
            data: _resolverData,
          }),
        );

        // assert the payload
        expect(execPayload).to.eq(expectedPayload);

        expect(canExec).to.be.true;

        expect(
          await opsInstance
            .connect(GelatoNetworkSigner)
            .exec(
              ethers.utils.parseEther('1'),
              ETH,
              instance.address,
              true,
              true,
              resolverHash,
              instance.address,
              execPayload,
            ),
        )
          .to.emit(instance, 'DeliverShares')
          .withArgs(maker.address);
      });

      describe('reverts if', () => {
        it('user does not have an active order', async () => {
          const [_canExec, execPayload] = await instance.canExecuteOrder(
            optyFiVaultOperator.address,
            AaveVaultProxy,
          );
          expect(_canExec).to.be.false;
          expect(execPayload).to.eq(
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes('no active order')),
          );

          await expect(
            instance
              .connect(optyFiVaultOperator)
              .execute(optyFiVaultOperator.address, AaveVaultProxy, swapParams),
          ).to.be.revertedWith('no active order');
        });

        it('order has expired', async () => {
          const userShares = await opAaveToken.balanceOf(maker.address);
          orderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(2);

          await instance.connect(maker).createOrder({
            liquidationAmount: ethers.BigNumber.from('0'),
            expiration:
              (await (await ethers.provider.getBlock('latest')).timestamp) + 1,
            upperBound: ethers.utils.parseEther('150'),
            lowerBound: ethers.utils.parseEther('50'),
            direction: ethers.constants.One,
            returnLimitBP: ethers.utils.parseEther('0.99'),
            vault: AaveVaultProxy,
            stablecoinVault: UsdcVaultProxy,
          });

          const expiredTimestamp =
            (await (await ethers.provider.getBlock('latest')).timestamp) +
            10000;

          await hre.network.provider.send('evm_setNextBlockTimestamp', [
            expiredTimestamp,
          ]);

          const [_canExec, execPayload] = await instance.canExecuteOrder(
            maker.address,
            AaveVaultProxy,
          );
          expect(_canExec).to.be.false;
          expect(execPayload).to.eq(
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes('expired')),
          );

          await expect(
            instance
              .connect(maker)
              .execute(maker.address, AaveVaultProxy, swapParams),
          ).to.be.revertedWith('expired');
        });

        it('price is outwith bounds when set to be within bounds', async () => {
          const userShares = await opAaveToken.balanceOf(maker.address);
          modifyOrderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(3);
          modifyOrderParams.direction = ethers.constants.One;
          await instance.connect(maker).createOrder(modifyOrderParams);

          const oracle: OptyFiOracle = await ethers.getContractAt(
            'OptyFiOracle',
            await instance.oracle(),
          );
          const price = await oracle.getTokenPrice(AaveERC20.address, USD);

          const [_canExec, execPayload] = await instance.canExecuteOrder(
            maker.address,
            AaveVaultProxy,
          );
          expect(_canExec).to.be.false;
          expect(execPayload).to.eq(
            ethers.utils.hexlify(
              ethers.utils.toUtf8Bytes('price out with bounds'),
            ),
          );

          await expect(
            instance
              .connect(maker)
              .execute(maker.address, AaveVaultProxy, swapParams),
          ).to.be.revertedWith('price out with bounds');
        });

        it('price is within bounds when set to be outwith bounds', async () => {
          const userShares = await opAaveToken.balanceOf(maker.address);
          modifyOrderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(3);
          modifyOrderParams.direction = ethers.constants.Zero;
          modifyOrderParams.lowerBound = ethers.utils.parseEther('50.0');
          modifyOrderParams.upperBound = ethers.utils.parseEther('70.0');

          await instance.connect(maker).createOrder(modifyOrderParams);

          const oracle: OptyFiOracle = await ethers.getContractAt(
            'OptyFiOracle',
            await instance.oracle(),
          );
          const price = await oracle.getTokenPrice(AaveERC20.address, USD);

          const [_canExec, execPayload] = await instance.canExecuteOrder(
            maker.address,
            AaveVaultProxy,
          );
          expect(_canExec).to.be.false;
          expect(execPayload).to.eq(
            ethers.utils.hexlify(
              ethers.utils.toUtf8Bytes('price within bounds'),
            ),
          );

          await expect(
            instance
              .connect(maker)
              .execute(maker.address, AaveVaultProxy, swapParams),
          ).to.be.revertedWith('price within bounds');
        });

        it('return limit > swap output', async () => {
          const userShares = await opAaveToken.balanceOf(maker.address);
          orderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(2);
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

        it('user does not have enough share balance', async () => {
          const userShares = await opAaveToken.balanceOf(maker.address);
          orderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(2);

          await instance.connect(maker).createOrder(orderParams);

          await opAaveToken
            .connect(maker)
            .transfer(nonMaker.address, userShares);

          const [_canExec, execPayload] = await instance.canExecuteOrder(
            maker.address,
            AaveVaultProxy,
          );
          expect(_canExec).to.be.false;
          expect(execPayload).to.eq(
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Not enough shares')),
          );

          await opAaveToken
            .connect(nonMaker)
            .transfer(maker.address, userShares);
        });
      });

      describe('prevent malicious swap data attack vectors', () => {
        it('prevents false beneficiary attack via internal setting beneficiary == LimitOrderDiamond.address', async () => {
          const userShares = await opAaveToken.balanceOf(maker.address);
          orderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(2);
          //create order from maker
          await instance.connect(maker).createOrder(orderParams);

          //calculate user shares
          const userSharesLiquidated = orderParams.liquidationAmount;

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
              parseInt(startIndexes[i]) + calls[i].substring(2).length / 2,
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
        const userShares = await opAaveToken.balanceOf(maker.address);
        orderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(2);
        await instance.connect(maker).createOrder(orderParams);

        modifyOrderParams.liquidationAmount =
          ethers.BigNumber.from(userShares).div(3);

        await instance
          .connect(maker)
          .modifyOrder(AaveVaultProxy, modifyOrderParams);

        const makerOrder = await instance.userVaultOrder(
          maker.address,
          AaveVaultProxy,
        );
        const modifiedOrder: Order = {
          liquidationAmount: makerOrder.liquidationAmount,
          expiration: makerOrder.expiration,
          lowerBound: makerOrder.lowerBound,
          upperBound: makerOrder.upperBound,
          direction: BigNumber.from(makerOrder.direction.toString()),
          returnLimitBP: makerOrder.returnLimitBP,
          stablecoinVault: UsdcVaultProxy,
          maker: makerOrder.maker,
          vault: makerOrder.vault,
        };

        const order = convertOrderParamsToOrder(
          modifyOrderParams,
          maker.address,
        );

        expect(order).to.deep.eq(modifiedOrder);
      });

      describe('reverts if', () => {
        it('user does not have an active order to modify', async () => {
          const userShares = await opAaveToken.balanceOf(maker.address);
          modifyOrderParams.liquidationAmount =
            ethers.BigNumber.from(userShares).div(3);
          await expect(
            instance
              .connect(maker)
              .modifyOrder(AaveVaultProxy, modifyOrderParams),
          ).to.be.revertedWith(`NoActiveOrder("${maker.address}")`);
        });

        it('expiration is before current block timestamp', async () => {
          await instance.connect(maker).createOrder(orderParams);

          await hre.network.provider.send('evm_setNextBlockTimestamp', [
            orderParams.expiration.toNumber(),
          ]);

          modifyOrderParams.expiration = ethers.constants.Zero;

          await expect(
            instance
              .connect(maker)
              .modifyOrder(AaveVaultProxy, modifyOrderParams),
          ).to.be.revertedWith(
            `PastExpiration(${orderParams.expiration}, ${modifyOrderParams.expiration})`,
          );
        });

        it('lower bound is larger than upper bound', async () => {
          await instance.connect(maker).createOrder(orderParams);

          modifyOrderParams.upperBound = ethers.constants.Zero;
          modifyOrderParams.expiration = orderParams.expiration.add(
            BigNumber.from('10000'),
          );
          await expect(
            instance
              .connect(maker)
              .modifyOrder(AaveVaultProxy, modifyOrderParams),
          ).to.be.revertedWith(`ReverseBounds()`);
        });

        it('destination is not whitelisted', async () => {
          await instance.connect(maker).createOrder(orderParams);

          modifyOrderParams.lowerBound = orderParams.lowerBound;
          modifyOrderParams.upperBound = orderParams.upperBound;
          modifyOrderParams.stablecoinVault = maker.address;
          await expect(
            instance
              .connect(maker)
              .modifyOrder(AaveVaultProxy, modifyOrderParams),
          ).to.be.revertedWith(`ForbiddenDestination()`);
        });
      });
    });
  });
}
