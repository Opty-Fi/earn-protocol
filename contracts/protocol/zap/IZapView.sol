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

    /**
     * @notice get merkle proof on a given vault
     */
    function getMerkleProof(address _vault) external view returns (bytes32[] memory);
}
