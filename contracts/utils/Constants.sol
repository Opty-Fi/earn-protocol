// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

library Constants {
    /** @notice Zero value constant of bytes32 datatype */
    bytes32 public constant ZERO_BYTES32 = 0x0000000000000000000000000000000000000000000000000000000000000000;

    /** @notice Decimals considered upto 10**18 */
    uint256 public constant WEI_DECIMAL = 10**18;

    /** @notice Decimals considered upto 10**18 */
    bytes32 public constant WETH_SYMBOL_HASH = keccak256(abi.encodePacked("WETH"));
}
