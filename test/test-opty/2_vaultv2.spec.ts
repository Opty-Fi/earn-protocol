import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { Signers } from "../../helpers/utils";
import { InitializableImmutableAdminUpgradeabilityProxy, Registry, VaultV2 } from "../../typechain";
import { opUSDCgrow, opWETHgrow, RegistryProxy } from "../../_deployments/mainnet.json";

chai.use(solidity);

// the following address is used for governance,operator,
// riskoperator and strategy operator
const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const OPWETHGROW_VAULT_PROXY_ADDRESS = opWETHgrow.VaultProxy;
const REGISTRY_PROXY = RegistryProxy;

describe("test VaultV2 with onchain upgrade (opUSDCgrow, opWETHgrow)", () => {
  before(async function () {
    // if fork is Ethereum mainnet is included in VAULT_DEPLOYED_NETWORKS
    // then upgrade existing contract
    // or deploy new upgradeable vault contract
    const vaultV2Artifact: Artifact = await hre.artifacts.readArtifact("VaultV2");
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.deployer = signers[0];
    this.registry = <Registry>await hre.ethers.getContractAt("Registry", REGISTRY_PROXY);
    const operatorAddress = await this.registry.getOperator();
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [operatorAddress],
    });
    this.signers.operator = await hre.ethers.getSigner(operatorAddress);
    this.signers.admin = await hre.ethers.getSigner(operatorAddress);
    // testing already deployed contracts
    // this code block may fail if the block number is made greater than
    // the block at which vaults are upgraded to V2 or fork is other than Ethereum
    // ====================================================
    this.opUSDCgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await hre.ethers.getContractAt("VaultProxy", OPUSDCGROW_VAULT_PROXY_ADDRESS)
    );
    // ====================================================
    this.opWETHgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await hre.ethers.getContractAt("VaultProxy", OPWETHGROW_VAULT_PROXY_ADDRESS)
    );
    // ====================================================
    this.opUSDCgrowV2 = <VaultV2>(
      await hre.waffle.deployContract(this.signers.deployer, vaultV2Artifact, [
        REGISTRY_PROXY,
        "USD Coin",
        "USDC",
        "Growth",
        "grow",
      ])
    );
    await this.opUSDCgrowProxy.connect(this.signers.admin).upgradeTo(this.opUSDCgrowV2.address);
    this.opUSDCgrowV2 = <VaultV2>await hre.ethers.getContractAt("VaultV2", this.opUSDCgrowProxy.address);
    expect(this.opUSDCgrowV2.opTOKEN_REVISION).to.eq("0x3");
    // ====================================================
    this.opWETHgrowV2 = <VaultV2>(
      await hre.waffle.deployContract(this.signers.deployer, vaultV2Artifact, [
        REGISTRY_PROXY,
        "Wrapped Ether",
        "WETH",
        "Growth",
        "grow",
      ])
    );
    await this.opWETHgrowProxy.connect(this.signers.admin).upgradeTo(this.opWETHgrowV2.address);
    expect(this.opUSDCgrowV2.opTOKEN_REVISION).to.eq("0x3");
    // ====================================================
    // this.vaultV2 = <VaultV2>await hre.waffle.deployContract(this.signers.deployer, vaultV2Artifact, [REGISTRY_PROXY,"USD Coin", "USDC", "Growth", "grow"]);
    // const vaultProxyV2Artifact: Artifact = await hre.artifacts.readArtifact("AdminUpgradeabilityProxy");
    // this.vaultProxyV2 = <AdminUpgradeabilityProxy>(
    //   await hre.waffle.deployContract(this.signers.deployer, vaultProxyV2Artifact, [this.vaultV2.address,this.signers.operator.address,""])
    // );
  });
  describe("VaultV2 Configuration", () => {
    before(async function () {
      console.log("fn1");
    });
    it("fn1", async function () {
      console.log("fn1");
    });
    it("fn2", async function () {
      console.log("fn1");
    });
  });

  describe("VaultV2 strategies", () => {
    before(async function () {
      console.log("fn1");
    });
    for (let i = 0; i < 10; i++) {
      it(`strategy${i}`, async function () {
        console.log("fn1");
      });
    }
  });
});
