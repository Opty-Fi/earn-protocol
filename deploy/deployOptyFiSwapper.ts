import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployOptyFiSwapper: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
) => {
  const ethers = hre.ethers;
  const [deployer] = await ethers.getSigners();
  const { deploy } = hre.deployments;

  const OptyFiSwapperResult = await deploy('OptyFiSwapper', {
    from: deployer.address,
    contract: 'OptyFiSwapper',
    args: [],
    log: true,
  });

  const SwapViewResult = await deploy('SwapView', {
    from: deployer.address,
    contract: 'SwapView',
    args: [],
    log: true,
  });

  const SwapResult = await deploy('Swap', {
    from: deployer.address,
    contract: 'Swap',
    args: [],
    log: true,
  });

  const OptyFiSwapper = await ethers.getContractAt(
    'OptyFiSwapper',
    OptyFiSwapperResult.address,
  );
  const SwapViewImpl = await ethers.getContractAt(
    'SwapView',
    SwapViewResult.address,
  );
  const SwapImpl = await ethers.getContractAt('Swap', SwapResult.address);

  const swapperSelectors = new Set();
  const swapperFacetCuts = [SwapViewImpl, SwapImpl].map(function (f) {
    return {
      target: f.address,
      action: 0,
      selectors: Object.keys(f.interface.functions)
        .filter((fn) => !swapperSelectors.has(fn) && swapperSelectors.add(fn))
        .map((fn) => f.interface.getSighash(fn)),
    };
  });

  console.log('\nPerforming diamond cut...');

  try {
    let tx = await OptyFiSwapper.diamondCut(
      swapperFacetCuts,
      ethers.constants.AddressZero,
      '0x',
    );

    await tx.wait();

    console.log('\nDiamondcut successful!\n\n');
  } catch (err) {
    console.log('Failed to cuts facets into diamond...');
    console.log(`Failed with error: ${err}\n\n`);
  }
};

export default deployOptyFiSwapper;
deployOptyFiSwapper.id = 'OptyFiSwapper';
deployOptyFiSwapper.tags = ['OptyFiSwapper'];
