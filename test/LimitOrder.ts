import { ContractTransaction } from 'ethers';
import hre from 'hardhat';
import { describeBehaviorOfLimitOrder } from '../spec/limit_order/LimitOrder.behavior';
import {
  LimitOrderDiamond,
  LimitOrderDiamond__factory,
  LimitOrderActions__factory,
  LimitOrderSettings__factory,
  LimitOrderView__factory,
  OptyFiSwapper,
  OptyFiSwapper__factory,
  Swap__factory,
  SwapView__factory,
  ILimitOrder,
  ISwapper,
  ILimitOrder__factory,
  ISwapper__factory,
  OptyFiOracle,
  OptyFiOracle__factory,
  Vault,
  AdminUpgradeabilityProxy__factory,
} from '../typechain-types';
import { TokenPairPriceFeed } from '../utils/types';

describe('::LimitOrder Contracts', () => {
  const ethers = hre.ethers;

  let snapshotId: number;

  let deployer: any;
  let treasury: any;
  let optyFiVaultOperator: any;

  let LimitOrderDiamond: LimitOrderDiamond;
  let OptyFiSwapper: OptyFiSwapper;
  let Oracle: OptyFiOracle;
  let aaveVault: Vault;
  let usdcVault: Vault;

  let limitOrderInstance: ILimitOrder;
  let swapperInstance: ISwapper;

  const optyFiVaultOperatorAddress =
    '0x6bd60f089B6E8BA75c409a54CDea34AA511277f6';
  const AaveVaultProxy = '0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19';
  const USDCVaultProxy = '0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88';
  const RegistryProxy = '0x99fa011e33a8c6196869dec7bc407e896ba67fe3';
  const USD = '0x0000000000000000000000000000000000000348';
  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; //mainnet
  const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; //mainnet
  const opUSDC = '0x6d8BfdB4c4975bB086fC9027e48D5775f609fF88'; //mainnet
  const AaveERC20Address = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'; //mainnet
  const AaveUSDpriceFeed = '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9'; //mainnet
  const USDCUSDpriceFeed = '0x8fffffd4afb6115b954bd326cbe7b4ba576818f6'; //mainnet
  const Gelato_Ops = '0xB3f5503f93d5Ef84b06993a1975B9D21B962892F'; // mainnet
  const uniswapRouter = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // mainnet
  const uniswapV3Router = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // mainnet

  before(async () => {
    [deployer, , , treasury] = await ethers.getSigners();

    const day = ethers.BigNumber.from('86400');

    Oracle = await new OptyFiOracle__factory(deployer).deploy(day, day);

    const pricesFeeds: TokenPairPriceFeed[] = [
      {
        tokenA: AaveERC20Address,
        tokenB: USD,
        priceFeed: AaveUSDpriceFeed,
      },
      {
        tokenA: USDC,
        tokenB: USD,
        priceFeed: USDCUSDpriceFeed,
      },
    ];
    await Oracle.connect(deployer).setChainlinkPriceFeed(pricesFeeds);

    OptyFiSwapper = await new OptyFiSwapper__factory(deployer).deploy();
    const swapperSelectors = new Set();
    const swapperFacetCuts = [
      await new Swap__factory(deployer).deploy(),
      await new SwapView__factory(deployer).deploy(),
    ].map(function (f) {
      return {
        target: f.address,
        action: 0,
        selectors: Object.keys(f.interface.functions)
          .filter((fn) => !swapperSelectors.has(fn) && swapperSelectors.add(fn))
          .map((fn) => f.interface.getSighash(fn)),
      };
    });

    await OptyFiSwapper.diamondCut(
      swapperFacetCuts,
      ethers.constants.AddressZero,
      '0x',
    );

    LimitOrderDiamond = await new LimitOrderDiamond__factory(deployer).deploy(
      treasury.address,
      Oracle.address,
      OptyFiSwapper.address,
      Gelato_Ops,
    );

    const limitOrderSelectors = new Set();

    const limitOrderFacetCuts = [
      await new LimitOrderActions__factory(deployer).deploy(USD),
      await new LimitOrderSettings__factory(deployer).deploy(USD),
      await new LimitOrderView__factory(deployer).deploy(USD),
    ].map(function (f) {
      return {
        target: f.address,
        action: 0,
        selectors: Object.keys(f.interface.functions)
          .filter(
            (fn) => !limitOrderSelectors.has(fn) && limitOrderSelectors.add(fn),
          )
          .map((fn) => f.interface.getSighash(fn)),
      };
    });

    await LimitOrderDiamond.diamondCut(
      limitOrderFacetCuts,
      ethers.constants.AddressZero,
      '0x',
    );

    limitOrderInstance = ILimitOrder__factory.connect(
      LimitOrderDiamond.address,
      deployer,
    );
    swapperInstance = ISwapper__factory.connect(
      OptyFiSwapper.address,
      deployer,
    );

    await limitOrderInstance.setVault(opUSDC);

    // await limitOrderInstance.setSwapPath(
    //   AaveERC20Address,
    //   USDC,
    //   ethers.utils.solidityPack(
    //     ['address', 'uint24', 'address', 'uint24', 'address'],
    //     [AaveERC20Address, 3000, WETH, 500, USDC],
    //   ),
    // );

    let tx: ContractTransaction = await deployer.sendTransaction({
      to: optyFiVaultOperatorAddress,
      value: ethers.utils.parseEther('100.0'),
      gasLimit: 10000000,
    });

    await tx.wait();

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [ethers.utils.getAddress(optyFiVaultOperatorAddress)],
    });
    optyFiVaultOperator = await ethers.getSigner(
      ethers.utils.getAddress(optyFiVaultOperatorAddress),
    );

    const claimLibraryFactory = await ethers.getContractFactory(
      'ClaimAndHarvest',
      deployer,
    );
    const strategyLibraryFactory = await ethers.getContractFactory(
      'StrategyManager',
      deployer,
    );

    const claimLibrary = await claimLibraryFactory.deploy();
    const strategyLibrary = await strategyLibraryFactory.deploy();

    const claimAddress = claimLibrary.address;
    const strategyAddress = strategyLibrary.address;

    const vaultFactory = await ethers.getContractFactory('Vault', {
      libraries: {
        ClaimAndHarvest: claimAddress,
        StrategyManager: strategyAddress,
      },
    });

    aaveVault = await vaultFactory.deploy(
      ethers.utils.getAddress(RegistryProxy),
      'Aave Token',
      'AAVE',
      'Aggressive',
      'aggr',
    );

    usdcVault = await vaultFactory.deploy(
      ethers.utils.getAddress(RegistryProxy),
      'USDC Token',
      'USDC',
      'Grow',
      'grow',
    );

    const aaveProxy = AdminUpgradeabilityProxy__factory.connect(
      ethers.utils.getAddress(AaveVaultProxy),
      optyFiVaultOperator,
    );
    const usdcProxy = AdminUpgradeabilityProxy__factory.connect(
      ethers.utils.getAddress(USDCVaultProxy),
      optyFiVaultOperator,
    );

    const proxyAdminAddress = '0xF980ea5758f71F418909688b6448B41ACb5522E9';

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [ethers.utils.getAddress(proxyAdminAddress)],
    });
    const proxyAdmin = await ethers.getSigner(
      ethers.utils.getAddress(proxyAdminAddress),
    );

    await aaveProxy.connect(proxyAdmin).upgradeTo(aaveVault.address);
    await usdcProxy.connect(proxyAdmin).upgradeTo(usdcVault.address);
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot', []);
  });

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId]);
  });

  describeBehaviorOfLimitOrder(
    async () => limitOrderInstance,
    async () => swapperInstance,
    {
      AaveVaultAddress: AaveVaultProxy,
    },
  );
});
