//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import { SolidStateDiamond } from "@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol";
import { ISwapper } from "../optyfi-swapper/contracts/swap/ISwapper.sol";
import { ZapStorage } from "./ZapStorage.sol";

/**
 * @title Diamond proxy for OptyFiZapper
 * @author OptyFi
 */
contract OptyFiZapper is SolidStateDiamond {
    constructor(address _swapper) {
        ZapStorage.layout().swapper = ISwapper(_swapper);
    }
}
