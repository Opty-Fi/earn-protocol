import { ethers } from "hardhat";
import {
  ERC20,
  ERC20__factory,
  ISushiswapMasterChef,
  ISushiswapMasterChef__factory,
  Registry,
  Registry__factory,
  Vault,
  Vault__factory,
} from "../../typechain";

async function main() {
  const sushiswapMasterchefV1 = ethers.utils.getAddress("0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd");
  const opAAVEinvst = ethers.utils.getAddress("0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19");
  const AAVE_WETH_PID = 37;
  const aaveWethSlp = ethers.utils.getAddress("0xD75EA151a61d06868E31F8988D28DFE5E9df57B4");
  const registryProxyAddress = ethers.utils.getAddress("0x99fa011e33a8c6196869dec7bc407e896ba67fe3");
  const registryInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const sushiswapMasterchefV1Instance = <ISushiswapMasterChef>(
    await ethers.getContractAt(ISushiswapMasterChef__factory.abi, sushiswapMasterchefV1)
  );
  const opAAVEinvstInstance = <Vault>await ethers.getContractAt(Vault__factory.abi, opAAVEinvst);
  const aaveWethSlpInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, aaveWethSlp);
  const stakedAmount = await (await sushiswapMasterchefV1Instance.userInfo(AAVE_WETH_PID, opAAVEinvst)).amount;
  const operatorSigner = await ethers.getSigner(await registryInstance.getOperator());

  const abi = ["function withdraw(uint256 _pid, uint256 _amount)"];

  const iface = new ethers.utils.Interface(abi);
  const codes = [];

  // Unstake AAVE-WETH-SLP
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapMasterchefV1Instance.address,
        iface.encodeFunctionData("withdraw(uint256,uint256)", [AAVE_WETH_PID, stakedAmount]),
      ],
    ),
  );

  const aave_weth_slp_balance_before = await aaveWethSlpInstance.balanceOf(opAAVEinvst);
  console.log("AAVE-WETH-SLP balance before : ", ethers.utils.formatEther(aave_weth_slp_balance_before));
  const tx = await opAAVEinvstInstance.connect(operatorSigner).adminCall(codes);
  await tx.wait(1);
  const aave_weth_slp_balance_after = await aaveWethSlpInstance.balanceOf(opAAVEinvst);
  console.log("AAVE-WETH-SLP balance after : ", ethers.utils.formatEther(aave_weth_slp_balance_after));
}

main().then(console.log).catch(console.error);
