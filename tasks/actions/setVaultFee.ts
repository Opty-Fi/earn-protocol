import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { task, types } from 'hardhat/config';
//@ts-ignore
import { ILimitOrder } from '../../typechain-types';

task('setVaultFee', 'sets the liquidation fee of an opVault')
  .addParam(
    'limitorderdiamond',
    'the address of the LimitOrderDiamond',
    '',
    types.string,
  )
  .addParam('vault', 'the address of the opVault', '', types.string)
  .addParam('fee', 'the liquidation fee as a string', '', types.string)
  .setAction(async ({ limitorderdiamond, vault, fee }, hre) => {
    const ethers = hre.ethers;

    if (limitorderdiamond == '') {
      throw new Error('limit order diamond address required');
    }

    if (vault == '') {
      throw new Error('vault address required');
    }

    if (fee <= 0 || fee >= ethers.utils.parseEther('1')) {
      throw new Error('fee out of bounds');
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

    console.log(`Setting the liquidation fee of ${vault} to ${fee} ETH...`);

    try {
      let tx = await settings
        .connect(owner)
        ['setVaultLiquidationFee(uint256,address)'](
          ethers.utils.parseEther(fee),
          ethers.utils.getAddress(vault),
        );

      await tx.wait();
    } catch (err) {
      console.log(`Failed to set the vault fee for ${vault}!`);
      console.log(`Failed with error: ${err}`);
    }

    console.log(`Successfully set the fee for ${vault} to ${fee} ETH!`);
  });
