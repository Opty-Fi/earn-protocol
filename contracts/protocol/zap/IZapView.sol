//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import { ISwapper } from "../optyfi-swapper/contracts/swap/ISwapper.sol";

/**
 * @title ZapperView interface
 * @author OptyFi
 */
interface IZapView {
    /**
     * @notice get swapper address
     */
    function getSwapper() external view returns (ISwapper);
}
