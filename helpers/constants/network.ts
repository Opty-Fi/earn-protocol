import { CHAINID_NETWORKS } from "../type";
export enum NETWORKS_ID {
  MAINNET = "0x1",
  ROPSTEN = "0x3",
  RINKEBY = "0x4",
  GOERLI = "0x5",
  POLYGON = "0x89",
}
export const NETWORKS: CHAINID_NETWORKS = {
  [NETWORKS_ID.MAINNET]: {
    name: "mainnet",
    network: "ethereum",
  },
  [NETWORKS_ID.ROPSTEN]: {
    name: "ropsten",
    network: "ethereum",
  },
  [NETWORKS_ID.RINKEBY]: {
    name: "rinkeby",
    network: "ethereum",
  },
  [NETWORKS_ID.GOERLI]: {
    name: "gorli",
    network: "ethereum",
  },
  [NETWORKS_ID.POLYGON]: {
    name: "mainnet",
    network: "polygon",
  },
};
