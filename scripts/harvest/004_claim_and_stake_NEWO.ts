import { formatUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { ERC20, INewoStaking, Registry, Vault } from "../../typechain";

async function main() {
  const newoLPStaking = ethers.utils.getAddress("0xdb36b23964FAB32dCa717c99D6AEFC9FB5748f3a");
  const NEWO = ethers.utils.getAddress("0x98585dFc8d9e7D48F0b1aE47ce33332CF4237D96");
  const opNEWOaggrProxyAddress = ethers.utils.getAddress("0xF10aF2cf774B40bd4411fDF91d7C22003B46a130");
  const registryProxyAddress = ethers.utils.getAddress("0x99fa011e33a8c6196869dec7bc407e896ba67fe3");
  const registryInstance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const governanceSigner = await ethers.getSigner(await registryInstance.governance());
  const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, opNEWOaggrProxyAddress);
  const newoLPStakingInstance = <INewoStaking>await ethers.getContractAt("INewoStaking", newoLPStaking);
  const newoInstance = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, NEWO);

  const abi = [
    "function getReward()",
    "function vaultDepositAllToStrategy()",
    "function adminCall(bytes[] memory codes)",
  ];
  const iface = new ethers.utils.Interface(abi);
  const codes = [];

  // claim NEWO
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [newoLPStakingInstance.address, iface.encodeFunctionData("getReward()", [])],
    ),
  );

  // vault deposit all to strategy
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [vaultInstance.address, iface.encodeFunctionData("vaultDepositAllToStrategy", [])],
    ),
  );
  const NEWOBalanceBefore = await newoInstance.balanceOf(vaultInstance.address);
  // const ppsBefore = await vaultInstance.getPricePerFullShare({ blockTag: 14882825 });
  console.log("NEWO balance before ", NEWOBalanceBefore.toString());
  // console.log("PPS @14882825 ", formatUnits(ppsBefore));
  // await network.provider.request({
  //   method: "hardhat_impersonateAccount",
  //   params: [governanceSigner.address],
  // });
  const tx = await vaultInstance.connect(governanceSigner).adminCall(codes);
  //, {
  //  from: governanceSigner.address,
  // });
  const r = await tx.wait(1);
  console.log(r);
  const NEWOBalanceAfter = await newoInstance.balanceOf(vaultInstance.address);
  console.log("NEWO balance after ", NEWOBalanceAfter.toString());
  const bn = await ethers.provider.getBlockNumber();
  const ppsAfter = await vaultInstance.getPricePerFullShare({ blockTag: bn });
  console.log(`PPS after @${bn}`, formatUnits(ppsAfter));
}

main().then(console.log).catch(console.error);
