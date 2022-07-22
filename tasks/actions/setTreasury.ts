import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { task, types } from 'hardhat/config';
//@ts-ignore
import { ILimitOrder } from '../../typechain-types';

task('setTreasury', 'sets the treasury for the LimitOrderDiamond contract')
  .addParam(
    'limitorderdiamond',
    'the address of the LimitOrderDiamond',
    '',
    types.string,
  )
  .addParam('treasury', 'the address of the new treasury', '', types.string)
  .setAction(async ({ limitorderdiamond, treasury }, hre) => {
    const ethers = hre.ethers;
    if (treasury == '') {
      throw new Error('treasury address required');
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
      `Setting the treasury to ${treasury} for contract ${limitorderdiamond}...`,
    );

    try {
      let tx = await settings
        .connect(owner)
        ['setTreasury(address)'](ethers.utils.getAddress(treasury));

      await tx.wait();
    } catch (err) {
      console.log('Failed to set new oracle address!');
      console.log(`Failed with error: ${err}`);
    }

    console.log(`Successfully set the treasury address to ${treasury}`);
  });
