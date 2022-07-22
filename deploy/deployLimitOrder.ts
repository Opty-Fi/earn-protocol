import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import addresses from '../data/mainnet-addresses.json';

const deployLimitOrder: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const ethers = hre.ethers;
  const [deployer] = await ethers.getSigners();
  const { deploy, get } = hre.deployments;

  const swapDiamond = await get('OptyFiSwapper');
  const oracle = await get('OptyFiOracle');

  const LimitOrderDiamondResult = await deploy('LimitOrderDiamond', {
    from: deployer.address,
    contract: 'LimitOrderDiamond',
    args: [addresses.contracts.treasury, oracle.address, swapDiamond.address],
    log: true,
  });

  const LimitOrderActionsResult = await deploy('LimitOrderActions', {
    from: deployer.address,
    contract: 'LimitOrderActions',
    args: [
      addresses.tokens.USD,
      addresses.tokens.USDC,
      addresses.tokens.opUSDC,
    ],
    log: true,
  });

  const LimitOrderViewResult = await deploy('LimitOrderView', {
    from: deployer.address,
    contract: 'LimitOrderView',
    args: [
      addresses.tokens.USD,
      addresses.tokens.USDC,
      addresses.tokens.opUSDC,
    ],
    log: true,
  });

  const LimitOrderSettingsResult = await deploy('LimitOrderSettings', {
    from: deployer.address,
    contract: 'LimitOrderSettings',
    args: [
      addresses.tokens.USD,
      addresses.tokens.USDC,
      addresses.tokens.opUSDC,
    ],
    log: true,
  });

  const LimitOrderDiamond = await ethers.getContractAt(
    'LimitOrderDiamond',
    LimitOrderDiamondResult.address,
  );
  const LimitOrderActionsImpl = await ethers.getContractAt(
    'LimitOrderActions',
    LimitOrderActionsResult.address,
  );
  const LimitOrderViewImpl = await ethers.getContractAt(
    'LimitOrderView',
    LimitOrderViewResult.address,
  );
  const LimitOrderSettingsImpl = await ethers.getContractAt(
    'LimitOrderSettings',
    LimitOrderSettingsResult.address,
  );

  const limitOrderSelectors = new Set();
  const limitOrderFacetCuts = [
    LimitOrderActionsImpl,
    LimitOrderViewImpl,
    LimitOrderSettingsImpl,
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

  console.log('\nPerforming diamond cut...');

  let tx = await LimitOrderDiamond.diamondCut(
    limitOrderFacetCuts,
    ethers.constants.AddressZero,
    '0x',
  );

  await tx.wait();

  console.log('\nDiamondcut successful!');
};

export default deployLimitOrder;
deployLimitOrder.id = 'LimitOrder';
deployLimitOrder.tags = ['LimitOrder'];
deployLimitOrder.runAtTheEnd = true;
