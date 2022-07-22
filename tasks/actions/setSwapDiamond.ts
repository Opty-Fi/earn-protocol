import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { task, types } from 'hardhat/config';
//@ts-ignore
import { ILimitOrder } from '../../typechain-types';

task('setSwapDiamond', 'sets the address of the OptyFiSwapper contract')
  .addParam(
    'limitorderdiamond',
    'the address of the limitOrderDiamond',
    '',
    types.string,
  )
  .addParam('swapper', 'the address of the new OptyFiSwapper', '', types.string)
  .setAction(async ({ swapper, limitorderdiamond }, hre) => {
    const ethers = hre.ethers;
    if (swapper == '') {
      throw new Error('swapDiamond address required');
    }

    const instance = await ethers.getContractAt(
      'LimitOrderDiamond',
      ethers.utils.getAddress(limitorderdiamond),
    );

    const owner: SignerWithAddress = await ethers.getSigner(
      await instance.owner(),
    );
    const settings: ILimitOrder = await ethers.getContractAt(
      'ILimitOrder',
      ethers.utils.getAddress(limitorderdiamond),
    );

    console.log(
      `Setting the swapDiamond to ${swapper} for contract ${limitorderdiamond}...`,
    );

    try {
      let tx = await settings
        .connect(owner)
        ['setSwapDiamond(address)'](ethers.utils.getAddress(swapper));

      await tx.wait();
    } catch (err) {
      console.log('Failed to set new swapDiamond address!');
      console.log(`Failed with error: ${err}`);
    }

    console.log(`Successfully set the swapDiamond address to ${swapper}`);
  });
