import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import hre from 'hardhat';
import { Order, OrderParams } from '../../utils/types';
import { IERC20, ILimitOrder } from '../../typechain-types';
import { BigNumber } from 'ethers';
import { expect } from 'chai';
import { convertOrderParamsToOrder } from '../../utils/converters';

export function describeBehaviorOfLimitOrderActions(
  deploy: () => Promise<ILimitOrder>,
  skips?: string[],
) {
  const ethers = hre.ethers;
  let owner: SignerWithAddress;
  let maker: SignerWithAddress;
  let optyFiVaultOperator: SignerWithAddress;
  let AaveWhale: SignerWithAddress;
  let AaveERC20: IERC20;

  let instance: ILimitOrder;
  const AaveVaultProxy = '0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19';
  const optyFiVaultOperatorAddress =
    '0x6bd60f089B6E8BA75c409a54CDea34AA511277f6';
  const AaveERC20Address = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9';
  const AaveWhaleAddress = '0x80845058350b8c3df5c3015d8a717d64b3bf9267';

  const endTimeNum = 1657190461 + 120; //unix timestamp of block 15095000 + 120s
  const endTime = BigNumber.from(endTimeNum.toString());
  const newEndTime = endTime.add(BigNumber.from('120'));

  const priceTarget = BigNumber.from('100'); //always high enough to execute order for testing
  const newPriceTarget = priceTarget.add(BigNumber.from('10'));

  const orderParams: OrderParams = {
    priceTarget: priceTarget,
    liquidationShare: ethers.utils.parseEther('0.1'),
    endTime: endTime,
    upperBound: ethers.utils.parseEther('0.05'),
    lowerBound: ethers.utils.parseEther('0.05'),
    vault: AaveVaultProxy,
    depositUSDC: false,
  };

  const failedOrderParams: OrderParams = {
    priceTarget: priceTarget,
    liquidationShare: ethers.utils.parseEther('0.1'),
    endTime: endTime.sub(BigNumber.from('1000')),
    upperBound: ethers.utils.parseEther('0.05'),
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
  });

  beforeEach(async () => {
    instance = await deploy();
  });
  describe(':LimitOrderActions', () => {});
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

  describe('#execute(struct(Order),struct(SwapData)', () => {
    it('liquidates amount of maker shares specified', async () => {
      const AaveVaultInstance = await ethers.getContractAt(
        'IVault',
        AaveVaultProxy,
      );
      const AaveERC20 = await ethers.getContractAt('IERC20', AaveERC20Address);

      await AaveERC20.connect(AaveWhale).transfer(
        maker.address,
        BigNumber.from('100000'),
      );

      //replaced only 06 with 02 to remove the whitelisted state
      const newVaultConfig =
        '0x0002026bd60f089B6E8BA75c409a54CDea34AA511277f600320000000000000000';

      const tx = maker.sendTransaction({
        to: optyFiVaultOperatorAddress,
        value: ethers.utils.parseEther('1.0'),
        gasLimit: 10000000,
      });
      await (await tx).wait();

      await AaveVaultInstance.connect(
        optyFiVaultOperator,
      ).setVaultConfiguration(BigNumber.from(newVaultConfig));

      console.log('right after config set');
      await AaveERC20.connect(maker).approve(
        AaveVaultInstance.address,
        BigNumber.from('10000'),
      );
      await AaveVaultInstance.connect(maker).userDepositVault(
        BigNumber.from('200'),
        [ethers.constants.HashZero],
        [ethers.constants.HashZero],
      );
      //
      //user deposits in AaveVault
      // //maker creates order
      // await instance.connect(maker).createOrder(
      // orderParams
      // );
      // const underlyingToken = await AaveVaultInstance.underlyingToken();
      // const opAaveToken = await ethers.getContractAt('IERC20', AaveVaultInstance);
      // await opAaveToken.connect(maker).approve()
    });

    it('sends opUSDC shares to maker', async () => {});

    it('sends USDC to user if vault does not permit deposits', async () => {});
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

      const order = convertOrderParamsToOrder(modifyOrderParams, maker.address);

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
}
