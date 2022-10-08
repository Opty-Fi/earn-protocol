import { NETWORKS_ID } from "../../helpers/constants/network";
export type STRATEGIES = {
  [token: string]: string;
};
export type OPTYSdkConfig = {
  [networkID in NETWORKS_ID]?: {
    strategies?: STRATEGIES;
    protocols?: string[];
  };
};
