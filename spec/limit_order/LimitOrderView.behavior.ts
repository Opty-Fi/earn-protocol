import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import hre from 'hardhat';
import { addABI } from 'abi-decoder';
import {
  generateMerkleTree,
  generateMerkleTreeForCodehash,
  getProof,
  getProofForCode,
} from '../../scripts/utils';
import {
  IERC20,
  ILimitOrder,
  ILimitOrder__factory,
  IOps__factory,
  ISwapper,
  ISwapRouter,
  IUniswapV2Router02,
  IUniswapV2Router02__factory,
  OptyFiOracle,
  UniswapV2Router02,
  Vault,
} from '../../typechain-types';
import { ISwapRouter__factory } from '../../typechain-types/factories/ISwapRouter__factory';
import { convertOrderParamsToOrder } from '../../utils/converters';
import { Order, OrderParams, SwapParams } from '../../utils/types';

addABI(ILimitOrder__factory.abi);
addABI(IOps__factory.abi);

export function describeBehaviorOfLimitOrderView(
  deploy: () => Promise<ILimitOrder>,
  deploySwapper: () => Promise<ISwapper>,
  skips?: string[],
) {
  const ethers = hre.ethers;
  let instance: ILimitOrder;
  let swapper: ISwapper;
  let owner: SignerWithAddress;
  let maker: SignerWithAddress;
  let optyFiVaultOperator: SignerWithAddress;
  let AaveWhale: SignerWithAddress;
  let USDCWhale: SignerWithAddress;
  let AaveERC20: IERC20;
  let USDCERC20: IERC20;
  let opAaveToken: IERC20;
  let AaveVaultInstance: Vault;
  let uniRouter: UniswapV2Router02;
  let uniV3Router: ISwapRouter;

  //EOA
  const AaveWhaleAddress = '0x80845058350b8c3df5c3015d8a717d64b3bf9267';
  const USDCWhaleAddress = '0x4da085ef29a25af96e3a53a53e6ba899f1766a71';
  const optyFiVaultOperatorAddress =
    '0x6bd60f089B6E8BA75c409a54CDea34AA511277f6';

  //Contracts
  const AaveVaultProxy = '0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19';
  const UsdcVaultProxy = '0x6d8BfdB4c4975bB086fC9027e48D5775f609fF88';
  const Gelato_Pokeme = '0xB3f5503f93d5Ef84b06993a1975B9D21B962892F'; // mainnet
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const AaveERC20Address = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9';
  const UniswapV3RouterAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; //mainnet
  const UniswapV2Router02Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; //mainnet

  //Params
  const expirationNum = 1657190461 + 120; //unix timestamp of block 15095000 + 120s
  const expiration = BigNumber.from(expirationNum.toString());

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

  const liquidationFeeBP = ethers.utils.parseEther('0.02');

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

    AaveVaultInstance = await ethers.getContractAt('Vault', AaveVaultProxy);

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

    uniRouter = <IUniswapV2Router02>(
      await ethers.getContractAt(
        IUniswapV2Router02__factory.abi,
        UniswapV2Router02Address,
      )
    );

    uniV3Router = <ISwapRouter>(
      await ethers.getContractAt(
        ISwapRouter__factory.abi,
        UniswapV3RouterAddress,
      )
    );
  });
  beforeEach(async () => {
    instance = await deploy();
    swapper = await deploySwapper();
  });

  describe.only(':LimitOrderView', () => {
    describe('#userVaultOrder(address,address)', () => {
      it('returns the order made by a given user for a given vault', async () => {
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
          stablecoinVault: UsdcVaultProxy,
          maker: makerOrder.maker,
          vault: makerOrder.vault,
          direction: BigNumber.from(makerOrder.direction.toString()),
        };

        expect(createdOrder).to.deep.equal(
          convertOrderParamsToOrder(orderParams, maker.address),
        );
      });
    });

    describe('#userVaultOrderActive(address,address)', () => {
      it('returns active status of a user vault order', async () => {
        await instance.connect(maker).createOrder(orderParams);
        expect(
          await instance.userVaultOrderActive(maker.address, AaveVaultProxy),
        ).to.eq(true);
      });
    });

    describe('#vaultFee(address)', () => {
      it('returns the fee in basis points for a given vault', async () => {
        await instance
          .connect(owner)
          .setVaultLiquidationFee(liquidationFeeBP, AaveVaultProxy);
        expect(await instance.vaultFee(AaveVaultProxy)).to.eq(liquidationFeeBP);
      });
    });

    describe('#treasury()', () => {
      it('returns the address of the treasury', async () => {
        await instance.connect(owner).setTreasury(maker.address);
        expect(await instance.treasury()).to.eq(maker.address);
      });
    });

    describe('#codeProof(address)', () => {
      it('returns the codeProof of the LimitOrder instance for a given vault', async () => {
        //note: this is the initialization value
        expect((await instance.codeProof(AaveVaultProxy)).length).to.eq(
          ethers.constants.Zero,
        );
      });
    });

    describe('#accountProof(address)', () => {
      it('returns the accountProof of the LimitOrder instance for a given vault', async () => {
        //note: this is the initialization value
        expect((await instance.accountProof(AaveVaultProxy)).length).to.eq(
          ethers.constants.Zero,
        );
      });
    });

    describe('#swapDiamond()', () => {
      it('returns the address of OptyFiSwapper diamond', async () => {
        expect(await instance.swapDiamond()).to.eq(swapper.address);
      });
    });

    describe('#ops()', () => {
      it('returns the address of the opsInstance', async () => {
        expect(await instance.ops()).to.eq(Gelato_Pokeme);
      });
    });

    describe.only('Gelato resolver functions', () => {
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

      const BASIS = ethers.utils.parseEther('1.0');
      const aaveDepositAmount = ethers.utils.parseEther('0.1');

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
      });

      afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshotId]);
      });

      describe('#canExecuteOrderUniV3(address,address)', () => {
        it('if an order may be executed via UniV3 Router by gelato, returns true and the execution payload', async () => {
          const opAAVEprice = await AaveVaultInstance.getPricePerFullShare();

          await instance.connect(maker).createOrder(orderParams);

          const timestamp = await (
            await ethers.provider.getBlock('latest')
          ).timestamp;

          const approveData = AaveERC20.interface.encodeFunctionData(
            'approve',
            [uniV3Router.address, ethers.constants.MaxUint256],
          );

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

          const uniswapV3Data = uniV3Router.interface.encodeFunctionData(
            'exactInput',
            [
              {
                path: await instance.swapPath(AaveERC20Address, USDC),
                recipient: await instance.swapDiamond(),
                deadline: timestamp + 20 * 60,
                amountIn: expectedAaveRedeemed,
                amountOutMinimum: expectedUSDC,
              },
            ],
          );

          //construct swapData
          const calls: string[] = [approveData, uniswapV3Data];
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
            callees: [AaveERC20Address, uniV3Router.address],
            exchangeData,
            permit: '0x',
          };

          const expectedPayload = instance.interface.encodeFunctionData(
            'execute',
            [maker.address, opAaveToken.address, swapParams],
          );

          const [canExec, payload] = await instance.canExecuteOrderUniV3(
            maker.address,
            AaveVaultProxy,
          );

          expect(payload).to.eq(expectedPayload);
          expect(canExec).to.be.true;
        });
      });
    });

    describe('#canExecuteOrderUniV3(address,address)', () => {
      it('returns true if an order may be executed by gelato ops via UniV3 router', async () => {
        await instance.connect(maker).createOrder(orderParams);
        expect(
          await instance.canExecuteOrder(maker.address, AaveVaultProxy),
        ).to.eq(true);
      });
    });
    describe('#vaultWhitelisted(address)', () => {});
    describe('#swapPath(address,address)', () => {});
  });
}
