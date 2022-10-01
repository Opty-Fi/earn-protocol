import chai from "chai";
import { solidity } from "ethereum-waffle";
import { eEVMNetwork } from "../../../helper-hardhat-config";
import { ethereumVaults, polygonVaults } from "./vaults";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;

describe("Vault rev4 upgrade test", () => {
  before(async function () {
    if (fork == eEVMNetwork.mainnet) {
      for (const ethereumUnderlyingVault of Object.keys(ethereumVaults)) {
        for (const ethereumVault of Object.keys(ethereumVaults[ethereumUnderlyingVault])) {
          console.log(ethereumVault);
        }
      }
    }
    if (fork == eEVMNetwork.polygon) {
      for (const polygonUnderlyingVault of Object.keys(polygonVaults)) {
        for (const polygonVault of Object.keys(polygonVaults[polygonUnderlyingVault])) {
          console.log(polygonVault);
        }
      }
    }
  });
});
